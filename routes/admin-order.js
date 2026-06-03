var express = require('express');
var router = express.Router();
const Order = require('../models/Order');


router.all('/*', function (req, res, next) {
    res.app.locals.layout = 'admin';
    next();
});


router.get('/', async function (req, res, next) {
    try {
        const orders = await Order.find({})
            .populate('user', 'firstName lastName email')
            .sort({ createdAt: -1 });

        res.render('admin/orders/index', {
            orders: orders.map(order => order.toObject()),
            title: 'Order Management'
        });
    } catch (err) {
        console.error("Error retrieving order list:", err);
        res.status(500).send('System error while retrieving order list');
    }
});


router.post('/update-status/:id', async function (req, res, next) {
    try {
        const { orderStatus } = req.body;

        await Order.findByIdAndUpdate(req.params.id, { status: orderStatus, orderStatus: orderStatus });

        req.flash('success_message', `Order status updated successfully!`);
        res.redirect('/admin/orders');
    } catch (err) {
        console.error("Error updating order status:", err);
        req.flash('error_message', 'Unable to update order status');
        res.redirect('/admin/orders');
    }
});


router.get('/invoice/:id', async function (req, res, next) {
    try {
        const order = await Order.findById(req.params.id).populate('user');
        if (!order) {
            return res.status(404).send('Order not found');
        }
        res.render('admin/orders/invoice', {
            order: order.toObject(),
            title: 'Invoice'
        });
    } catch (err) {
        console.error("Error loading order invoice:", err);
        res.status(500).send('System error');
    }
});

module.exports = router;

