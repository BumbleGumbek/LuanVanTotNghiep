const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/*
 * Schema dùng để lưu thông tin thương hiệu sản phẩm.
 */
const BrandSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 100
    },

    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 20,
        set: value => {
            if (!value) return value;
            return value.trim().toUpperCase();
        },
        validate: {
            validator: value => /^[A-Z0-9]+$/.test(value),
            message: 'Brand code chỉ được chứa chữ in hoa (A-Z) và số (0-9).'
        }
    },

    description: {
        type: String,
        default: '',
        trim: true,
        maxlength: 500
    },

    /*
     * Quốc gia của thương hiệu (Brand Origin),
     * không phải nơi sản xuất sản phẩm.
     */
    country: {
        type: String,
        default: '',
        trim: true,
        maxlength: 100
    },

    /*
     * Thứ tự hiển thị trong danh sách.
     */
    displayOrder: {
        type: Number,
        default: 0,
        min: 0
    },

    status: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true
});


module.exports = mongoose.model('Brand', BrandSchema);