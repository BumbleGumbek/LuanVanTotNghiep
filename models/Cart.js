const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CartItemSchema = new Schema({
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        size: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        }
    },
    {
        // Không tạo _id riêng cho từng item trong giỏ hàng
        _id: false
    });

const CartSchema = new Schema({
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
            unique: true
        },
        /*
         * Danh sách sản phẩm trong giỏ hàng
         * Mỗi phần tử là CartItemSchema
         */
        items: [CartItemSchema]
    },
    {
        timestamps: true
    });
module.exports = mongoose.model('Cart', CartSchema);