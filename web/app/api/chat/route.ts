import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const SYSTEM_PROMPT = `You are Innerlight — a narrator, not a chatbot.

You listen to what someone is living and return a short piece that gives them perspective. You do not advise. You do not validate. You do not resolve. You see clearly what the person is inside of — and name it.

The closest reference for your voice is The School of Life: philosophical, warm, precise. You know something the reader has not quite articulated yet — and you offer it without drama.

YOUR FLOW — TWO STEPS ONLY:

STEP 1 — THE SHARPENING QUESTION:
Before writing anything, ask one single question. Not to gather information — to help the person discover what they already know but have not named yet.

MOVE 1 — DISTINGUISH: Use when the person gives more facts than emotion.
MOVE 2 — LAND: Use when the person gives more emotion than facts.
MOVE 3 — INVERT: Use when the person is focused on someone else.

STEP 2 — THE PIECE:
Once the person answers your question, write the piece immediately.

Four paragraphs maximum. No titles. No lists. Pure prose.
PARAGRAPH 1: Open in third person. Name the human experience broadly.
PARAGRAPH 2: A real finding or universal truth that normalizes what they feel.
PARAGRAPH 3: Move from people to you. Use their specific details transformed.
PARAGRAPH 4: One to three sentences. Arrives and stops.

WHAT THE VOICE NEVER DOES:
Never gives advice. Never offers resolution. Never says it makes sense that you feel this way.
Never uses: journey, healing, growth, closure, beautiful, heart.

LOOP DETECTION:
If the person seeks the same resolution twice, even with different words, respond with exactly: INNERLIGHT_PAUSE`

const PAUSE_MESSAGE = `Today you brought a lot. That means there are important things moving inside you. Innerlight can help you see — but what you are carrying also deserves a real conversation, with someone who knows you and can stay. Is there someone you could have coffee with this week?`

const archetypes = [
  { name: "The Unseen Effort", keywords: ["unseen", "ignored", "invisible", "not listening"], videoId: "16502841" },
  { name: "The Cost of Caring", keywords: ["guilty", "not enough", "failing", "distracted"], videoId: "19436637" },
  { name: "The Borrowed Identity", keywords: ["impostor", "promoted", "achieved", "succeeded"], videoId: "34576517" },
  { name: "The Necessary Ending", keywords: ["ended", "left", "broke up", "quit", "miss"], videoId: "5930874" },
  { name: "The New Silence", keywords: ["alone", "moved", "starting over", "lonely"], videoId: "35872077" },
  { name: "The Wasted Hours", keywords: ["wasting time", "stuck", "going nowhere", "trapped"], videoId: "7944930" }
]

const findArchetype = (text: string) => {
  const lower = text.toLowerCase()
  let best = null
  let highest = 0
  for (const archetype of archetypes) {
    let score = 0
    for (const keyword of archetype.keywords) {
      if (lower.includes(keyword)) score++
    }
    if (score > highest) {
      highest = score
      best = archetype
    }
  }
  return best
}

const getVideoUrl = async (videoId: string) => {
  const response = await fetch(`https://api.pexels.com/videos/videos/${videoId}`, {
    headers: { Authorization: process.env.PEXELS_API_KEY || '' }
  })
  const data = await response.json()
  const file = data.video_files.find((f: any) => f.quality === 'sd') || data.video_files[0]
  return file.link
}

export async function POST(request: Request) {
  const { messages } = await request.json()

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const firstUserMessage = messages.find((m: any) => m.role === 'user')?.content || ''
        const archetype = findArchetype(firstUserMessage)

        if (archetype && messages.length === 1) {
          try {
            const videoUrl = await getVideoUrl(archetype.videoId)
            send({ type: 'video', url: videoUrl })
          } catch {}
        }

        const claudeStream = client.messages.stream({
          model: 'claude-sonnet-4-5',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages
        })

        let fullResponse = ''

        for await (const chunk of claudeStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            fullResponse += chunk.delta.text
            send({ type: 'text', content: chunk.delta.text })
          }
        }

        if (fullResponse.includes('INNERLIGHT_PAUSE')) {
          send({ type: 'text', content: PAUSE_MESSAGE })
        }

        send({ type: 'done' })
      } catch (error: any) {
        send({ type: 'error', message: error.message })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}