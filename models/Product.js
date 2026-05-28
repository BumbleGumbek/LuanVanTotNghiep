const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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
        ref: 'category',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 0
    },
    sold: {
        type: Number,
        default: 0
    },
    status: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);