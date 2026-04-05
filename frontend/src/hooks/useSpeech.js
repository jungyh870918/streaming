import { useState, useRef, useCallback } from 'react'

export function useSpeech() {
  const [listening,   setListening]   = useState(false)
  const [transcript,  setTranscript]  = useState('')
  const [error,       setError]       = useState(null)
  const recRef = useRef(null)

  const start = useCallback((onResult) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setError('음성인식 미지원 브라우저입니다. Chrome/Edge를 사용해주세요.'); return }
    const rec = new SR()
    rec.lang = 'en-US'; rec.continuous = false; rec.interimResults = false
    rec.onstart  = () => { setListening(true); setError(null) }
    rec.onend    = () => setListening(false)
    rec.onerror  = e => { setError(e.error); setListening(false) }
    rec.onresult = e => {
      const text = e.results[0][0].transcript
      setTranscript(text)
      onResult?.(text)
    }
    rec.start()
    recRef.current = rec
  }, [])

  const stop = useCallback(() => recRef.current?.stop(), [])

  return { listening, transcript, error, start, stop }
}

export function scoreMatch(spoken, expected) {
  const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g,'').trim()
  const a = norm(spoken), b = norm(expected)
  if (a === b) return 1
  const wa = a.split(' '), wb = b.split(' ')
  return wa.filter(w => wb.includes(w)).length / Math.max(wa.length, wb.length)
}
