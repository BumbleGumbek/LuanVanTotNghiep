const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WishlistSchema = new Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },

    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    }

});

module.exports = mongoose.model('Wishlist', WishlistSchema);