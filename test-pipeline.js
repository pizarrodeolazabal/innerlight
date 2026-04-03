import { generateImage } from './generate-image.js'

console.log("Testing image pipeline...\n")

const result = await generateImage("I feel like my best friend never really sees me")

console.log("Archetype:", result.archetype)
console.log("Image URL:", result.url)