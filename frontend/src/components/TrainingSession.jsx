import React, { useState, useRef, useEffect } from 'react'
import { useSpeech, scoreMatch } from '../hooks/useSpeech'
import StepDisplay from './StepDisplay'
import ProgressBar from './ProgressBar'
import './TrainingSession.css'

export default function TrainingSession({ session, onExit }) {
  const sessions = session.sentence_sessions
  const [sIdx, setSIdx]     = useState(0)   // sentence index
  const [stepIdx, setStepIdx] = useState(0) // step index within sentence
  const [results, setResults] = useState([])
  const [score, setScore]    = useState(null)
  const [done, setDone]      = useState(false)
  const { listening, start, stop, error: speechErr } = useSpeech()
  const audioRef = useRef(null)

  const currentSS   = sessions[sIdx]
  const currentStep = currentSS?.steps[stepIdx]
  const totalSteps  = sessions.reduce((a, s) => a + s.steps.length, 0)
  const doneSteps   = sessions.slice(0, sIdx).reduce((a, s) => a + s.steps.length, 0) + stepIdx

  // Auto-play audio when step changes
  useEffect(() => {
    if (!currentStep) return
    if (currentStep.audio_key && currentStep.step_type === 'full_listen') {
      playAudioKey(currentStep.audio_key)
    }
  }, [sIdx, stepIdx])

  function playAudioKey(key) {
    if (!key) return
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    const audio = new Audio(`/audio/${key}.mp3`)
    audioRef.current = audio
    audio.play().catch(()=>{})
  }

  function playCurrentAudio() {
    playAudioKey(currentStep?.audio_key)
  }

  function advance() {
    const ss = sessions[sIdx]
    if (stepIdx + 1 < ss.steps.length) {
      setStepIdx(s => s + 1)
      setScore(null)
    } else if (sIdx + 1 < sessions.length) {
      setSIdx(s => s + 1)
      setStepIdx(0)
      setScore(null)
    } else {
      setDone(true)
    }
  }

  function handleSpeak() {
    start((text) => {
      const s = scoreMatch(text, currentStep.expected_text || '')
      setScore(s)
      setResults(r => [...r, { step: currentStep, spoken: text, score: s }])
      setTimeout(advance, s >= 0.6 ? 1200 : 2000)
    })
  }

  if (done) return (
    <div className="done-screen">
      <h1 className="done-title">완료!</h1>
      <p className="done-sub">
        평균 정확도: {results.length
          ? Math.round(results.reduce((a,r)=>a+r.score,0)/results.length*100)
          : 0}%
      </p>
      <button className="exit-btn" onClick={onExit}>← 다이얼로그 목록</button>
    </div>
  )

  if (!currentStep) return null

  return (
    <div className="training-shell">
      <div className="training-header">
        <button className="exit-link" onClick={onExit}>← 나가기</button>
        <span className="session-title">{session.title}</span>
        <span className="step-count">{doneSteps + 1} / {totalSteps}</span>
      </div>

      <ProgressBar value={doneSteps} max={totalSteps} />

      <div className="speaker-badge" data-speaker={currentSS.speaker}>
        Speaker {currentSS.speaker}
      </div>

      <StepDisplay
        step={currentStep}
        score={score}
        listening={listening}
        speechErr={speechErr}
        onPlayAudio={playCurrentAudio}
        onSpeak={handleSpeak}
        onSkip={advance}
        onStop={stop}
      />
    </div>
  )
}
