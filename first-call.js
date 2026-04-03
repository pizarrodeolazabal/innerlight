import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'
dotenv.config()

const client = new Anthropic()

const response = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: "I had a fight with my best friend today. I feel lost."
    }
  ]
})

console.log(response.content[0].text)