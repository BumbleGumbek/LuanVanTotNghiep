const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcryptjs = require('bcryptjs');
const User = require('../models/User');

module.exports = function () {
    passport.use(
        new LocalStrategy(
            { usernameField: 'email' },
            async function (email, password, done) {
                try {
                    const user = await User.findOne({
                            email: email
                        });
                    if (!user) {
                        return done(
                            null, false, { message: 'users not found' }
                        );
                    }
                    if (!user.status) {
                        return done(
                            null,
                            false,
                            {
                                message: 'Account has been disabled'
                            }
                        );
                    }
                    bcryptjs.compare(
                        password, user.password, (err, matched) => {
                            if (err) {
                                return done(err);
                            }
                            if (matched) {
                                return done(
                                    null, user
                                );
                            }
                            return done(
                                null, false, {
                                    message: 'Wrong email or password'
                                }
                            );
                        }
                    );
                } catch (error) {
                    done(error);
                }
            }
        )
    );
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });
    passport.deserializeUser(
        async (id, done) => {
            try {
                const user = await User.findById(id);
                done(null, user);
            } catch (error) {
                done(error);
            }
        }
    );
};