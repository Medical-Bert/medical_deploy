const allowedOrigins = 'https://medicalbert.onrender.com';

const corsOptions = {
    origin: (origin, callback) => {
        console.log('Incoming Origin:', origin); // Log the incoming origin for debugging
        if (allowedOrigins === origin || !origin) {
            callback(null, true);
        } else {
            callback(new Error("You are banned by CORS"));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

module.exports = corsOptions;
