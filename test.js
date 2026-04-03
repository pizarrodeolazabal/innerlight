import dotenv from 'dotenv'
dotenv.config()

const apiKey = process.env.ANTHROPIC_API_KEY

if (apiKey) {
  console.log("API key loaded successfully")
  console.log("First 7 characters:", apiKey.substring(0, 7))
} else {
  console.log("ERROR: API key not found")
}