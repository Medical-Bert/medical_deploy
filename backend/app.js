const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const authRoutes = require('./api/routes/authRoutes');
const bodyParser = require('body-parser');



dotenv.config({ path: './.env' });  


const app = express();
app.use(cookieParser());

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());


app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});


app.use(express.json());
app.use(cors());
app.use('/', authRoutes);

const mongoose = require('mongoose');
mongoose.connect(process.env.REACT_APP_Mongolink, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
    });

app.get('*', (req, res, next) => {
    res.status(200).json({
        message: 'bad request'
    })
})

    

module.exports = app;