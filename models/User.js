const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const UserSchema = new Schema({

        firstName: {
            type: String,
            required: true,
            trim: true
        },

        lastName: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            minlength: 5
        },
        phone: {
            type: String,
            default: ''
        },
        address: {
            type: String,
            default: ''
        },
        password: {
            type: String,
            required: true,
            minlength: 5
        },
        status: {
            type: Boolean,
            default: true
        },
        role: {
            type: String,
            enum: ['customer', 'admin', 'store_manager', 'warehouse', 'supplier'],
            default: 'customer'
        },
        supplierId: {
            type: Schema.Types.ObjectId,
            ref: 'Supplier',
            default: null
        },
        resetPasswordToken: {
            type: String,
            default: null
        },

        resetPasswordExpire: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    });

module.exports = mongoose.model('User', UserSchema);