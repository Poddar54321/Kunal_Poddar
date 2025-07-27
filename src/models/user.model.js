import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// niche we are designing our database , as given in out model diagram :

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true, // if anything is need to be searched in future then it recommended to enablem index as true , we can't use indexing uneccesarily because indexing is an ecpensive task.
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullname: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    avatar: {
      type: String, // cloudnary url
      required: true,
    },
    coverImage: {
      type: String,
    },
    watchhistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "VIdep",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  // kyuki yeh hamara middleware hai isliye hamne "next" ka use kiya hai , and as this is a time taking process , we have used async
  if (this.isModified("password")) {
    // agar ham is condition nahi lagayenge then hamara password data k har ek change me  resave ho jayega and uska ek new hash bana dega
    this.password = bcrypt.hash(this.password, 10);
    next();
  }

  // bcrypt have a hash method that generates a hash of our password  , and it takes two things parameter one is password and another one yeh pucchta ha ki kitne rounds lagane hai , it may be any number 8,10 , 11 any number and sometimes it also setted as default number.
  //  now we have introduces a problem that jab bhi ye data data m kuchh bhi update hoga then password ka naya hash generate ho jayega ,
}); // hame jo bhi code execute karwana h usko isme dal do , jab bhi jamara data save ho rha ho usse just pahle agar hame kucch kam karwana ho to ham use pre hook m likhte hai , for example we want to encrypt our password before it get saved.
//  so to resolve this hamne upar ek "if condition" lagayi hai so that the function will only get executed when there is change in the password

userSchema.methods.isPasswordCorrect = async function name(password) {
  // here we are creating a custom method to check our password
  return await bcrypt.compare(password, this.password); // bcrypt also have a "compare" function to verify that password is correct or not.
  //  the first password  is the password that we have received from user to compare , and the second password is our encrypted hashed password
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullname: this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
