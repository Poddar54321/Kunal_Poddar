import { response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponce.js";
const registerUser = asyncHandler(async (req, res) => {
  // res.status(200).json({ // yaha par success code ko 200 set kara hai
  //   message: "hello people , this is kunal",
  // });

  //// # steps included in resitering a user :-
  // 1.  get user details from frontend
  // 2.  validation laganin padegi , from all the fields  just like frontend backend par bhi validations lagayi jati , adding validations to backend is more important than fronend
  // 3. check is user already exist., so we can check on the behalf of username & email.
  // 4. uske bad ham check karenge ki hamari files ha ya nhi , so we need to check for images and avatar
  // 5. if files are available then we will upload them to cloudinary
  // 6. then wewill create a user object(kyuki we are working on non-relational database and in mongoDB we send data in the form of objects) - create entry in DB.
  // 7. remove password and refresh token field.from frontend response
  // 8. check for user creation
  // 9. if the user is created then we will return response.

  //  1st step is to get user details from frontend :-
  const { fullname, email, username, password } = req.body;
  console.log("email: ", email);
  console.log("passwrod: ", password);

  // now we will perform validations :-
  // if (fullname === "") {
  //   throw new ApiError(400, "full name is required");
  // }
  // ---------------------OR----------------------------
  if (
    [fullname, email, username, password].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "all fields are required");
  }

  // 3. check is user already exist., so we can check on the behalf of username & email.
  const existedUser = User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "user with  email or username already exist");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // upload files on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage.url || "", //agar cover image nahi ha to usko empty bhej do , because coverimage is not required field
    email,
    password,
    username: username.toLowerCase(),
  });
  const createduser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createduser) {
    throw new ApiError(50, "something went wrong while registering a  user");
  }
  return res
    .status(201)
    .json(new ApiResponse(200, createduser, "User registered successfully"));
});

export { registerUser };
