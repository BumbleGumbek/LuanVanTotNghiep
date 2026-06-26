function hasRole(...roles) {
    return function(req, res, next) {
        if (
            req.isAuthenticated() &&
            req.user &&
            roles.includes(req.user.role)
        ) {
            return next();
        }

        res.status(403).send('Access Denied');
    };
}

module.exports = {
    hasRole
};
