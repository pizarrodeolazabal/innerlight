import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'
dotenv.config()

const client = new Anthropic()

const streamResponse = async (userMessage) => {
  console.log("\nInnerlight: ")

  const stream = client.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: "You are a creative storyteller. When someone shares what they are experiencing, respond with the beginning of a short poetic story inspired by their situation. Write slowly and vividly.",
    messages: [
      {
        role: "user",
        content: userMessage
      }
    ]
  })

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      process.stdout.write(chunk.delta.text)
    }
  }

  const finalMessage = await stream.finalMessage()
  console.log("\n\n--- Story complete ---")
  console.log(`Tokens used: ${finalMessage.usage.input_tokens} input, ${finalMessage.usage.output_tokens} output`)
}

await streamResponse("I had a fight with my best friend today. I feel lost.")