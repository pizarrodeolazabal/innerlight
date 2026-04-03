import OpenAI from 'openai'
import dotenv from 'dotenv'
import { findArchetype } from './rag/retrieval.js'
import https from 'https'
import fs from 'fs'
import path from 'path'
dotenv.config()

const openai = new OpenAI()

const downloadImage = (url, filepath) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath)
    https.get(url, (response) => {
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve(filepath)
      })
    }).on('error', (err) => {
      fs.unlink(filepath, () => {})
      reject(err)
    })
  })
}

export const generateImage = async (userInput) => {
  const archetype = findArchetype(userInput)

  const imagePrompt = archetype
    ? archetype.imagePrompt
    : "Atmospheric 35mm film photograph. Empty room with soft natural light through a window. Muted palette, shallow depth of field. Quiet. Still. Cinematic grain."

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: imagePrompt,
    n: 1,
    size: "1792x1024",
    quality: "standard"
  })

  const temporaryUrl = response.data[0].url
  const archetypeName = archetype
    ? archetype.name.replace(/\s+/g, '-').toLowerCase()
    : "default"

  if (!fs.existsSync('./images')) {
    fs.mkdirSync('./images')
  }

  const filename = `${archetypeName}-${Date.now()}.png`
  const filepath = path.join('./images', filename)

  await downloadImage(temporaryUrl, filepath)

  return {
    url: filepath,
    archetype: archetype ? archetype.name : "default"
  }
}