import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'
import readline from 'readline'
dotenv.config()

const client = new Anthropic()

const conversationHistory = []

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const askClaude = async (userMessage) => {
  conversationHistory.push({
    role: "user",
    content: userMessage
  })

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: "You are a compassionate listener. Ask one question at a time to understand what the user is experiencing.",
    messages: conversationHistory
  })

  const assistantMessage = response.content[0].text

  conversationHistory.push({
    role: "assistant",
    content: assistantMessage
  })

  return assistantMessage
}

const chat = () => {
  rl.question("You: ", async (input) => {
    if (input.toLowerCase() === "exit") {
      console.log("Conversation ended.")
      rl.close()
      return
    }

    const response = await askClaude(input)
    console.log("\nClaude:", response, "\n")
    chat()
  })
}

console.log("Innerlight - type 'exit' to quit\n")
chat()