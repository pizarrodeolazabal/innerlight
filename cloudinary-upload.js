import { v2 as cloudinary } from 'cloudinary'
import dotenv from 'dotenv'
dotenv.config()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

export const uploadImage = async (imageUrl, archetypeName) => {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: "innerlight",
      public_id: `${archetypeName}-${Date.now()}`,
      overwrite: false
    })

    return {
      url: result.secure_url,
      publicId: result.public_id
    }
  } catch (error) {
    console.error("Cloudinary error:", error.message)
    throw error
  }
}