const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const nodemailer = require('nodemailer');


const FormData = require('form-data');

const axios = require('axios');

const maxAge = 3 * 24 * 60 * 60 * 1000;

var otp1 = 1;




const generateToken = (user) => {
    return jwt.sign({ username: user.username }, 'secret_key is blash');
};

const getotp = async (req, res) => {
    res.json({ otp: otp1 });
};

const genotp = async (req, res) => {
    const { userId, email } = req.body;

    // Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    console.log("user id is", userId)

    console.log("email id  is", email)
    console.log("otp  is")
    console.log(otp)
    otp1 = otp
    console.log("pathetic")
    const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            // TODO: replace `user` and `pass` values from <https://forwardemail.net>
            user: process.env.REACT_APP_email,
            pass: process.env.REACT_APP_password,
        },
    });

    console.log("pathetic fool")

    const mailOptions = {
        from: process.env.REACT_APP_email,
        to: userId,
        subject: 'OTP Verification from our medical vqa team',
        text: `Your OTP for verification is: ${otp}`,
    };
    console.log("pathetic")

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
};

const signup = async (req, res) => {
    try {
        const newItem1 = new UserModel({
            username: req.body.uname,
            email: req.body.mail,
            password: req.body.key,
        });
        const result = await newItem1.save();
        console.log('Saved item:', result);
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
};




const login = async (req, res) => {
    console.log('Received login request:', req.query);
    const { identifier, password } = req.query;

    try {
        const user = await UserModel.findOne({
            $or: [
                { username: identifier },
                { email: identifier },
            ],
        });

        if (user) {
            bcrypt.compare(password, user.password, function (err, result) {
                if (result === true) {
                    const token = generateToken(user);


                    res.json({ status: 'success', token, created: true, user: user.username });
                    console.log("login suceessful..")
                } else {
                    console.log("wrong pasword........")
                    res.status(401).json({ error: 'IncorrectPassword', message: 'Incorrect password' });
                }
            });
        } else {
            console.log("wrong user........")
            res.status(401).json({ error: 'UserNotFound', message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
};



const getProfile = (req, res) => {
    // Read the token from the Authorization header
    const authorizationHeader = req.headers.authorization;
    
    if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
        const jwttoken = authorizationHeader.slice(7); // Remove 'Bearer ' from the token
        console.log("Token verification in progress");
        console.log("Token is", jwttoken);

        try {
            const decoded = jwt.verify(jwttoken, 'secret_key is blash');
            const { username } = decoded;
            res.json({ username });
        } catch (err) {
            console.log("Invalid token:", err.message);
            res.sendStatus(401); // Invalid token
        }
    } else {
        console.log("No token provided in the Authorization header");
        res.sendStatus(401); // No token found in the Authorization header
    }
};





const fs = require('fs').promises; // Using fs.promises for asynchronous file operations

// const modeloutput = async (req, res) => {
//     console.log(req.body);

//     const question = req.body.question;
//     const flaskurl = req.body.flaskurl;
//     console.log(flaskurl)
//     const file = req.files.file;
//     console.log(question);
//     console.log(file);
//     const link='http://'+flaskurl+'/predict';
//     console.log(link)
//     try {
//         // Read the file asynchronously as a Buffer
//         const dataBuffer = await fs.readFile(file.path);

//         // Convert the image data to base64
//         const imageData = dataBuffer.toString('base64');

//         // Prepare input data for the POST request
//         const input_data = {
//             question: question,
//             data: imageData,
//             name: file.originalFilename,
//         };

//         // Assuming axios is properly imported in your actual code
//         const response = await axios.post(link, input_data, {
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//         });

//         console.log('Predicted value:', response.data.prediction);

//         // Send the prediction as JSON in the HTTP response
//         res.json(response.data);
//     } catch (error) {
//         console.error('Error:', error.message);

//         // Send a 500 Internal Server Error response with the error message
//         res.status(500).json({ error: error.message });
//     }
// };



const modeloutput = async (req, res) => {
    console.log(req.body);

    const question = req.body.question;
    const file = req.files.file;
    console.log(question);
    console.log(file);

    try {
        // Read the file asynchronously as a Buffer
        const dataBuffer = await fs.readFile(file.path);

        // Convert the image data to base64
        const imageData = dataBuffer.toString('base64');

        // Prepare input data for the POST request
        const input_data = {
            question: question,
            data: imageData,
            name: file.originalFilename,
        };

        // Assuming axios is properly imported in your actual code
        const response = await axios.post('http://127.0.0.1:8000/predict', input_data, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('Predicted value:', response.data.prediction);

        // Send the prediction as JSON in the HTTP response
        res.json(response.data);
    } catch (error) {
        console.error('Error:', error.message);

        // Send a 500 Internal Server Error response with the error message
        res.status(500).json({ error: error.message });
    }
};



module.exports = {
    genotp,
    signup,
    login,
    getProfile,
    getotp,
    modeloutput
};
