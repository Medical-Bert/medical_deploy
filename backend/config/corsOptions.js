const allowedOrigins = require('./allowedOrigins')

const corsOptions = {
    origin:(origin,callback) =>{
        if(allowedOrigins.indexof(origin)!==-1 || !origin){
            callback(null,true)
        }
        else{
            callback(new Error("you are banned by cors"))
        }
    },
    credentials:true,
    optionsSuccessStatus: 200
}

module.exports = corsOptions;