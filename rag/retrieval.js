import { archetypes } from './archetypes.js'

export const findArchetype = (userInput) => {
  const input = userInput.toLowerCase()

  let bestMatch = null
  let highestScore = 0

  for (const archetype of archetypes) {
    let score = 0
    for (const keyword of archetype.keywords) {
      if (input.includes(keyword)) {
        score++
      }
    }
    if (score > highestScore) {
      highestScore = score
      bestMatch = archetype
    }
  }

  return bestMatch
}