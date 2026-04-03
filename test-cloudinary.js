import { v2 as cloudinary } from 'cloudinary'
import dotenv from 'dotenv'
dotenv.config()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

try {
  const result = await cloudinary.api.ping()
  console.log("Cloudinary connected:", result)
} catch (error) {
  console.error("Connection failed:", error.message)
  console.error("Full error:", error)
}