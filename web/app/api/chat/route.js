import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const LISTENER_PROMPT = `You are the Listener, the first agent in Innerlight.
Your only job is to read what the person wrote and choose the right sharpening question.
Respond with a JSON object only. No other text. No markdown.
If this is the first user message, set ready_to_narrate to false and include a question.
If this is the second user message, set ready_to_narrate to true.
Format: {"move":"LAND","tone":"difficult","question":"your question here","ready_to_narrate":false}`

const NARRATOR_PROMPT = `You are the Narrator, the voice of Innerlight.
You receive a conversation and write the piece. You do not ask questions. You only write.
The closest reference for your voice is The School of Life: philosophical, warm, precise.
Four paragraphs maximum. No titles. No lists. Pure prose.
Paragraph 1: Open in third person. Name the human experience broadly.
Paragraph 2: A real finding or universal truth that normalizes what they feel.
Paragraph 3: Move from people to you. Use their specific details transformed.
Paragraph 4: One to three sentences. Arrives and stops.
Never gives advice. Never offers resolution.
Never uses: journey, healing, growth, closure, beautiful, heart.`

const PAUSE_MESSAGE = `Today you brought a lot. That means there are important things moving inside you. Innerlight can help you see — but what you are carrying also deserves a real conversation, with someone who knows you and can stay. Is there someone you could have coffee with this week?`

const archetypes = [
  { name: "The Unseen Effort", keywords: ["unseen", "ignored", "invisible"], videoId: "16502841" },
  { name: "The Cost of Caring", keywords: ["guilty", "not enough", "failing"], videoId: "19436637" },
  { name: "The Borrowed Identity", keywords: ["impostor", "promoted", "achieved"], videoId: "34576517" },
  { name: "The Necessary Ending", keywords: ["ended", "left", "broke up", "quit"], videoId: "5930874" },
  { name: "The New Silence", keywords: ["alone", "moved", "lonely"], videoId: "35872077" },
  { name: "The Wasted Hours", keywords: ["wasting time", "stuck", "trapped"], videoId: "7944930" }
]

const findArchetype = (text) => {
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

const getVideoUrl = async (videoId) => {
  try {
    const response = await fetch(`https://api.pexels.com/videos/videos/${videoId}`, {
      headers: { Authorization: process.env.PEXELS_API_KEY || '' }
    })
    const data = await response.json()
    const file = data.video_files.find(f => f.quality === 'sd') || data.video_files[0]
    return file.link
  } catch {
    return null
  }
}

const listen = async (messages) => {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      system: LISTENER_PROMPT,
      messages
    })

    const text = response.content[0].text.trim()
    console.log("Listener:", text)
    const clean = text.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```$/m, '').trim()
    const parsed = JSON.parse(clean)
    return parsed
  } catch (e) {
    console.log("Listener fallback:", e.message)
    return {
      move: 'LAND',
      tone: 'ambiguous',
      question: 'Was there a specific moment when you felt this most strongly?',
      ready_to_narrate: messages.length >= 2
    }
  }
}

export async function POST(request) {
  const { messages } = await request.json()
  console.log("POST /api/chat — messages:", messages.length)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const firstUserMessage = messages.find(m => m.role === 'user')?.content || ''
        const archetype = findArchetype(firstUserMessage)

        if (archetype && messages.length === 1) {
          const videoUrl = await getVideoUrl(archetype.videoId)
          if (videoUrl) send({ type: 'video', url: videoUrl })
        }

        const listenerResult = await listen(messages)

        if (!listenerResult.ready_to_narrate) {
          send({ type: 'text', content: listenerResult.question })
          send({ type: 'done' })
          controller.close()
          return
        }

        const narratorStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-5',
          max_tokens: 1024,
          system: NARRATOR_PROMPT,
          messages
        })

        let fullResponse = ''

        for await (const chunk of narratorStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            fullResponse += chunk.delta.text
            send({ type: 'text', content: chunk.delta.text })
          }
        }

        if (fullResponse.includes('INNERLIGHT_PAUSE')) {
          send({ type: 'pause', content: PAUSE_MESSAGE })
        }

        send({ type: 'done' })

      } catch (error) {
        console.error("API ERROR:", error.message)
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