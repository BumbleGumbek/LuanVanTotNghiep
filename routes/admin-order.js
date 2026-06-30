var express = require('express');
var router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const mongoose = require('mongoose');
const { deductInventory } = require('../helpers/inventory-helper');
const { hasRole } = require('../middlewares/authorization');

router.all('/*', function (req, res, next) {
    res.app.locals.layout = 'admin';
    next();
});

router.get('/', hasRole('admin', 'store_manager', 'warehouse'), async function (req, res, next) {
    try {
        const { fromDate, toDate, status, keyword } = req.query;
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const allowedLimits = [10, 20, 50];
        const limit = allowedLimits.includes(Number(req.query.limit))
            ? Number(req.query.limit)
            : 10;
        const filter = {};

        // 1. Date filter validation
        let startDate = null;
        let endDate = null;

        if (fromDate) {
            startDate = new Date(fromDate);
            if (isNaN(startDate.getTime())) {
                startDate = null;
            } else {
                startDate.setHours(0, 0, 0, 0);
            }
        }

        if (toDate) {
            endDate = new Date(toDate);
            if (isNaN(endDate.getTime())) {
                endDate = null;
            } else {
                endDate.setHours(23, 59, 59, 999);
            }
        }

        // Nếu fromDate > toDate thì bỏ filter ngày
        if (startDate && endDate && startDate > endDate) {
            req.flash('error_message', 'From date cannot be greater than To date.');
            return res.redirect('/admin/orders');
        }

        if (startDate) {
            filter.createdAt = {
                ...filter.createdAt,
                $gte: startDate
            };
        }

        if (endDate) {
            filter.createdAt = {
                ...filter.createdAt,
                $lte: endDate
            };
        }

        // 2. Status filter
        if (status && ['PendingPayment', 'Paid', 'Shipping', 'Completed', 'Cancelled'].includes(status)) {
            filter.status = status;
        }

        // 3. Keyword search
        if (keyword) {
            const cleanKeyword = keyword.trim();
            if (cleanKeyword) {
                // Find matching users first to support search by name/email
                const matchingUsers = await User.find({
                    $or: [
                        { firstName: { $regex: cleanKeyword, $options: 'i' } },
                        { lastName: { $regex: cleanKeyword, $options: 'i' } },
                        { email: { $regex: cleanKeyword, $options: 'i' } }
                    ]
                }).select('_id');
                const userIds = matchingUsers.map(u => u._id);

                const orConditions = [
                    { 'shippingAddress.receiverName': { $regex: cleanKeyword, $options: 'i' } },
                    { 'shippingAddress.receiverPhone': { $regex: cleanKeyword, $options: 'i' } }
                ];

                if (userIds.length > 0) {
                    orConditions.push({ user: { $in: userIds } });
                }

                if (mongoose.Types.ObjectId.isValid(cleanKeyword)) {
                    orConditions.push({ _id: cleanKeyword });
                }

                const numVal = Number(cleanKeyword);
                if (!isNaN(numVal)) {
                    orConditions.push({ payosOrderCode: numVal });
                }

                filter.$or = orConditions;
            }
        }
        await Order.updateMany(
            {
                status: 'PendingPayment',
                expiredAt: { $lt: new Date() }
            },
            {
                $set: {
                    status: 'Cancelled',
                    paymentStatus: 'Failed'
                }
            }
        );
        const count = await Order.countDocuments(filter);
        const pages = Math.ceil(count / limit);
        const activePage = Math.min(page, pages > 0 ? pages : 1);
        const skip = (activePage - 1) * limit;

        const orders = await Order.find(filter)
            .populate('user', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // const sortedOrders = orders.map(order => order.toObject()).sort((a, b) => {
        //     const aPaid = a.paymentStatus === 'Paid';
        //     const bPaid = b.paymentStatus === 'Paid';
        //     if (aPaid && !bPaid) return -1;
        //     if (!aPaid && bPaid) return 1;
        //     return 0;
        // });

        const pagesList = [];
        for (let i = 1; i <= pages; i++) {
            pagesList.push({
                number: i,
                isCurrent: i === activePage
            });
        }

        const queryParams = new URLSearchParams({
            ...(fromDate && { fromDate }),
            ...(toDate && { toDate }),
            ...(status && { status }),
            ...(keyword && { keyword })
        }).toString();

        res.render('admin/orders/index', {
            orders: orders.map(order => order.toObject()),
            title: 'Order Management',
            fromDate,
            toDate,
            status,
            keyword,
            currentPage: activePage,
            totalPages: pages,
            totalCount: count,
            hasPrev: activePage > 1,
            hasNext: activePage < pages,
            prevPage: activePage - 1,
            nextPage: activePage + 1,
            pagesList,
            queryParams
        });
    } catch (err) {
        console.error("Error retrieving order list:", err);
        res.status(500).send('System error while retrieving order list');
    }
});


router.post('/update-status/:id', hasRole('admin', 'warehouse'), async function (req, res, next) {
    try {
        const order = await Order.findById(req.params.id);
        if(!order){
            req.flash('error_message', 'Order not found');
            return res.redirect('/admin/orders');
        }
        const newStatus = req.body.status;
        const statusFlow = {
            PendingPayment: ['Paid', 'Cancelled'],
            Paid: ['Shipping', 'Cancelled'],
            Shipping:['Completed', 'Cancelled'],
            Completed: [],
            Cancelled: []
        };
        const allowedStatuses = statusFlow[order.status] || [];
        if(!allowedStatuses.includes(newStatus)){
            req.flash('error_message', 'Invalid status transition');
            return res.redirect('/admin/orders');
        }

        if (newStatus === 'Shipping') {
            const checkoutItems = order.items.map(item => ({
                product_id: item.product_id,
                size: item.size,
                quantity: item.quantity,
                name: item.name
            }));
            const inventoryResult = await deductInventory(checkoutItems);
            if (!inventoryResult.success) {
                req.flash('error_message', `Không đủ hàng trong kho cho sản phẩm: "${inventoryResult.item.name}" (Size ${inventoryResult.item.size})`);
                return res.redirect('/admin/orders');
            }
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
            if (order.status === 'Shipping') {
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


router.get('/invoice/:id', hasRole('admin', 'store_manager', 'warehouse'), async function (req, res, next) {
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

