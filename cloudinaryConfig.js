// cloudinary config
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
module.exports = { uploadToCloudinary };
