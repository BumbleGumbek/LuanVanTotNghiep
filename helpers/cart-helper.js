const Cart = require("../models/Cart");

async function getCartItems(req) {

    let cartItems = [];

    if (req.isAuthenticated()) {

        const dbCart =
            await Cart.findOne({
                user_id: req.user._id
            }).populate("items.product_id");

        if (dbCart && dbCart.items) {

            dbCart.items.forEach(item => {

                const p = item.product_id;

                if (p) {

                    cartItems.push({
                        product_id: p._id.toString(),
                        name: p.name,
                        image: p.image,
                        price: p.price,
                        quantity: item.quantity,
                        size: item.size,
                        total: p.price * item.quantity
                    });
                }
            });
        }

    } else {

        cartItems = req.session.cart || [];
    }

    return cartItems;
}

function calculateCartSummary(cartItems) {

    let totalPrice = 0;
    let totalQty = 0;

    cartItems.forEach(item => {

        totalPrice += item.total;
        totalQty += item.quantity;
    });

    return {
        totalPrice,
        totalQty
    };
}

module.exports = {
    getCartItems,
    calculateCartSummary
};