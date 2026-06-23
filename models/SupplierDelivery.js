const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SupplierDeliveryItemSchema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    size: {
        type: String,
        required: true
    },
    quantityDelivered: {
        type: Number,
        required: true,
        min: 1
    }
}, { _id: false });

const SupplierDeliverySchema = new Schema({
    deliveryCode: {
        type: String,
        required: true,
        unique: true
    },
    importRequest: {
        type: Schema.Types.ObjectId,
        ref: 'ImportRequest',
        required: true
    },
    items: [SupplierDeliveryItemSchema],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    note: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('SupplierDelivery', SupplierDeliverySchema);
