const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const UserSchema = new Schema({
    firstName: {
        type:String,
        required:true,
    },
    lastName: {
        type:String,
        required:true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 5,
    },
    password: {
        type: String,
        required: true,
        minlength: 5,
    },
    status: {
        type: Boolean,
        default: false,
    },
    role: {
        type: String,
        enum: ['customer', 'admin'],
        default: 'customer'
    }
});
//const user = mongoose.model('user');
//module.exports = user;
module.exports = mongoose.model('user', UserSchema);
