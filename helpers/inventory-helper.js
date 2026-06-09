const Product = require("../models/Product");

async function rollbackInventory(items) {
    for (const item of items) {
        await Product.findOneAndUpdate(
            {
                _id: item.id,
                "variants.size": item.size
            },
            {
                $inc: {
                    "variants.$.quantity": item.qty,
                    sold: -item.qty
                }
            }
        );
    }
}

async function deductInventory(checkoutItems) {

    const deductedItems = [];

    for (const item of checkoutItems) {

        const updatedProduct =
            await Product.findOneAndUpdate(
                {
                    _id: item.product_id,
                    "variants.size": item.size,
                    "variants.quantity": { $gte: item.quantity }
                },
                {
                    $inc: {
                        "variants.$.quantity": -item.quantity,
                        sold: item.quantity
                    }
                },
                { new: true }
            );

        if (!updatedProduct) {

            await rollbackInventory(deductedItems);

            return {
                success: false,
                item
            };
        }

        deductedItems.push({
            id: item.product_id,
            size: item.size,
            qty: item.quantity
        });
    }

    return {
        success: true
    };
}

module.exports = {
    deductInventory,
    rollbackInventory
};