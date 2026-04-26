'use client'

import { useState, useRef, useEffect } from 'react'

type Message = { role: string; content: string }
type AppPhase = 'home' | 'receive' | 'contribute' | 'contribute-review'

export default function Home() {
  const [phase, setPhase] = useState<AppPhase>('home')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [contributePiece, setContributePiece] = useState('')
  const [mounted, setMounted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, imageUrl])

  if (!mounted) return null

  const avatarId = 'anon-' + Math.random().toString(36).slice(2, 8)

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
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6))
              if (parsed.type === 'text') {
                assistantMessage += parsed.content
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: assistantMessage }
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

  const sendContribution = async () => {
    if (!input.trim() || streaming) return
    setStreaming(true)
    setContributePiece('')
    const story = input
    setInput('')
    setPhase('contribute-review')

    try {
      const response = await fetch('/api/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story, avatarId })
      })

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let piece = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6))
              if (parsed.type === 'text') {
                piece += parsed.content
                setContributePiece(piece)
              }
            } catch {}
          }
        }
      }
    } finally {
      setStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (phase === 'receive') sendMessage(input)
      if (phase === 'contribute') sendContribution()
    }
  }

  const textareaStyle = {
    width: '100%',
    padding: '0',
    fontSize: '18px',
    fontFamily: '"Georgia", "Times New Roman", serif',
    color: '#e8e4dc',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '1px solid #1e2d3d',
    outline: 'none',
    resize: 'none' as const,
    textAlign: 'center' as const,
    lineHeight: '1.8',
    caretColor: '#3d5a80'
  }

  const buttonStyle = (active: boolean) => ({
    marginTop: '3rem',
    padding: '0',
    fontSize: '11px',
    letterSpacing: '0.2em',
    color: active ? '#8a9bb0' : '#1e2d3d',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: active ? 'pointer' : 'default',
    textTransform: 'uppercase' as const,
    transition: 'color 0.3s'
  })

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
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0,
        backgroundImage: `
          repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px),
          repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.008) 3px, rgba(255,255,255,0.008) 6px)
        `,
        backgroundSize: '4px 6px'
      }} />

      <div style={{
        position: 'relative', zIndex: 1, minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: phase === 'home' ? 'center' : 'flex-start',
        padding: '4rem 2rem', maxWidth: '640px', margin: '0 auto'
      }}>

        {phase === 'home' && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.25em', color: '#3d5a80', marginBottom: '5rem', textTransform: 'uppercase' }}>
              Innerlight
            </p>
            <p style={{ fontSize: '28px', color: '#e8e4dc', marginBottom: '1rem', lineHeight: '1.4', fontWeight: '400' }}>
              The human experience travels through time.
            </p>
            <p style={{ fontSize: '16px', color: '#8a9bb0', marginBottom: '4rem', lineHeight: '1.7' }}>
              Share what you are living and receive perspective from a voice that lived something analogous — across cultures, across centuries.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <button onClick={() => setPhase('receive')} style={{
                fontSize: '13px', letterSpacing: '0.15em', color: '#e8e4dc',
                backgroundColor: 'transparent', border: '1px solid #1e2d3d',
                padding: '1rem 2.5rem', cursor: 'pointer', textTransform: 'uppercase',
                transition: 'border-color 0.3s'
              }}>
                Receive perspective
              </button>
              <button onClick={() => setPhase('contribute')} style={{
                fontSize: '13px', letterSpacing: '0.15em', color: '#3d5a80',
                backgroundColor: 'transparent', border: 'none',
                padding: '0.5rem', cursor: 'pointer', textTransform: 'uppercase'
              }}>
                Contribute a story →
              </button>
            </div>
          </div>
        )}

        {phase === 'receive' && (
          <div style={{ width: '100%', paddingTop: '2rem' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.25em', color: '#3d5a80', marginBottom: '4rem', textTransform: 'uppercase', textAlign: 'center', cursor: 'pointer' }}
              onClick={() => { setPhase('home'); setMessages([]); setImageUrl(null) }}>
              ← Innerlight
            </p>

            {messages.length === 0 && (
              <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <p style={{ fontSize: '24px', color: '#e8e4dc', marginBottom: '2rem', lineHeight: '1.4' }}>
                  What are you living right now?
                </p>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write here..."
                  rows={3}
                  autoFocus
                  style={textareaStyle}
                />
                <button onClick={() => sendMessage(input)} disabled={!input.trim()} style={buttonStyle(!!input.trim())}>
                  Continue →
                </button>
              </div>
            )}

            <div style={{ marginBottom: '4rem' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ marginBottom: msg.role === 'assistant' ? '3rem' : '1.5rem', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                  {msg.role === 'user' ? (
                    <p style={{ fontSize: '13px', color: '#3d5a80', letterSpacing: '0.05em', margin: '0', fontStyle: 'italic' }}>
                      {msg.content}
                    </p>
                  ) : (
                    <p style={{ fontSize: '19px', color: '#e8e4dc', lineHeight: '1.9', margin: '0', whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </p>
                  )}
                </div>
              ))}

              {streaming && (
                <p style={{ fontSize: '19px', color: '#3d5a80', fontStyle: 'italic' }}>—</p>
              )}

              {imageUrl && (
                <img src={imageUrl} alt="" style={{ width: '100%', marginTop: '3rem', marginBottom: '2rem', opacity: 0.95, borderRadius: '2px', display: 'block' }} />
              )}

              <div ref={bottomRef} />
            </div>

            {messages.length > 0 && !streaming && (
              <div style={{ borderTop: '1px solid #1e2d3d', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Reply..."
                  autoFocus
                  style={{ flex: 1, fontSize: '16px', fontFamily: '"Georgia", "Times New Roman", serif', color: '#e8e4dc', backgroundColor: 'transparent', border: 'none', outline: 'none', caretColor: '#3d5a80' }}
                />
                <button onClick={() => sendMessage(input)} disabled={!input.trim()} style={{ fontSize: '16px', color: input.trim() ? '#8a9bb0' : '#1e2d3d', backgroundColor: 'transparent', border: 'none', cursor: input.trim() ? 'pointer' : 'default' }}>
                  →
                </button>
              </div>
            )}
          </div>
        )}

        {phase === 'contribute' && (
          <div style={{ width: '100%', paddingTop: '2rem' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.25em', color: '#3d5a80', marginBottom: '4rem', textTransform: 'uppercase', textAlign: 'center', cursor: 'pointer' }}
              onClick={() => setPhase('home')}>
              ← Innerlight
            </p>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '24px', color: '#e8e4dc', marginBottom: '1rem', lineHeight: '1.4' }}>
                Share something you already lived.
              </p>
              <p style={{ fontSize: '15px', color: '#8a9bb0', marginBottom: '3rem', lineHeight: '1.7' }}>
                Something you processed. Something you now see from the other side. It will help someone going through the same thing today — anonymously, from your voice.
              </p>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write freely, as if telling someone you trust..."
                rows={5}
                autoFocus
                style={{ ...textareaStyle, textAlign: 'left' as const }}
              />
              <button onClick={sendContribution} disabled={!input.trim()} style={buttonStyle(!!input.trim())}>
                Transform my story →
              </button>
            </div>
          </div>
        )}

        {phase === 'contribute-review' && (
          <div style={{ width: '100%', paddingTop: '2rem' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.25em', color: '#3d5a80', marginBottom: '4rem', textTransform: 'uppercase', textAlign: 'center' }}>
              Innerlight
            </p>
            <p style={{ fontSize: '13px', color: '#3d5a80', marginBottom: '2rem', letterSpacing: '0.05em' }}>
              This is how your story will reach others —
            </p>
            <p style={{ fontSize: '19px', color: '#e8e4dc', lineHeight: '1.9', whiteSpace: 'pre-wrap', marginBottom: '3rem' }}>
              {contributePiece}
            </p>
            {!streaming && contributePiece && (
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <p style={{ fontSize: '13px', color: '#3d5a80', marginBottom: '2rem' }}>
                  Your story is now part of Innerlight. Someone will read it when they need it most.
                </p>
                <button onClick={() => { setPhase('home'); setContributePiece(''); setInput('') }} style={buttonStyle(true)}>
                  Back to Innerlight →
                </button>
              </div>
            )}
            {streaming && (
              <p style={{ fontSize: '19px', color: '#3d5a80', fontStyle: 'italic' }}>—</p>
            )}
          </div>
        )}

      </div>
    </main>
  )
}