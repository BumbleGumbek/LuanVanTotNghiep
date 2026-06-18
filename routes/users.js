var express = require('express');
var router = express.Router();
const User = require('../models/User');
const bcryptjs = require('bcryptjs');

router.all('/*', function (req, res, next) {
    res.app.locals.layout = 'admin';
    next();
});

router.get('/', async function (req, res, next) {
    try {
        const users =
            await User.find({
                role: 'customer'
            });
        const plainUser = users.map(user => user.toObject());
        res.render('admin/user/index', {
            plainUser: plainUser
        });
    } catch (err) {
        console.error("Error retrieving user list:", err);
        next(err);
    }
});


router.get('/admins', async function(req, res, next) {
    try {
        const admins = await User.find({
            role: 'admin'
        });
        res.render(
            'admin/user/admin-list',
            {
                plainUser:
                    admins.map(
                        user => user.toObject()
                    )
            }
        );

    } catch (err) {
        next(err);
    }
});

router.get('/warehouse', async function(req, res, next) {
    try {
        const warehouseUsers = await User.find({
            role: 'warehouse'
        });
        res.render('admin/user/warehouse-list', {
            plainUser: warehouseUsers.map(user => user.toObject()),
            title: 'Warehouse List'
        });
    } catch (err) {
        next(err);
    }
});

/* [GET] /admin/user/create - Giao diện tạo mới User */
router.get('/create', async function (req, res, next) {
    try {
        res.render('admin/user/create');
    } catch (err) {
        next(err);
    }
});

/* [POST] /admin/user/create - Xử lý thêm mới User */
router.post('/create', async function (req, res, next) {
    try {
        const salt = await bcryptjs.genSalt(10);
        const hash = await bcryptjs.hash(req.body.password, salt);

        const newUser = new User({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            password: hash,
            role: req.body.role || 'customer',
            status: req.body.status === 'true'
        });
        await newUser.save();
        res.redirect('/users');
    } catch (error) {
        console.error("Error adding new user:", error);
        next(error);
    }
});


router.get('/edit/:id', async function (req, res, next) {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).send('User not found');

        res.render('admin/user/edit', {
            title: 'Edit User',
            user: user.toObject()
        });
    } catch (err) {
        console.error("Error loading user edit information:", err);
        next(err);
    }
});

router.post('/edit/:id', async function (req, res, next) {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).send('User not found');

        user.firstName = req.body.firstName;
        user.lastName = req.body.lastName;
        user.email = req.body.email;
        if (req.body.password) {

            const salt = await bcryptjs.genSalt(10);

            user.password =
                await bcryptjs.hash(
                    req.body.password,
                    salt
                );
        }
        user.role = req.body.role;
        user.status = req.body.status === 'true';

        await user.save();
        res.redirect('/users');
    } catch (err) {
        console.error("Error saving user edit information:", err);
        res.redirect('back');
    }
});

router.get('/delete/:id', async function (req, res, next) {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.redirect('/users');
    } catch (err) {
        console.error("Error deleting user from the system:", err);
        next(err);
    }
});

module.exports = router;