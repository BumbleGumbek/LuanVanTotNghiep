var express = require('express');
var router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');

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
        const order =
            await Order.findById(
                req.params.id
            );
        if(!order){
            req.flash(
                'error_message',
                'Order not found'
            );
            return res.redirect(
                '/admin/orders'
            );
        }
        const newStatus = req.body.status;
        const statusFlow = {
            PendingPayment: ['Paid', 'Cancelled'],
            Paid: ['Confirmed'],
            Confirmed: ['Processing'],
            Processing: ['Shipping'],
            Shipping: ['Delivered'],
            Delivered: [],
            Cancelled: []
        };
        const allowedStatuses =
            statusFlow[order.status] || [];
        if(
            !allowedStatuses.includes(
                newStatus
            )
        ){
            req.flash(
                'error_message',
                'Invalid status transition'
            );
            return res.redirect(
                '/admin/orders'
            );
        }
        order.status = newStatus;
        if (newStatus === 'Paid') {
            order.paymentStatus = 'Paid';
            if (!order.paidAt) {
                order.paidAt = new Date();
            }
        }
        if (newStatus === 'Cancelled') {
            order.paymentStatus = 'Failed';
            for (const item of order.items) {
                await Product.findOneAndUpdate(
                    {
                        _id: item.product_id,
                        "variants.size": item.size
                    },
                    {
                        $inc: {
                            "variants.$.quantity": item.quantity,
                            sold: -item.quantity
                        }
                    }
                );
            }
        }
        await order.save();
        req.flash(
            'success_message',
            'Order status updated successfully!'
        );
        res.redirect(
            '/admin/orders'
        );
    } catch (err) {
        console.error(
            "Error updating order status:",
            err
        );
        req.flash(
            'error_message',
            'Unable to update order status'
        );
        res.redirect(
            '/admin/orders'
        );
    }
});


router.get('/invoice/:id', async function (req, res, next) {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user');
        if (!order) {
            return res.status(404).send('Order not found');
        }
        const plainOrder = order.toObject();
        plainOrder.items = plainOrder.items.map(item => ({
            ...item,
            subtotal:
                item.price_at_purchase *
                item.quantity
        }));
        res.render('admin/orders/invoice', {
            order: plainOrder,
            title: 'Invoice'
        });
    } catch (err) {
        console.error("Error loading order invoice:", err);
        res.status(500).send('System error');
    }
});

module.exports = router;

