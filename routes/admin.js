var express = require('express');
var router = express.Router();

function useAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next(); // Proceed if authenticated
    } else {
        res.redirect('/login'); // Redirect to login if authentication fails
    }
}

router.all('/*', function (req,res,next) {
    res.app.locals.layout = 'admin';
    next();
})

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('admin/index', { title: 'Admin' });
});

/* GET profile settings */
router.get('/profile', function(req, res, next) {
    res.render('admin/profile/settings', {
        title: 'Profile Settings',
        user: req.user.toObject()
    });
});
module.exports = router;
