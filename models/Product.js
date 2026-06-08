const mongoose = require('mongoose');

const Schema = mongoose.Schema;

/*
 * Schema con dùng để lưu thông tin từng size của sản phẩm.
 */
const VariantSchema = new Schema({
    size: {
        type: String,
        required: true // Bắt buộc phải có size
    },
    // Số lượng tồn kho của size tương ứng
    quantity: {
        type: Number,
        required: true, // Bắt buộc nhập số lượng
        min: 0,         // Không cho phép số âm
        default: 0      // Mặc định bằng 0 nếu không nhập
    }
}, {
    _id: false // Không tạo ObjectId riêng cho từng size
});

const ProductSchema = new Schema({
        name: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        image: {
            type: String,
            required: true
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category', // Tham chiếu đến collection category
            required: true
        },
        supplier: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Supplier', // Khớp với tên model Supplier của bạn
            required: true
        },
        /*
         * Danh sách các size của sản phẩm
         * Mỗi phần tử trong mảng là một VariantSchema
         *
         * Ví dụ:
         * variants: [
         *   { size: "6", quantity: 10 },
         *   { size: "7", quantity: 5 },
         *   { size: "8", quantity: 3 }
         * ]
         */
        variants: [VariantSchema],
        //Tổng số lượng sản phẩm đã bán
        sold: {
            type: Number,
            default: 0
        },
        status: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    });
// Tạo Model Product từ ProductSchema
// MongoDB sẽ tạo collection tên products
module.exports = mongoose.model('Product', ProductSchema);