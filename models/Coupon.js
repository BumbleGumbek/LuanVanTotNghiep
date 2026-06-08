const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CouponSchema = new Schema({

         //Ví dụ: SALE50K, WELCOME100K
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true
        },
        discountValue: {
            type: Number,
            required: true,
            min: 0
        },
        minOrderValue: {
            type: Number,
            required: true,
            default: 0
        },
        usageLimit: {
            type: Number,
            required: true,
            min: 1
        },
        usedBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        ],
        expiryDate: {
            type: Date,
            required: true
        },
        status: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    });

module.exports = mongoose.model('Coupon', CouponSchema);