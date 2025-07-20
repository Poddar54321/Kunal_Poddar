// require('dotenv').config({path: './env'})
import dotenv from "dotenv";
// import { app } from "./app.js";
import connectDB from "./db/index.js";

dotenv
  .config
  // { path: "./env",}   // adding path is not important because dotenv.config() , automatically by defalut .env file ko fetch kar leta , but the condition is that the file should only be named as ".env" in the folder not by any other name in the folder.
  ();


connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`server is runnign on port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MOngoDb connection failed", err);
  });

// {THIS IS OUR FITST APPROACH TO ACCESS DATABASE}
// import express from "express";
// const app = express();

// // function connectDB() {}

// // connectDB();

// (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     app.on("error", (error) => {
//       console.log("ERROR", error);
//       throw error;
//     });
//     app.listen(process.env.PORT, () => {
//       console.log(`App is liostening on port ${process.env.PORT}`);
//     });
//   } catch {
//     console.error("error", error);
//     throw error;
//   }
// })(); // semicolor is used ki ho sakta h last line m semicolon n ana laaga ho , it is only a safer side approach , it is not mandatory to use semicolon
