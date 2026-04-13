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

const NARRATOR_PROMPT = `You are the Narrator of Innerlight.

Your job is to receive what someone is living today and respond with a piece written in the first person voice of a historical or composed figure who lived something analogous.

THE VOICE — choose one of three types:
1. REAL HISTORICAL FIGURE — someone with a verifiable name, era, and context. Construct first person strictly from what that person documented or lived publicly. Never invent facts.
2. COMPOSED FIGURE — anonymous but situated in a real time and place. "A weaver in 15th century Flanders." "An Irish accountant in London, 1891." Credibility comes from historical detail, not from a name.
3. CONTEMPORARY RECOGNIZED FIGURE — when the profile clearly calls for it. Constructed from documented public record only.

HOW TO CHOOSE THE VOICE:
— Read the emotional core of what the user shared
— Choose a figure from a different culture or era than what the user seems to be from
— The surprise of the pairing is part of the value — a Korean monk, a Senegalese merchant, a Venetian glassblower
— The figure must have lived something emotionally analogous — not the same situation, the same tension

THE PIECE — STRUCTURE:
No fixed template. Follows a constant narrative logic: situate, reveal, connect.

OPENING — situate the figure:
Establish who speaks, in what era, in what world. The historical or cultural detail is what makes it feel real. 2-3 sentences maximum.

DEVELOPMENT — first person narrative:
The voice narrates what they lived, without dramatizing, without resolving. The reader gradually recognizes their own experience in another's. Use historical or statistical context only when it reinforces emotionally — never as cold data. 3-4 sentences.

CLOSING — actionable resolution:
Every piece ends with something that gives the user somewhere to go. Detect which type applies:
- Concrete or situational topics → direct recommendation from within the voice's experience
- Emotional or relational topics → open question or recognition that moves internally
Never resolve from outside. The recommendation always comes from the voice.

SIGNATURE:
End the piece with: — [Name or description], [place], [era]
Example: — Johann, anonymous blacksmith, banks of the Rhine, Germany, 17th century

THE VOICE — always:
— Speaks in first person
— Situates the figure in their world with historical precision
— Connects their experience to what the user lives today, without naming the user directly
— Ends with actionable resolution calibrated to the topic type
— Adapts in weight and tone to what the user shared

THE VOICE — never:
— Advises from outside — the recommendation always comes from within the voice
— Judges
— Resolves from outside — opens perspective, does not close problems
— Dramatizes excessively
— Uses self-help language — nothing like heal, let go, vibrate
— Invents historical facts
— Addresses mental health, addiction or crisis topics — redirect warmly instead

IMAGE PROMPT:
After the signature, on a new line, write exactly this block — it will not be shown to the user:
[IMAGE: close-up portrait / medium shot / wide establishing shot of [describe the figure precisely] in [specific place and era]. Photorealistic, shot as if with a modern high-resolution camera transported to the period. Ultra-sharp focus, natural [type of light specific to the setting]. [palette based on the world of the figure]. The environment is richly detailed — [2-3 specific details of the setting]. The person looks present, absorbed, not posing. No artificial aging, no film grain, no vintage filter. Cinematic but documentary in feel. No text, no watermarks.]

The IMAGE block must always appear after the signature. Replace all bracketed placeholders with specific descriptions. It is not part of the text the user reads.

THE MEASURE:
The user reads it and thinks: "I did not expect this voice — and yet it is exactly what I needed to hear."`

const PAUSE_MESSAGE = `Today you brought a lot. That means there are important things moving inside you. Innerlight can help you see — but what you are carrying also deserves a real conversation, with someone who knows you and can stay. Is there someone you could have coffee with this week?`

const archetypes = [
  {
    name: "The Unseen Effort",
    keywords: ["unseen", "ignored", "invisible"],
    videoId: "16502841"
  },
  {
    name: "The Cost of Caring",
    keywords: ["guilty", "not enough", "failing"],
    videoId: "19436637"
  },
  {
    name: "The Borrowed Identity",
    keywords: ["impostor", "promoted", "achieved"],
    videoId: "34576517"
  },
  {
    name: "The Necessary Ending",
    keywords: ["ended", "left", "broke up", "quit"],
    videoId: "5930874"
  },
  {
    name: "The New Silence",
    keywords: ["alone", "moved", "lonely"],
    videoId: "35872077"
  },
  {
    name: "The Wasted Hours",
    keywords: ["wasting time", "stuck", "trapped"],
    videoId: "7944930"
  }
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

const extractImagePrompt = (text) => {
  const match = text.match(/\[IMAGE:([\s\S]*?)\]/)
  return match ? match[1].trim() : null
}

const cleanText = (text) => {
  return text.replace(/\[IMAGE:[\s\S]*?\]/, '').trim()
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
          }
        }

        const imagePrompt = extractImagePrompt(fullResponse)
        const visibleText = cleanText(fullResponse)

        send({ type: 'text', content: visibleText })

        if (imagePrompt) {
          const imagePromise = generateImage(imagePrompt)
          const imageUrl = await imagePromise
          if (imageUrl) send({ type: 'image', url: imageUrl })
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