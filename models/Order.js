const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderItemSchema = new Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    size: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    //Giá sản phẩm tại thời điểm mua
    price_at_purchase: {
        type: Number,
        required: true
    }
}, {
    _id: false
});

const OrderSchema = new Schema({
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        items: [OrderItemSchema],
        totalPrice: {
            type: Number,
            required: true
        },
        couponUsed: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coupon',
            default: null
        },
        shippingAddress: {

            receiverName: {
                type: String,
                required: true
            },
            receiverPhone: {
                type: String,
                required: true
            },
            detailAddress: {
                type: String,
                required: true
            }
        },

        /*
         * Trạng thái đơn hàng
         */
        status: {
            type: String,
            enum: [
                'PendingPayment',
                'Paid',
                'Confirmed',
                'Processing',
                'Shipping',
                'Delivered',
                'Cancelled'
            ],
            default: 'PendingPayment'
        },
        expiredAt: {
            type: Date,
            default: null
        },
        trackingCode: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    });

// Tạo model Order
module.exports = mongoose.model('Order', OrderSchema);