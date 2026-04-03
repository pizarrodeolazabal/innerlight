import OpenAI from 'openai'
import dotenv from 'dotenv'
dotenv.config()

const openai = new OpenAI()

const prompt = "soft natural light through a window, empty chair, muted earth tones, cinematic atmosphere, shallow depth of field, no people, documentary photography style, 35mm film"

console.log("Generating image...")

const response = await openai.images.generate({
  model: "dall-e-3",
  prompt: prompt,
  n: 1,
  size: "1792x1024",
  quality: "standard"
})

console.log("Image URL:", response.data[0].url)