'use client'

import { useState, useRef, useEffect } from 'react'

export default function Home() {
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState('input')
  const [messages, setMessages] = useState<{role: string, content: string}[]>([])
  const [streaming, setStreaming] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, imageUrl])

  if (!mounted) return null

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || streaming) return

    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setStreaming(true)
    setInput('')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      })

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'text') {
                assistantMessage += parsed.content
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: assistantMessage
                  }
                  return updated
                })
              }
              if (parsed.type === 'image') setImageUrl(parsed.url)
            } catch {}
          }
        }
      }
    } finally {
      setStreaming(false)
    }
  }

  const handleSubmit = () => {
    if (!input.trim()) return
    if (phase === 'input') setPhase('conversation')
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#0d1117',
      color: '#e8e4dc',
      fontFamily: '"Georgia", "Times New Roman", serif',
      position: 'relative',
      overflow: 'hidden'
    }}>

      <div style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 0,
        backgroundImage: `
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.012) 2px,
            rgba(255,255,255,0.012) 4px
          ),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(255,255,255,0.008) 3px,
            rgba(255,255,255,0.008) 6px
          )
        `,
        backgroundSize: '4px 6px'
      }} />

      <div style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%', height: '100%',
        zIndex: 0,
        backgroundImage: `
          radial-gradient(ellipse at 20% 50%, rgba(61, 90, 128, 0.04) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 50%, rgba(61, 90, 128, 0.03) 0%, transparent 60%)
        `
      }} />

      <div style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: phase === 'input' ? 'center' : 'flex-start',
        padding: '4rem 2rem',
        maxWidth: '640px',
        margin: '0 auto'
      }}>

        {phase === 'input' && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            <p style={{
              fontSize: '11px',
              letterSpacing: '0.25em',
              color: '#3d5a80',
              marginBottom: '5rem',
              textTransform: 'uppercase'
            }}>
              Innerlight
            </p>

            <p style={{
              fontSize: '28px',
              color: '#e8e4dc',
              marginBottom: '3rem',
              lineHeight: '1.4',
              fontWeight: '400'
            }}>
              What are you living right now?
            </p>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write here..."
              rows={3}
              autoFocus
              style={{
                width: '100%',
                padding: '0',
                fontSize: '18px',
                fontFamily: '"Georgia", "Times New Roman", serif',
                color: '#e8e4dc',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: '1px solid #1e2d3d',
                outline: 'none',
                resize: 'none',
                textAlign: 'center',
                lineHeight: '1.8',
                caretColor: '#3d5a80'
              }}
            />

            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              style={{
                marginTop: '3rem',
                padding: '0',
                fontSize: '11px',
                letterSpacing: '0.2em',
                color: input.trim() ? '#8a9bb0' : '#1e2d3d',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: input.trim() ? 'pointer' : 'default',
                textTransform: 'uppercase',
                transition: 'color 0.3s'
              }}
            >
              Continue →
            </button>
          </div>
        )}

        {phase === 'conversation' && (
          <div style={{ width: '100%', paddingTop: '2rem' }}>
            <p style={{
              fontSize: '11px',
              letterSpacing: '0.25em',
              color: '#3d5a80',
              marginBottom: '4rem',
              textTransform: 'uppercase',
              textAlign: 'center'
            }}>
              Innerlight
            </p>

            <div style={{ marginBottom: '4rem' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  marginBottom: msg.role === 'assistant' ? '3rem' : '1.5rem',
                  textAlign: msg.role === 'user' ? 'right' : 'left'
                }}>
                  {msg.role === 'user' ? (
                    <p style={{
                      fontSize: '13px',
                      color: '#3d5a80',
                      letterSpacing: '0.05em',
                      margin: '0',
                      fontStyle: 'italic'
                    }}>
                      {msg.content}
                    </p>
                  ) : (
                    <p style={{
                      fontSize: '19px',
                      color: '#e8e4dc',
                      lineHeight: '1.9',
                      margin: '0',
                      fontWeight: '400',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {msg.content}
                    </p>
                  )}
                </div>
              ))}

              {streaming && (
                <p style={{
                  fontSize: '19px',
                  color: '#3d5a80',
                  fontStyle: 'italic'
                }}>
                  —
                </p>
              )}

              {imageUrl && (
                <img
                  src={imageUrl}
                  alt=""
                  style={{
                    width: '100%',
                    marginTop: '3rem',
                    marginBottom: '2rem',
                    opacity: 0.95,
                    borderRadius: '2px',
                    display: 'block'
                  }}
                />
              )}

              <div ref={bottomRef} />
            </div>

            {!streaming && (
              <div style={{
                borderTop: '1px solid #1e2d3d',
                paddingTop: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Reply..."
                  autoFocus
                  style={{
                    flex: 1,
                    fontSize: '16px',
                    fontFamily: '"Georgia", "Times New Roman", serif',
                    color: '#e8e4dc',
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    caretColor: '#3d5a80'
                  }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  style={{
                    fontSize: '16px',
                    color: input.trim() ? '#8a9bb0' : '#1e2d3d',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: input.trim() ? 'pointer' : 'default',
                    transition: 'color 0.3s'
                  }}
                >
                  →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}