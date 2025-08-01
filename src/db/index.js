import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
// here we are have created a separate file to access data

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );

    console.log(
      `\n MongoDB connnected !! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("MongoDB connection error", error);
    process.exit(1); //
  }
};

export default connectDB;
