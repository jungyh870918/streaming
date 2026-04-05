import React, { useState } from 'react'
import DialogueList from './components/DialogueList'
import Player from './components/Player'
import './App.css'

export default function App() {
  const [playing, setPlaying] = useState(null) // {dialogueId, audioUrl, timelineUrl, title}
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function startDialogue(dialogueId) {
    setLoading(true)
    setError(null)
    try {
      // 음원 생성 요청 (이미 있으면 캐시 반환)
      const res  = await fetch(`/api/dialogues/${dialogueId}/generate`, { method: 'POST' })
      const data = await res.json()
      if (data.status === 'ready') {
        setPlaying({
          dialogueId,
          audioUrl:    data.audio_url,
          timelineUrl: data.timeline_url,
          title:       data.title || '',
          duration:    data.duration_sec,
        })
      }
    } catch(e) {
      setError('음원 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (playing) return (
    <Player {...playing} onExit={() => setPlaying(null)} />
  )

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="logo">DIALOGUE<br/>ENGINE</h1>
        <p className="tagline">PM6R 반복 훈련 시스템</p>
      </header>
      {loading
        ? <div className="loading-screen">
            <span className="spinner"/>
            <div>
              <div>PM6R 음원 생성 중...</div>
              <div style={{fontSize:'13px',opacity:.5,marginTop:'6px'}}>처음 한 번만 생성됩니다 (약 1~2분)</div>
            </div>
          </div>
        : error
          ? <div className="loading-screen" style={{color:'#ff6b6b'}}>{error}</div>
          : <DialogueList onStart={startDialogue} />
      }
    </div>
  )
}
