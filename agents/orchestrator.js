import { listen } from './listener.js'
import { narrate } from './narrator.js'

const PAUSE_MESSAGE = `Today you brought a lot. That means there are important things moving inside you.

Innerlight can help you see — but what you are carrying also deserves a real conversation, with someone who knows you and can stay.

Is there someone you could have coffee with this week and tell them something of what you are carrying?

Innerlight will be here when you come back with something specific you want to see differently.`

export const orchestrate = async (messages, onChunk) => {
  const listenerResult = await listen(messages)

  if (listenerResult.ready_to_narrate) {
    const stream = await narrate(messages)

    let fullResponse = ''

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        fullResponse += chunk.delta.text
        onChunk({ type: 'text', content: chunk.delta.text })
      }
    }

    if (fullResponse.includes('INNERLIGHT_PAUSE')) {
      onChunk({ type: 'pause', content: PAUSE_MESSAGE })
    }

    onChunk({ type: 'done' })

  } else {
    onChunk({ type: 'text', content: listenerResult.question })
    onChunk({ type: 'done' })
  }
}