import React, { useState } from 'react'
import DialogueList from './components/DialogueList'
import PM6RSession from './components/PM6RSession'
import './App.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function startSession(dialogueId) {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/dialogues/${dialogueId}/pm6r`)
      const data = await res.json()
      setSession(data)
    } catch(e) {
      setError('세션을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  if (session) return <PM6RSession session={session} onExit={() => setSession(null)} />

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="logo">DIALOGUE<br/>ENGINE</h1>
        <p className="tagline">PM6R 반복 훈련 시스템</p>
      </header>
      {loading
        ? <div className="loading-screen"><span className="spinner"/>TTS 생성 중... 잠시만 기다려주세요</div>
        : error
          ? <div className="loading-screen" style={{color:'#ff6b6b'}}>{error}</div>
          : <DialogueList onStart={startSession} />
      }
    </div>
  )
}
