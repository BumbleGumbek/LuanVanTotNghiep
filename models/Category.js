const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CategorySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true, // Tránh trùng tên danh mục
        trim: true
    },
    status: {
        type: Boolean,
        default: true // Bật/tắt hiển thị danh mục ngoài giao diện
    }
}, { timestamps: true });

module.exports = mongoose.model('category', CategorySchema);