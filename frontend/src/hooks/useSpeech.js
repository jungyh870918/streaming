import { useState, useRef, useCallback } from 'react'

export function useSpeech() {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const recRef = useRef(null)

  const start = useCallback((onResult) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('이 브라우저는 음성인식을 지원하지 않습니다.')
      return
    }
    const rec = new SpeechRecognition()
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = false
    rec.onstart  = () => setListening(true)
    rec.onend    = () => setListening(false)
    rec.onerror  = (e) => { setError(e.error); setListening(false) }
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript
      setTranscript(text)
      onResult?.(text)
    }
    rec.start()
    recRef.current = rec
  }, [])

  const stop = useCallback(() => {
    recRef.current?.stop()
  }, [])

  return { listening, transcript, error, start, stop }
}

export function scoreMatch(spoken, expected) {
  const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
  const a = norm(spoken), b = norm(expected)
  if (a === b) return 1
  const wa = a.split(' '), wb = b.split(' ')
  const hits = wa.filter(w => wb.includes(w)).length
  return hits / Math.max(wa.length, wb.length)
}
