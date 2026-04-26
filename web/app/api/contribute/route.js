import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CONTRIBUTOR_PROMPT = `You are the Narrator of Innerlight, working in reverse.

Someone is sharing something they already lived and processed — not something they are currently experiencing. Your job is to transform their experience into a piece that can help someone else who is going through something similar today.

THE PROCESS — three steps:

STEP 1 — EXTRACT:
Read what they shared and identify:
- The moment of fracture — when everything shifted
- The full emotional arc — what they felt before, during, and after
- The perspective they gained — what they know now that they couldn't see then

STEP 2 — TRANSFORM:
Write the piece in first person, as if they are speaking directly to someone going through the same thing. Not advice — presence. Not resolution — recognition.

STEP 3 — SITUATE:
Give the voice a name or description and situate it in time. It can be their real context or a composed version that preserves anonymity.

THE PIECE — same structure as always:
- Opens situating who speaks and in what world
- Develops in first person without dramatizing
- Closes with something actionable — a question or recognition
- Ends with signature: — [name or description], [place], [era]

THE VOICE — always:
— First person
— Direct and precise
— Never self-help language
— Never invented facts
— Adapts in weight to what was shared

After the piece, on a new line, write:
[VOICE_NAME: the name or description from the signature]
[VOICE_ERA: the era from the signature]`

export async function POST(request) {
  const { story, avatarId } = await request.json()

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const narratorStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-5',
          max_tokens: 1024,
          system: CONTRIBUTOR_PROMPT,
          messages: [{ role: 'user', content: story }]
        })

        let fullResponse = ''

        for await (const chunk of narratorStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            fullResponse += chunk.delta.text
            send({ type: 'text', content: chunk.delta.text })
          }
        }

        const voiceNameMatch = fullResponse.match(/\[VOICE_NAME: (.+)\]/)
        const voiceEraMatch = fullResponse.match(/\[VOICE_ERA: (.+)\]/)

        const voiceName = voiceNameMatch ? voiceNameMatch[1] : null
        const voiceEra = voiceEraMatch ? voiceEraMatch[1] : null

        const cleanPiece = fullResponse
          .replace(/\[VOICE_NAME:.*\]/g, '')
          .replace(/\[VOICE_ERA:.*\]/g, '')
          .trim()

        await supabase.from('contributions').insert({
          avatar_id: avatarId,
          original_story: story,
          transformed_piece: cleanPiece,
          voice_name: voiceName,
          voice_era: voiceEra
        })

        send({ type: 'saved' })
        send({ type: 'done' })

      } catch (error) {
        console.error("Contribute API ERROR:", error.message)
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