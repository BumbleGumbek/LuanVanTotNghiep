var express = require('express');
var router = express.Router();
const User = require('../models/User');

router.all('/*', function (req, res, next) {
  res.app.locals.layout = 'admin';
  next();
});

/* GET user listing */
router.get('/', function (req, res, next) {
  User.find({})
      .then(user => {
        const plainUser = user.map(user => user.toObject());
        res.render('admin/user/index', {
          plainUser: plainUser
        });
      });
});

/* GET create page */
router.get('/create', function (req, res, next) {
  res.render('admin/user/create');
});

/* POST create user */
router.post('/create', function (req, res, next) {
  const newUser = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    password: req.body.password,
    status: req.body.status === 'true'

  });

  newUser.save()
      .then(savedUser => {
        res.redirect('/admin/user');
      })
      .catch(function (error) {
        console.log(error);
      });
});

/* GET edit page */
router.get('/edit/:id', function (req, res, next) {
  User.findOne({ _id: req.params.id })
      .then(user => {
        res.render('admin/user/edit', {
          title: 'Edit User',
          user: user.toObject()
        });
      });
});

/* PUT update user */
router.put('/edit/:id', function (req, res, next) {
  User.findOne({ _id: req.params.id })
      .then(user => {
        user.firstName = req.body.firstName;
        user.lastName = req.body.lastName;
        user.email = req.body.email;
        user.password = req.body.password;
        user.status = req.body.status === 'true';
        user.save()
            .then(savedUser => {
              res.redirect('/admin/user');
            });
      });
});

/* DELETE user */
router.delete('/:id', function (req, res, next) {
  User.deleteOne({ _id: req.params.id })
      .then(deletedUser => {
        res.redirect('/admin/user');
      });
});
module.exports = router;
