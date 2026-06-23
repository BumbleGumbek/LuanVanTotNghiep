const express = require('express');
const router = express.Router();
const ImportRequest = require('../models/ImportRequest');

router.all('/*', function (req, res, next) {
    res.app.locals.layout = 'admin';
    next();
});

router.get('/', async function(req, res, next) {
    try {
        if (!req.user || !req.user.supplierId) {
            return res.status(403).send('Access Denied: No supplier partner linked to this account.');
        }

        const requests = await ImportRequest.find({
            supplier: req.user.supplierId
        })
        .populate('supplier')
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .lean();

        res.render('supplier/import-request/index', {
            title: 'My Import Requests',
            requests
        });
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async function(req, res, next) {
    try {
        if (!req.user || !req.user.supplierId) {
            return res.status(403).send('Access Denied: No supplier partner linked to this account.');
        }

        const request = await ImportRequest.findById(req.params.id)
            .populate('supplier')
            .populate('createdBy', 'firstName lastName email')
            .populate('items.product')
            .lean();

        if (!request) {
            req.flash('error_message', 'Import request not found.');
            return res.redirect('/supplier/import-request');
        }

        // Security check: supplier can only view their own requests
        if (request.supplier._id.toString() !== req.user.supplierId.toString()) {
            return res.status(403).send('Access Denied');
        }

        res.render('supplier/import-request/detail', {
            title: `Import Request Details - ${request.requestCode}`,
            request
        });
    } catch (err) {
        next(err);
    }
});

router.post('/deliver/:id', async function(req, res, next) {
    try {
        if (!req.user || !req.user.supplierId) {
            return res.status(403).send('Access Denied');
        }

        const request = await ImportRequest.findById(req.params.id);
        if (!request) {
            req.flash('error_message', 'Import request not found.');
            return res.redirect('/supplier/import-request');
        }

        // Check ownership
        if (request.supplier.toString() !== req.user.supplierId.toString()) {
            return res.status(403).send('Access Denied');
        }

        // Restrict state transition
        if (request.status !== 'Pending') {
            req.flash('error_message', 'Only pending requests can be marked as delivered.');
            return res.redirect(`/supplier/import-request/${req.params.id}`);
        }

        request.status = 'Delivered';
        await request.save();

        req.flash('success_message', 'Request marked as delivered successfully.');
        res.redirect(`/supplier/import-request/${req.params.id}`);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
