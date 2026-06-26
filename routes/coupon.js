const express = require('express');
const router = express.Router();

const Coupon = require('../models/Coupon');

router.all('/*', function (req, res, next) {
    res.app.locals.layout = 'admin';
    next();
});


router.get('/', async function(req, res, next) {
    try {
        const coupons = await Coupon.find({})
            .sort({ createdAt: -1 })
            .lean();
        res.render('admin/coupon/index', {
            title: 'Coupon Management',
            coupons
        });
    } catch (err) {
        next(err);
    }
});

router.get('/create', function(req, res) {
    res.render('admin/coupon/create', {
        title: 'Create Coupon'
    });
});

router.post('/create', async function(req, res, next) {
    try {
        const {
            code,
            discountValue,
            minOrderValue,
            usageLimit,
            expiryDate,
            status
        } = req.body;
        const existingCoupon =
            await Coupon.findOne({
                code: code.toUpperCase()
            });

        if (existingCoupon) {
            req.flash(
                'error_message',
                'Coupon code already exists.'
            );
            return res.redirect(
                '/admin/coupon/create'
            );
        }
        const coupon = new Coupon({
            code,
            discountValue,
            minOrderValue,
            usageLimit,
            expiryDate,
            status: status === 'true'
        });
        await coupon.save();
        req.flash(
            'success_message',
            'Coupon created successfully.'
        );
        res.redirect('/admin/coupon');
    } catch (err) {
        next(err);
    }

});

// EDIT PAGE
router.get('/edit/:id', async function(req, res, next) {
    try {
        const coupon =
            await Coupon.findById(
                req.params.id
            ).lean();

        if (!coupon) {
            req.flash(
                'error_message',
                'Coupon not found.'
            );
            return res.redirect(
                '/admin/coupon'
            );
        }
        res.render(
            'admin/coupon/edit',
            {
                title: 'Edit Coupon',
                coupon
            }
        );
    } catch (err) {
        next(err);
    }

});

router.post('/edit/:id', async function(req, res, next) {
    try {
        const {
            code,
            discountValue,
            minOrderValue,
            usageLimit,
            expiryDate,
            status
        } = req.body;

        await Coupon.findByIdAndUpdate(
            req.params.id,
            {
                code,
                discountValue,
                minOrderValue,
                usageLimit,
                expiryDate,
                status: status === 'true'
            }
        );
        req.flash(
            'success_message',
            'Coupon updated successfully.'
        );
        res.redirect('/admin/coupon');
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', async function(req, res, next) {
    try {
        await Coupon.findByIdAndDelete(
            req.params.id
        );
        req.flash(
            'success_message',
            'Coupon deleted successfully.'
        );
        res.redirect('/admin/coupon');
    } catch (err) {
        next(err);
    }
});

module.exports = router;