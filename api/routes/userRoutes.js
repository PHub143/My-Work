const express = require('express');
const router = express.Router();
const userAuthController = require('../controllers/userAuthController');
const userController = require('../controllers/userController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// Public/Auth Routes
router.post('/login', userAuthController.loginHandler);
router.post('/register', userAuthController.registerHandler);

// Admin Management Routes
router.get('/', authenticateToken, isAdmin, userController.listUsers);
router.post('/', authenticateToken, isAdmin, userController.createUser);
router.patch('/:id', authenticateToken, isAdmin, userController.updateUser);
router.delete('/:id', authenticateToken, isAdmin, userController.deleteUser);

module.exports = router;
