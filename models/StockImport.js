const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StockImportSchema = new Schema({
    importCode: {
        type: String,
        required: true,
        unique: true, // Sinh tự động: NH-YYYYMMDD-XXXX
        trim: true
    },
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    size: {
        type: String,
        required: true,
        trim: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    note: {
        type: String,
        trim: true
    },
    importedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    importDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('StockImport', StockImportSchema);
