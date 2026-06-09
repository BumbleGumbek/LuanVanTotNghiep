const Order = require("../models/Order");

async function createOrder({
                               userId,
                               firstName,
                               lastName,
                               phone,
                               address,
                               city,
                               checkoutItems,
                               totalPrice,
                               note
                           }) {

    const order = new Order({
        user: userId,

        shippingAddress: {
            receiverName: `${firstName} ${lastName || ''}`.trim(),
            receiverPhone: phone,
            detailAddress: `${address}, ${city}`
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

        status: 'Pending'
    });

    await order.save();

    return order;
}

module.exports = {
    createOrder
};