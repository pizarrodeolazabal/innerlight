import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'
import readline from 'readline'
dotenv.config()

const client = new Anthropic()

const MAX_MESSAGES = 4

let conversationHistory = []
let conversationSummary = ""

const summarizeConversation = async () => {
  const historyText = conversationHistory
    .map(m => `${m.role}: ${m.content}`)
    .join("\n")

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 512,
    messages: [{
      role: "user",
      content: `Summarize this conversation in 3-4 sentences, keeping the key emotional details and what the person is experiencing:\n\n${historyText}`
    }]
  })

  return response.content[0].text
}

const askClaude = async (userMessage) => {
  conversationHistory.push({
    role: "user",
    content: userMessage
  })

  if (conversationHistory.length > MAX_MESSAGES) {
    console.log("\n[Summarizing conversation to save context...]\n")
    conversationSummary = await summarizeConversation()
    conversationHistory = [{
      role: "user",
      content: userMessage
    }]
  }

  const systemPrompt = conversationSummary
    ? `You are a compassionate listener. Ask one question at a time to understand what the user is experiencing.\n\nContext from earlier in the conversation:\n${conversationSummary}`
    : "You are a compassionate listener. Ask one question at a time to understand what the user is experiencing."

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: systemPrompt,
    messages: conversationHistory
  })

  const assistantMessage = response.content[0].text

  conversationHistory.push({
    role: "assistant",
    content: assistantMessage
  })

  return assistantMessage
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const chat = () => {
  rl.question("You: ", async (input) => {
    if (input.toLowerCase() === "exit") {
      console.log("\nConversation ended.")
      if (conversationSummary) {
        console.log("\nFinal summary:")
        console.log(conversationSummary)
      }
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