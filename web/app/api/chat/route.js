import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const LISTENER_PROMPT = `You are the Listener, the first agent in Innerlight.
Your only job is to read what the person wrote and choose the right sharpening question.
Respond with a JSON object only. No other text. No markdown. No backticks. No code blocks.
If this is the first user message, set ready_to_narrate to false and include a question.
If this is the second user message or more, set ready_to_narrate to true.
Output only raw JSON like this: {"move":"LAND","tone":"difficult","question":"your question here","ready_to_narrate":false}`

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
  {
    name: "The Unseen Effort",
    keywords: ["unseen", "ignored", "invisible"],
    videoId: "16502841",
    imagePrompt: "35mm film photograph. A person stands with their back to the camera, slightly out of focus, facing a wide window that looks out onto an empty street. The figure is the emotional center of the frame. The glass is slightly fogged. Muted palette: cold whites, pale grays, faded blue. Shallow depth of field. Cinematic grain."
  },
  {
    name: "The Cost of Caring",
    keywords: ["guilty", "not enough", "failing"],
    videoId: "19436637",
    imagePrompt: "35mm film photograph. A person sits with their back to the camera, slightly out of focus, facing a faintly glowing screen in a dim room. Warm and cold light pulling in opposite directions. Muted palette: dusty amber, cool blue-gray, deep shadow. Shallow depth of field. Cinematic grain."
  },
  {
    name: "The Borrowed Identity",
    keywords: ["impostor", "promoted", "achieved"],
    videoId: "34576517",
    imagePrompt: "35mm film photograph. A person stands with their back to the camera, slightly out of focus, in the middle of a long corridor stretching into dim light. Muted palette: faded whites, worn grays, dull ochre. Flat even light. Shallow depth of field. Cinematic grain."
  },
  {
    name: "The Necessary Ending",
    keywords: ["ended", "left", "broke up", "quit"],
    videoId: "5930874",
    imagePrompt: "35mm film photograph. A person stands with their back to the camera, very close to a rain-covered window. Rain drops run down the glass, sharp and clear. Outside is blurred and soft. Muted palette: cool silver, pale gray, faint warm glow. Shallow depth of field. Cinematic grain."
  },
  {
    name: "The New Silence",
    keywords: ["alone", "moved", "lonely"],
    videoId: "35872077",
    imagePrompt: "35mm film photograph. A person sits on the floor with their back to the camera, in a bare and impersonal room. One warm object nearby. Outside the window, life continues out of focus. Muted palette with one note of warmth against gray. Shallow depth of field. Cinematic grain."
  },
  {
    name: "The Wasted Hours",
    keywords: ["wasting time", "stuck", "trapped"],
    videoId: "7944930",
    imagePrompt: "35mm film photograph. A person sits at a table with their back to the camera, staring at a dark phone screen. Signs of time passed around them. Muted palette: cold gray, dull white, faint amber. Shallow depth of field. Cinematic grain."
  }
]

const defaultImagePrompt = "35mm film photograph. A person stands with their back to the camera, slightly out of focus, looking out a window at soft natural light. Muted palette, shallow depth of field. Quiet. Still. Cinematic grain."

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

const generateImage = async (imagePrompt) => {
  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: '1792x1024',
      quality: 'standard'
    })
    return response.data[0].url
  } catch (e) {
    console.error("Image generation error:", e.message)
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

    const clean = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    return JSON.parse(clean)
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
          return
        }

        const imagePrompt = archetype ? archetype.imagePrompt : defaultImagePrompt
        const imagePromise = generateImage(imagePrompt)

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

        const imageUrl = await imagePromise
        if (imageUrl) send({ type: 'image', url: imageUrl })

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