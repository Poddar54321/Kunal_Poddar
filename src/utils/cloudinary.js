import { v2 as cloudinary } from "cloudinary"; // here we are importing v2 from loudinary
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CLOUD_KEY,
  api_secret: process.env.CLOUDINARY_CLOUD_SECRET, // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null; // file hamara file path exist nahi karta ha to ham null return kar denge
    // upload the file oncloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // now file has been uploaded succesfully
    console.log("file is uploaded successfully on cloudinary", response.url);
    return response;
  } catch (error) {
    // agar file succeesfully upload nahi huyi ha then we need to catch the error
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
    return null;
  }
};

export { uploadOnCloudinary };
