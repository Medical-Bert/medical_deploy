const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const formData = require('express-form-data');

// Create an instance of express-form-data
const formMiddleware = formData.parse();

// Use the middleware for parsing form data
router.use(formMiddleware);

router.post('/genotp', authController.genotp);
router.post('/signup', authController.signup);
router.get('/login', authController.login);
router.get('/profile', authController.getProfile);
router.get('/getotp', authController.getotp);
router.post('/imgupload', authController.imgupload);

// Add the new route for getans
router.post('/modeloutput', authController.modeloutput);

router.get('*', (req, res, next) => {
    res.status(200).json({
        message: 'bad request'
    })
})




module.exports = router;
