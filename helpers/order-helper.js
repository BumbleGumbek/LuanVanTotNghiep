const Order = require("../models/Order");

async function createOrder({
                               userId,
                               receiverName,
                               receiverPhone,
                               detailAddress,
                               checkoutItems,
                               totalPrice,
                               couponId = null,
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
        couponUsed: couponId,
        note: note || '',
        status: 'PendingPayment',

        paymentMethod: 'Chuyển khoản',
        paymentStatus: 'Pending',
        expiredAt:
            new Date(
                Date.now() +
                30 * 60 * 1000
            )
    });

    await order.save();
    return order;
}
module.exports = { createOrder };