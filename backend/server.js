const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');

dotenv.config({ path: './.env' });

const app = express();
app.use(cookieParser());

// Allow requests from both http://localhost:3000 and https://medical-deploy.vercel.app/
const allowedOrigins = ['https://medical-deploy.vercel.app/'];

app.use(cors({
    credentials: true,
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
}));

app.use(express.json());

const mongoose = require('mongoose');
mongoose
    .connect(process.env.REACT_APP_Mongolink, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');
        const port = 5000;

        app.use('/', authRoutes);

        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
    });
