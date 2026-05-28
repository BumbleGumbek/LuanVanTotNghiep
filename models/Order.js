const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const OrderSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            snapshot: {
                name: {
                    type: String,
                    required: true
                },
                image: {
                    type: String,
                    required: true
                },
                price: {
                    type: Number,
                    required: true
                }
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            },
            subtotal: {
                type: Number,
                required: true
            }
        }
    ],
    shippingAddress: {
        fullName: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        }
    },
    paymentMethod: {
        type: String,
        enum: ['VNPAY', 'MOMO', 'BANK_TRANSFER'],
        default: 'MOMO'
    },
    paymentStatus: {
        type: String,
        enum: [
            'Pending',
            'Paid',
            'Failed'
        ],
        default: 'Pending'
    },
    transactionId: {
        type: String,
        default: ''
    },
    orderStatus: {
        type: String,
        enum: [
            'Pending_Payment',
            'Confirmed',
            'Shipping',
            'Delivered',
            'Cancelled'
        ],
        default: 'Pending_Payment'
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 15 * 60 * 1000) // Hết hạn sau 15 phút
    },
    note: {
        type: String,
        default: ''
    },
    totalQuantity: {
        type: Number,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true
    }
}, { timestamps: true });
module.exports = mongoose.model('Order', OrderSchema);