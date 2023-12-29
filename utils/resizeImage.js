// resize image
const jimp = require("jimp");
const { uploadToCloudinary } = require("./config");
const resizeImage = async (req, data) => {
    const size_thumbnail = {
        w: 5,
        h: 5,
    };
    const size_small = {
        w: 50,
        h: 50,
    };

    //  upload to cloudinary small image
    const path_normal = req.file.path;
    const path_thumbnail =
        req.file.path.split("--")[0] + "_thumbnail_" + req.file.originalname;

    const image_normal = await jimp.read(path_normal);
    await image_normal.resize(5, jimp.AUTO);
    await image_normal.writeAsync(path_thumbnail);

    data.image_thumbnail = await uploadToCloudinary(path_thumbnail);

    const path_small =
        req.file.path.split("--")[0] + "_small_" + req.file.originalname;

    const image_normal2 = await jimp.read(path_normal);
    await image_normal2.resize(50, jimp.AUTO);
    await image_normal2.writeAsync(path_small);

    //////// end

    data.image_small = await uploadToCloudinary(path_small);

    // // remove small image
    // fs.access(path_small, fs.F_OK, async (err, ac) => {
    //     fs.unlink(path_small, (ferr, fc) => {
    //         if (err) {
    //             throw err;
    //         }
    //         console.log("Delete File successfully. ");
    //     });
    // });

    // // remove thumbnail image
    // fs.unlink(path_thumbnail, (err) => {
    //     if (err) {
    //         throw err;
    //     }
    //     console.log("Delete File successfully thumbnail ");
    // });
};

module.exports = { resizeImage };
