const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const CategorySchema = new Schema({

    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true
    },
    image: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    featured: {
        type: Boolean,
        default: false
    },
    status: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('category', CategorySchema);