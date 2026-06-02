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
        type: Number,
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
            ref: 'user',
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

            // Chỉ được phép nằm trong danh sách này
            enum: [
                'Chờ thanh toán',
                'Đã thanh toán',
                'Đang xử lý',
                'Đang giao hàng',
                'Đã hủy',
                'Hoàn thành'
            ],
            default: 'Chờ thanh toán'
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