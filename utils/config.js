// cloudinary config
const multer = require("multer");

const cloudinary = require("cloudinary").v2;
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});

// upload to cloudinary
const uploadToCloudinary = async (path) => {
    const result = await cloudinary.uploader.upload(path, (err, result) => {
        if (err) {
            console.log(err);
        }
    });
    return result.secure_url;
};

//  multer
let storage;
if (process.env.NODE_ENV === 'development') {
    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, "./public/temp/");
        },
        filename: function (req, file, cb) {
            const string = new Date()
                .toISOString()
                .split(".")
                .join("")
                .replace(/:/gi, "-");

            cb(null, string + "--" + file.originalname);
        },
    });
} else {
    storage = multer.diskStorage({
        // destination: function (req, file, cb) {
        //     cb(null, "./public/temp/")
        // },
        filename: function (req, file, cb) {
            const string = new Date()
                .toISOString()
                .split(".")
                .join("")
                .replace(/:/gi, "-");

            cb(null, string + "--" + file.originalname);
        },
    });
}

const upload = multer({ storage: storage });

module.exports = { uploadToCloudinary, upload };
