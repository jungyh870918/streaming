import React, { useState } from 'react'
import DialogueList from './components/DialogueList'
import TrainingSession from './components/TrainingSession'
import './App.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)

  async function startSession(dialogueId, template = 'dialogue_memorization') {
    setLoading(true)
    try {
      const res = await fetch(`/api/dialogues/${dialogueId}/session?template=${template}`)
      const data = await res.json()
      setSession(data)
    } catch(e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (session) return (
    <TrainingSession session={session} onExit={() => setSession(null)} />
  )

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="logo">DIALOGUE<br/>ENGINE</h1>
        <p className="tagline">청크 단위 영어 암기 훈련</p>
      </header>
      {loading
        ? <div className="loading-screen"><span className="spinner"/>Preparing session...</div>
        : <DialogueList onStart={startSession} />
      }
    </div>
  )
}
