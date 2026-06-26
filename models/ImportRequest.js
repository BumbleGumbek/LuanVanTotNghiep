const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ImportRequestItemSchema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    size: {
        type: String,
        required: true
    },
    quantityRequested: {
        type: Number,
        required: true,
        min: 1
    },
    quantityReceived: {
        type: Number,
        default: 0
    }
}, { _id: false });

const ImportRequestSchema = new Schema({
    requestCode: {
        type: String,
        required: true,
        unique: true
    },
    supplier: {
        type: Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    items: [ImportRequestItemSchema],
    status: {
        type: String,
        enum: ['Pending', 'Delivered', 'Completed', 'Rejected'],
        default: 'Pending',
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rejectReason: {
        type: String,
        default: ''
    },
    note: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('ImportRequest', ImportRequestSchema);
