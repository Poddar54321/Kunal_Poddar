import { response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req, res) => {
  res.status(200).json({ // yaha par success code ko 200 set kara hai
    message: "hello people , this is kunal",
  });
});

export { registerUser };
