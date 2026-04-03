import { orchestrate } from './agents/orchestrator.js'

console.log("Testing multi-agent system...\n")

const messages = [
  { role: 'user', content: 'I had a fight with my best friend and I feel lost' }
]

console.log("Turn 1 — Listener should ask a question:\n")

await orchestrate(messages, (chunk) => {
  if (chunk.type === 'text') process.stdout.write(chunk.content)
  if (chunk.type === 'done') console.log('\n\n--- done ---')
})

const messages2 = [
  { role: 'user', content: 'I had a fight with my best friend and I feel lost' },
  { role: 'assistant', content: 'Was there a specific moment when the distance between you became impossible to ignore?' },
  { role: 'user', content: 'When he did not show up to something important to me' }
]

console.log("Turn 2 — Narrator should write the piece:\n")

await orchestrate(messages2, (chunk) => {
  if (chunk.type === 'text') process.stdout.write(chunk.content)
  if (chunk.type === 'done') console.log('\n\n--- done ---')
})