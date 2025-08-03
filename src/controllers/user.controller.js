import { application, response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponce.js";
import jwt from "jsonwebtoken";
import { AsyncLocalStorage } from "async_hooks";
import { use } from "react";
import { subscribe } from "diagnostics_channel";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  // yah par hame asyncHandler ki jarurat kyuki yah par ham koyi web Request wagarah handle nahi kar rahe hai , here we are only using our internal methods.
  //  to create the tokens we need to pass the userId.
  //  now how will we get the userId ? ->  we can easily access the userId from the user variable in this code
  try {
    // 1. sabse pahle to hame user find karna padega if we want to create token for user.
    const user = await User.findById(userId); // we will use the finOne emthod from the mongoose to fetch the user using userId & addditionally we can again notice a thing that yaha par hamne "User" ka se kar kyuki here we are using the finOne method from mongoose.
    //  2. As we got the user , we will create the tokens
    const refreshToken = user.generateRefreshToken(); // yaha par hamne "user" use kara hai kyuki yaha we are our self define functions that we ahve created from our side.
    const accessToken = user.generateAccessToken();
    // -> now we have both acces token & refresh token with us
    // ->ACCESS TOKEN to ham  user ko de dete hai but REFRESH TOKEN ko ham hamare Database m bhi save kar k rakhte hai so that hame bar bar user se password na puchhna pade.
    //  Now we have question that Refresh Token ko Database m kaise dal? -> now we can see that in the "user" object we have received all properties including "refreshToken" (user.model m jakar check karo ki user object m kya kya aaya hai)
    user.refreshToken = refreshToken; // yaha par user.refreshToken k andar refreshToken ki value bhej di hai
    // now hamne user k andara refreshToken to bhej diya but abhi user save bhi karwana padega.
    await user.save({ validateBeforeSave: false }); // by default agar ham direct user.save() likh denge to mongoose baki sare required field ko bhi mangega that;s why hamne yaha par "validation: false" bhej diya hai.
    return { accessToken, refreshToken }; // after everything is done then we will return accessToken ad refreshToken.
  } catch {
    throw new ApiError( // as the problem is from our side , so we will use 500 error code
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

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
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "user with  email or username already exist");
  }

  console.log(req.files);

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

//  now access token and refresh token we will create the login :-
const loginUser = asyncHandler(async (req, res) => {
  // STEP 1:- WHAT ARE THE STEPS INCLUDED IN LOGINUSER API :-
  // STEP 2:- req body -> data (req body se data le kar aa jao)
  // STEP 3:- username or email
  // STEP 4:- find the user
  // STEP 5:- password check
  // STEP 6:- generate access & refresh token , and both will sent to the user ("user.model.js" file m access token and refesh token dono hi generate ho gya hai )
  // STEP 7:- send these token to cookies & sent a response of successfully login

  //  Step 1 :- req body -> data (req body se data le kar aa jao)
  const { email, username, password } = req.body;
  // username or email -> we are adding condition for username and email:-

  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }
  const user = await User.findOne({
    // we use "User" not "user" because this "findOne" method is from monggose , we can use "user" when  we are using user defined methods like isPasswordCorrect
    //  "User" is the obejct of mongoose & "user" is that instance od "User" that we received from the database
    $or: [{ username }, { email }], // yaha par hamne or wuth dollar use kara ha so that , we can find the user on the basis of username or email.
  });
  if (!user) {
    throw new ApiError(404, "user not found");
  }
  //  ab agar hamra user exist karta hoga to , we are required cheeck the password , we need to veruify that the password is correct or not.
  //  we can go to user.model.js and check that we have a method name isPasswod correct , we just need to send password typed by user as argument to this function.
  const isPasswordValid = await user.isPasswordCorrect(password); // here we are passing the user types password as argument.
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  //  agar user ka password thik hai to ham access and refresh token banayenge
  //  we have already created a separate funtion to generate access token adn refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  // we will pass user id as argument in e generateAccessAndRefreshToken function

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  ); // we already have a user instance of "User" but we are recrecreating a instance kyuki "user" instance m hamare pass sari fields aa gayi thi including those we don't requre , so here we have filtered all unneccessary fields using .select method.
  // STEP 7:- now we need to send cookies
  const options = {
    // jab ham cookies bhejte ha to hame kuchh options design karne padte hai
    httpOnly: true,
    secure: true, // by default cookie can be easily defined from frontend , but jab ye dono chize tru kar dete to cookie ko sirf server side se hi modify kara ja sakta hai., after this it can't be modified from frontend. , we can only view it from frontend.
  };
  //  now we have to return a response from this method:-
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200, // mtch this with ApiResponse in utils , this is our "statusCode"
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        }, // this is our "data"
        "User logged in successfully" // and this is our "message"
      )
    );
});
const logoutOutUser = asyncHandler(async (req, res) => {
  // STEPS INVOLVED IN LOGGING OUT A USER FROM THE APPLICATION:-
  //  1. clear all the cookies.
  //  2. reset ACCESS TOKEN & REFRESH TOKEN
  console.log("logout function");
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },

    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "UNauthorized request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(400, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh token is expired or used");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", newRefreshToken)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body; // here we also take condirmPassword

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword; // this line will trigger "userSchema.pre" hook in "user.model.js"
  await user.save({ validateBeforeSave: false }); // here we are saving the passwrod "userSchema.pre" will only get trigger when we save the password , upar hamne sirf object m set kara ha save nhi kara tha

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetchwed successfuly"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname || email) {
    throw new ApiError(400, "all fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email: email, // dono hi method sahi ha chahe upar wala tarika use karo -> direct jaise "fullname" likeh ha hamne or chahe ye wala tarika "email : email"
      },
    },
    { new: true } // new : true lar par hame new updated details milti hai
  ).select(-"password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path; // sirf ek file leni ha isliye "file" likha ha , agar multiple file leni hoti to "files" likhte.

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  //  Deleting the old avatar :-
  const currentUser = await User.findById(req.user?._id);
  if (!currentUser) {
    throw new ApiError("user not found");
  }

  if (currentUser.avatar) {
    await deleteFromCloudinary(currentUser.avatar);
  }
  // updating the new avatar :-
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar || !avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image file is missing");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath); // yaha par we will get the coverImage object from cloudinary

  if (!coverImage || !coverImage.url) {
    throw new ApiError(400, "Error while uploading the image ");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: coverImage.url } },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscriberToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
              then: true,
              else: false,
            },
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscriberToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        converImage: 1,
        email: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new ApiError(400, "channel does not exist");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});
const getWatchhistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchhistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
                {
                  $addFields: {
                    owner: {
                      $first: "s",
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].Watchhistory,
        "Watch history fetched successfully"
      )
    );
});
export {
  registerUser,
  loginUser,
  generateAccessAndRefreshToken,
  logoutOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchhistory,
};
