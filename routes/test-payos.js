const express = require('express');
const router = express.Router();
const payos = require('../config/payos');

router.get('/test-payos', async (req, res) => {
    try {
        console.log(payos);

        res.send('PayOS loaded successfully');
    } catch (err) {
        console.error(err);
        res.send('PayOS failed');
    }
});

module.exports = router;