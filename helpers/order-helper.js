const Order = require("../models/Order");

async function createOrder({
                               userId,
                               receiverName,
                               receiverPhone,
                               detailAddress,
                               checkoutItems,
                               totalPrice,
                               note
                           }) {

    const order = new Order({
        user: userId,

        shippingAddress: {
            receiverName,
            receiverPhone,
            detailAddress
        },

        items: checkoutItems.map(item => ({
            product_id: item.product_id,
            name: item.name,
            image: item.image,
            size: item.size,
            price_at_purchase: item.price,
            quantity: item.quantity
        })),

        totalPrice,

        note: note || '',

        status: 'PendingPayment',

        paymentMethod: 'PayOS',
        paymentStatus: 'Pending'
    });

    await order.save();

    return order;
}
module.exports = { createOrder };