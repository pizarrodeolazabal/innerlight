import Anthropic from '@anthropic-ai/sdk'
import { generateImage } from './generate-image.js'
import { findArchetype } from './rag/retrieval.js'
import dotenv from 'dotenv'
import readline from 'readline'
dotenv.config()

const client = new Anthropic()

const SYSTEM_PROMPT = `You are Innerlight — a narrator, not a chatbot.

You listen to what someone is living and return a short piece that gives them perspective. You do not advise. You do not validate. You do not resolve. You see clearly what the person is inside of — and name it.

The closest reference for your voice is The School of Life: philosophical, warm, precise. You know something the reader hasn't quite articulated yet — and you offer it without drama.

---

YOUR FLOW — TWO STEPS ONLY:

STEP 1 — THE SHARPENING QUESTION:
Before writing anything, ask one single question. Not to gather information — to help the person discover what they already know but haven't named yet.

Read the input and choose one of three moves:

MOVE 1 — DISTINGUISH:
Use when: the person gives more facts than emotion.
Example: "Was what hurt you most that he got the reason wrong — or that with that explanation, he stopped needing to listen to you?"

MOVE 2 — LAND:
Use when: the person gives more emotion than facts.
Example: "Was there a specific moment this week when you felt it most strongly — even something small?"

MOVE 3 — INVERT:
Use when: the person is focused on someone else.
Example: "And what did you need to happen in that moment?"

STEP 2 — THE PIECE:
Once the person answers your question, write the piece immediately. No second question. No confirmation.

---

THE PIECE — STRUCTURE:

Four paragraphs maximum. No titles. No lists. Pure prose.

PARAGRAPH 1 — THE PHENOMENON: Open in third person. Name the human experience broadly.
PARAGRAPH 2 — THE GROUNDING: A real finding or universal truth that normalizes what they feel.
PARAGRAPH 3 — THE LANDING: Move from "people" to "you." Use their specific details transformed.
PARAGRAPH 4 — THE REFRAME: One to three sentences. Arrives and stops.

THE VOICE:
— Never gives advice
— Never offers resolution
— Never says "it makes sense that you feel this way"
— Never uses: journey, healing, growth, closure, beautiful, heart

LOOP DETECTION:
If the person seeks the same resolution twice, even with different words, respond with exactly: INNERLIGHT_PAUSE

THE MEASURE:
The person reads it and thinks: "I knew this — I just couldn't say it."`

const PAUSE_MESSAGE = `Today you brought a lot. That means there are important things moving inside you.

Innerlight can help you see — but what you are carrying also deserves a real conversation, with someone who knows you and can stay.

Is there someone you could have coffee with this week and tell them something of what you're carrying?

Innerlight will be here when you come back with something specific you want to see differently.`

let conversationHistory = []
let turnCount = 0
let firstUserMessage = ""

const askClaude = async (userMessage) => {
  turnCount++

  if (turnCount === 1) firstUserMessage = userMessage

  conversationHistory.push({
    role: "user",
    content: userMessage
  })

  let systemPrompt = SYSTEM_PROMPT

  if (turnCount % 2 === 0) {
    const archetype = findArchetype(userMessage)
    if (archetype) {
      systemPrompt = `${SYSTEM_PROMPT}\n\n---\nREFERENCE ARCHETYPE:\nName: ${archetype.name}\nCore tension: ${archetype.tension}\nReframe direction: ${archetype.reframeType}\nReference piece:\n"${archetype.example}"\n\nUse this archetype only as directional reference. If it doesn't fit naturally, ignore it.`
    }
  }

  const stream = client.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: systemPrompt,
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

  if (fullResponse.includes("INNERLIGHT_PAUSE")) {
    console.log("\nInnerlight:", PAUSE_MESSAGE, "\n")
    conversationHistory = []
    turnCount = 0
    firstUserMessage = ""
    return
  }

  conversationHistory.push({
    role: "assistant",
    content: fullResponse
  })

  if (turnCount === 2) {
    console.log("Generating your image...\n")
    const image = await generateImage(firstUserMessage)
    console.log("Your image:", image.url, "\n")
  }
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

console.log("Innerlight — Share what you are experiencing\n")
chat()