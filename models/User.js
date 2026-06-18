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
            enum: ['customer', 'admin', 'warehouse', 'staff', 'sales_staff'],
            default: 'customer'
        }

    },
    {
        timestamps: true
    });

module.exports = mongoose.model('User', UserSchema);