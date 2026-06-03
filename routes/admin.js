var express = require('express');
var router = express.Router();

function useAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect('/login');
    }
}

router.all('/*', function (req, res, next) {
    res.app.locals.layout = 'admin';
    next();
});

/* GET home page. */
router.get('/', async function(req, res, next) {
    try {
        res.render('admin/index', { title: 'Admin' });
    } catch (err) {
        next(err);
    }
});

/* GET profile settings */
router.get('/profile', async function(req, res, next) {
    try {
        res.render('admin/profile/settings', {
            title: 'Profile Settings',
            user: req.user.toObject()
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;