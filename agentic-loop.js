import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'
import readline from 'readline'
dotenv.config()

const client = new Anthropic()

const SYSTEM_PROMPT = `You are Innerlight, a creative storytelling agent. You follow a strict loop:

PHASE 1 - LISTEN & CLARIFY (maximum 2 questions):
- Ask ONE clarifying question to understand deeper
- After exactly 2 user responses, you MUST move to PHASE 2
- Never give advice, never diagnose, never judge
- Count the user responses. After response #2, stop asking.

PHASE 2 - ANNOUNCE:
- Say exactly this: "I have everything I need. Let me craft your story."
- Then immediately move to PHASE 3

PHASE 3 - NARRATE:
- Write a short story in 3 acts inspired by what the user shared
- The story uses metaphor — never describes the user's situation literally
- Act 1: the world before the storm (2-3 sentences)
- Act 2: the moment everything shifts (2-3 sentences)  
- Act 3: a glimpse of what could be (2-3 sentences)
- End with: "--- Your story is ready ---"

IMPORTANT: You are counting user responses. At response #2 you MUST narrate. No more questions.`

const conversationHistory = []

const askClaude = async (userMessage) => {
  conversationHistory.push({
    role: "user",
    content: userMessage
  })

  const stream = client.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: conversationHistory
  })

  process.stdout.write("\nInnerlight: ")

  let fullResponse = ""

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      process.stdout.write(chunk.delta.text)
      fullResponse += chunk.delta.text
    }
  }

  console.log("\n")

  conversationHistory.push({
    role: "assistant",
    content: fullResponse
  })
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const chat = () => {
  rl.question("You: ", async (input) => {
    if (input.toLowerCase() === "exit") {
      console.log("Session ended.")
      rl.close()
      return
    }

    await askClaude(input)
    chat()
  })
}

console.log("Innerlight - Share what you are experiencing\n")
chat()