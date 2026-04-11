const express = require('express');
const router = express.Router();
const userAuthController = require('../controllers/userAuthController');

// Route for user login
router.post('/login', userAuthController.loginHandler);

// Route for user registration (Admin could use this or we can restrict it later)
router.post('/register', userAuthController.registerHandler);

module.exports = router;
