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
            unique: true,       // Không được trùng
            trim: true,
            lowercase: true,   // Tự chuyển thành chữ thường
            minlength: 5
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
            enum: ['customer', 'admin'],
            default: 'customer'
        }
    },
    {
        timestamps: true
    });

module.exports = mongoose.model('user', UserSchema);