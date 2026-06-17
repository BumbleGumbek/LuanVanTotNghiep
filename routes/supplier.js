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
        res.render('admin/supplier/index', {
            title: 'Supplier Management',
            suppliers: suppliers
        });
    } catch (error) {
        console.error("Error Load Supplier List:", error);
        next(error);
    }
});

router.get('/edit/:id', async (req, res, next) => {
    try {
        const supplier = await Supplier.findById(
                req.params.id
            ).lean();
        res.render('admin/supplier/edit', {
                supplier
            }
        );
    } catch (err) {
        next(err);
    }
});

router.get('/create', function(req, res){
    res.render('admin/supplier/create',
        {
            title: 'Add Supplier'
        }
    );
});

router.post('/create', async (req, res, next) => {
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
        res.redirect('/admin/supplier/create');
    } catch (error) {
        console.error("Error Add Supplier:", error);
        res.redirect('back');
    }
});

router.post('/edit/:id', async (req, res, next) => {
    try {
        await Supplier.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
                phone: req.body.phone,
                email: req.body.email,
                address: req.body.address
            }
        );
        req.flash(
            'success_message', 'Supplier updated successfully'
        );
        res.redirect(
            '/admin/supplier'
        );
    } catch (err) {
        next(err);
    }

});

router.get('/delete/:id', async (req, res, next) => {
    try {
        await Supplier.findByIdAndDelete(req.params.id);
        res.redirect('/admin/supplier');
    } catch (error) {
        console.error("Error Delete Supplier:", error);
        res.redirect('back');
    }
});

module.exports = router;