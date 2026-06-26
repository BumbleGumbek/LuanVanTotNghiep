const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify(function(error, success) {
    if (error) {
        console.log('MAIL ERROR:', error);
    } else {
        console.log('MAIL SERVER READY');
    }
});

async function sendOrderPaidEmail(order, user) {
    console.log('SENDING EMAIL TO:', user.email);
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const trackUrl = `${appUrl}/order-track/${order._id}`;
    
    // Format items list
    const itemsHtml = order.items.map(item => {
        const itemImage = item.image.startsWith('http') 
            ? item.image 
            : `${appUrl}${item.image.startsWith('/') ? '' : '/'}${item.image}`;
        return `
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee;">
                    <img src="${itemImage}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; display: inline-block; vertical-align: middle; margin-right: 10px;">
                    <div style="display: inline-block; vertical-align: middle;">
                        <span style="font-weight: 600; font-size: 14px; color: #333333; display: block;">${item.name}</span>
                        <span style="font-size: 12px; color: #888888;">Size: ${item.size} | Qty: ${item.quantity}</span>
                    </div>
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eeeeee; text-align: right; font-weight: 600; color: #333333; font-size: 14px;">
                    ${(item.price_at_purchase * item.quantity).toLocaleString()} VND
                </td>
            </tr>
        `;
    }).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Successful - Luna Jewelry</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f7f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f7f9fa;">
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
                        <!-- Header -->
                        <tr>
                            <td align="center" style="padding: 30px 20px; background-color: #111111; color: #ffffff;">
                                <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 2px;">LUNA JEWELRY</h1>
                                <p style="margin: 5px 0 0 0; font-size: 12px; color: #b59b68; text-transform: uppercase; letter-spacing: 1px;">Exquisite Elegance</p>
                            </td>
                        </tr>
                        
                        <!-- Status Banner -->
                        <tr>
                            <td align="center" style="padding: 30px 20px 20px 20px; border-bottom: 1px solid #eeeeee;">
                                <div style="width: 48px; height: 48px; background-color: #d4edda; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                                    <span style="color: #28a745; font-size: 24px; font-weight: bold; line-height: 48px;">✓</span>
                                </div>
                                <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: #28a745;">Payment Successful!</h2>
                                <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.5;">Thank you for your purchase. Your payment has been processed successfully.</p>
                            </td>
                        </tr>
                        
                        <!-- Order Summary -->
                        <tr>
                            <td style="padding: 20px;">
                                <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 700; color: #111111; text-transform: uppercase; border-bottom: 2px solid #111111; padding-bottom: 5px;">Order Summary</h3>
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; line-height: 1.6; color: #555555;">
                                    <tr>
                                        <td style="padding: 5px 0; font-weight: 600; color: #333333;">Order ID:</td>
                                        <td style="padding: 5px 0; text-align: right; font-family: monospace; font-size: 13px;">${order._id}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 0; font-weight: 600; color: #333333;">Payment Status:</td>
                                        <td style="padding: 5px 0; text-align: right; color: #28a745; font-weight: bold;">${order.paymentStatus}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 0; font-weight: 600; color: #333333;">Payment Method:</td>
                                        <td style="padding: 5px 0; text-align: right;">${order.paymentMethod || 'Bank Transfer'}</td>
                                    </tr>
                                    <tr style="font-size: 16px; font-weight: 700; color: #d10024;">
                                        <td style="padding: 10px 0 5px 0; border-top: 1px dashed #dddddd;">Total Amount:</td>
                                        <td style="padding: 10px 0 5px 0; text-align: right; border-top: 1px dashed #dddddd;">${order.totalPrice.toLocaleString()} VND</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Product List -->
                        <tr>
                            <td style="padding: 0 20px 20px 20px;">
                                <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 700; color: #111111; text-transform: uppercase; border-bottom: 2px solid #111111; padding-bottom: 5px;">Product List</h3>
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    ${itemsHtml}
                                </table>
                            </td>
                        </tr>
                        
                        <!-- CTA Button -->
                        <tr>
                            <td align="center" style="padding: 20px 20px 40px 20px;">
                                <table border="0" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center" style="background-color: #28a745; border-radius: 6px;">
                                            <a href="${trackUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 6px; letter-spacing: 0.5px;">TRACK ORDER</a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="margin: 15px 0 0 0; font-size: 12px; color: #888888;">If the button above does not work, copy and paste this link into your browser: <br><a href="${trackUrl}" style="color: #007bff; text-decoration: underline;">${trackUrl}</a></p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td align="center" style="padding: 20px; background-color: #f7f9fa; border-top: 1px solid #eeeeee; font-size: 12px; color: #888888; line-height: 1.5;">
                                <p style="margin: 0 0 5px 0;">This email is sent automatically, please do not reply to this email.</p>
                                <p style="margin: 0;">&copy; 2026 Luna Jewelry. All rights reserved.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Payment Successful',
        html
    });
}

module.exports = {
    sendOrderPaidEmail
};