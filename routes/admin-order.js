var express = require('express');
var router = express.Router();
const Order = require('../models/Order');

// Middleware xác định layout cho admin
router.all('/*', function (req, res, next) {
    res.app.locals.layout = 'admin';
    next();
});

// [GET] /admin/orders - Danh sách đơn hàng
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('user', 'firstName lastName email') // Lấy thông tin khách hàng
            .sort({ createdAt: -1 }); // Đơn hàng mới nhất lên đầu

        res.render('admin/orders/index', {
            orders: orders.map(order => order.toObject()),
            title: 'Quản lý đơn hàng'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Lỗi hệ thống khi lấy danh sách đơn hàng');
    }
});

router.post('/update-status/:id', async (req, res) => {
    try {
        const { orderStatus } = req.body;
        await Order.findByIdAndUpdate(req.params.id, { orderStatus });
        
        req.flash('success_message', `Cập nhật trạng thái đơn hàng thành công!`);
        res.redirect('/admin/orders');
    } catch (err) {
        console.error(err);
        req.flash('error_message', 'Không thể cập nhật trạng thái đơn hàng');
        res.redirect('/admin/orders');
    }
});

router.get('/invoice/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user');
        if (!order) {
            return res.status(404).send('Không tìm thấy đơn hàng');
        }
        res.render('admin/orders/invoice', {
            order: order.toObject(),
            title: 'Hóa đơn'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Lỗi hệ thống');
    }
});

module.exports = router;
