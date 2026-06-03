var express = require('express');
var router = express.Router();
const Supplier = require('../models/Supplier');

router.all('/*', function (req, res, next) {
    res.app.locals.layout = 'admin';
    next();
});

router.get('/', async (req, res, next) => {
    try {
        const suppliers = await Supplier.find().sort({ createdAt: -1 }).lean();

        // Trỏ thẳng ra file supplier.hbs nằm trong thư mục views/admin/
        res.render('admin/supplier', {
            title: 'Supplier Management',
            suppliers: suppliers
        });
    } catch (error) {
        console.error("Error Load Supplier List:", error);
        next(error);
    }
});

router.post('/add', async (req, res, next) => {
    try {
        const { name, phone, email, address } = req.body;

        const newSupplier = new Supplier({
            name,
            phone,
            email,
            address,
            status: true
        });

        await newSupplier.save();
        res.redirect('/admin/supplier');
    } catch (error) {
        console.error("Error Add Supplier:", error);
        res.redirect('back');
    }
});

// 3. [GET] /admin/supplier/delete/:id - Xóa Nhà cung cấp
router.get('/delete/:id', async (req, res, next) => {
    try {
        await Supplier.findByIdAndDelete(req.params.id);
        res.redirect('/admin/supplier');
    } catch (error) {
        console.error("Lỗi xóa Supplier:", error);
        res.redirect('back');
    }
});

module.exports = router;