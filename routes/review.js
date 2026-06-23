const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const User = require('../models/User');

router.all('/*', function (req, res, next) {
    res.app.locals.layout = 'admin';
    next();
});

router.get('/', async function(req, res, next) {
    try {
        const reviews = await Review.find({})
            .populate('user')
            .populate('product')
            .sort({ createdAt: -1 })
            .lean();

        const totalReviews = reviews.length;
        
        // Calculate statistics for ratings 1-5
        const stats = {
            5: 0,
            4: 0,
            3: 0,
            2: 0,
            1: 0
        };

        reviews.forEach(r => {
            if (r.rating >= 1 && r.rating <= 5) {
                stats[r.rating]++;
            }
        });

        // Create an array of stats with percentages for rendering in Handlebars
        const ratingStats = [
            { rating: 5, count: stats[5], percentage: totalReviews > 0 ? Math.round((stats[5] / totalReviews) * 100) : 0 },
            { rating: 4, count: stats[4], percentage: totalReviews > 0 ? Math.round((stats[4] / totalReviews) * 100) : 0 },
            { rating: 3, count: stats[3], percentage: totalReviews > 0 ? Math.round((stats[3] / totalReviews) * 100) : 0 },
            { rating: 2, count: stats[2], percentage: totalReviews > 0 ? Math.round((stats[2] / totalReviews) * 100) : 0 },
            { rating: 1, count: stats[1], percentage: totalReviews > 0 ? Math.round((stats[1] / totalReviews) * 100) : 0 }
        ];

        res.render('admin/review/index', {
            title: 'Review Management',
            reviews,
            totalReviews,
            ratingStats,
            success_message: req.flash('success_message'),
            error_message: req.flash('error_message')
        });
    } catch (err) {
        next(err);
    }
});

router.delete('/:id', async function(req, res, next) {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            req.flash('error_message', 'Review not found.');
            return res.redirect('/admin/review');
        }

        await Review.deleteOne({ _id: req.params.id });

        req.flash('success_message', 'Review deleted successfully.');
        res.redirect('/admin/review');
    } catch (err) {
        next(err);
    }
});

module.exports = router;
