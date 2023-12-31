const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const validator = require("validator");

const Schema = mongoose.Schema;

const userSchema = new Schema(
    {
        name: { type: String, required: true },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        image: { type: String, required: true },
        following: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        date: String,
        status: String,
    },
    { timestamps: true }
);

userSchema.statics.signup = async function (email, password, name, image) {
    if (!email || !password || !name || !image) {
        throw Error(`All fields must be filled `);
    }

    if (!validator.isEmail(email)) {
        throw Error(`email is not valid`);
    }
    if (!validator.isStrongPassword(password)) {
        throw Error(`password not not strong enough `);
    }

    const exists = await this.findOne({ email });
    if (exists) {
        throw Error("email in use");
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = await this.create({
        email,
        password: hash,
        name,
        image,
    });
    return user;
};
userSchema.statics.login = async function (email, password) {
    if (!email || !password) {
        throw Error(`All fields must be filled `);
    }

    const user = await this.findOne({ email });
    if (!user) {
        throw Error("Email does not exsist");
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
        throw Error("Incorrect password");
    }

    return user;
};

module.exports = mongoose.model("User", userSchema);
