const Cart = require('../models/Cart');
const Product = require('../models/Product');

async function mergeSessionCartToDb(sessionCart, userId) {

    if (!sessionCart || sessionCart.length <= 0) {
        return;
    }

    let dbCart =
        await Cart.findOne({ user_id: userId });

    if (!dbCart) {

        dbCart = new Cart({
            user_id: userId,
            items: []
        });
    }

    for (let sessionItem of sessionCart) {

        let existingItem =
            dbCart.items.find(item =>
                item.product_id.toString() === sessionItem.product_id &&
                item.size == sessionItem.size
            );

        if (existingItem) {

            const product =
                await Product.findById(
                    sessionItem.product_id
                );

            if (product) {

                const variant =
                    product.variants.find(
                        v => v.size == sessionItem.size
                    );

                if (variant) {

                    let maxQty =
                        variant.quantity;

                    existingItem.quantity =
                        (
                            existingItem.quantity +
                            sessionItem.quantity >
                            maxQty
                        )
                            ? maxQty
                            : existingItem.quantity +
                            sessionItem.quantity;
                }
            }

        } else {

            dbCart.items.push({
                product_id: sessionItem.product_id,
                size: sessionItem.size,
                quantity: sessionItem.quantity
            });
        }
    }

    await dbCart.save();
}

module.exports = {
    mergeSessionCartToDb
};