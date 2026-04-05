import React, { useState, useEffect, useRef } from 'react'
import { useSpeech, scoreMatch } from '../hooks/useSpeech'
import Countdown from './Countdown'
import './PM6RSession.css'

const ROUND_LABELS = {
  memorization: { num:'P2', name:'Memorization', color:'#888' },
  repetition:   { num:'P3', name:'Repetition',   color:'#47c5ff' },
  reflection:   { num:'P4', name:'Reflection',   color:'#a78bfa' },
  rehearsal:    { num:'P5', name:'Rehearsal',     color:'#fb923c' },
  recital:      { num:'P6', name:'Recital',       color:'#f472b6' },
  retrieval:    { num:'P7', name:'Retrieval',     color:'#e8ff47' },
}

export default function PM6RSession({ session, onExit }) {
  const rounds   = session.rounds
  const [rIdx,   setRIdx]   = useState(0)
  const [sIdx,   setSIdx]   = useState(0)
  const [phase,  setPhase]  = useState('idle')  // idle | countdown | listening | result
  const [score,  setScore]  = useState(null)
  const [spoken, setSpoken] = useState('')
  const [done,   setDone]   = useState(false)
  const audioRef = useRef(null)
  const { listening, start, stop, error: speechErr } = useSpeech()

  const round   = rounds[rIdx]
  const step    = round?.steps[sIdx]
  const rl      = ROUND_LABELS[round?.round_type] || {}

  // 총 진행도
  const totalSteps = rounds.reduce((a,r) => a + r.steps.length, 0)
  const doneSteps  = rounds.slice(0,rIdx).reduce((a,r)=>a+r.steps.length,0) + sIdx
  const pct        = totalSteps ? Math.round(doneSteps/totalSteps*100) : 0

  // 스텝 변경 시 오디오 자동재생 (LISTEN 타입)
  useEffect(() => {
    if (!step) return
    setPhase('idle'); setScore(null); setSpoken('')
    if (step.step_type === 'listen' && step.audio_key) {
      playAudio(step.audio_key, () => setPhase('idle'))
    }
  }, [rIdx, sIdx])

  function playAudio(key, onEnd) {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    const a = new Audio(`/audio/${key}.mp3`)
    audioRef.current = a
    a.onended = onEnd || null
    a.play().catch(()=>{})
  }

  function advance() {
    const r = rounds[rIdx]
    if (sIdx + 1 < r.steps.length) {
      setSIdx(s => s+1)
    } else if (rIdx + 1 < rounds.length) {
      setRIdx(r => r+1); setSIdx(0)
    } else {
      setDone(true)
    }
  }

  function handleSpeak() {
    if (step.silence_seconds > 0) {
      setPhase('countdown')
    } else {
      startListening()
    }
  }

  function startListening() {
    setPhase('listening')
    start((text) => {
      setSpoken(text)
      const s = scoreMatch(text, step.expected_text || '')
      setScore(s)
      setPhase('result')
      // 정답 오디오 재생 후 자동 진행
      if (step.audio_key) {
        setTimeout(() => playAudio(step.audio_key, () => setTimeout(advance, 600)), 800)
      } else {
        setTimeout(advance, s >= 0.6 ? 1500 : 2500)
      }
    })
  }

  if (done) return (
    <div className="done-screen">
      <div className="done-inner">
        <p className="done-label">완료</p>
        <h1 className="done-title">PM6R</h1>
        <p className="done-sub">모든 라운드를 완주했어요</p>
        <button className="exit-btn" onClick={onExit}>← 다이얼로그 목록</button>
      </div>
    </div>
  )

  if (!step) return null

  const needSpeak = step.step_type !== 'listen'
  const scoreColor = score == null ? null : score >= .8 ? '#a8ff78' : score >= .5 ? '#ffdd57' : '#ff6b6b'

  return (
    <div className="session-shell">
      {/* Header */}
      <div className="session-header">
        <button className="exit-link" onClick={onExit}>← 나가기</button>
        <div className="round-badge" style={{ color: rl.color }}>
          <span className="round-num-badge">{rl.num}</span>
          {rl.name}
        </div>
        <span className="step-counter">{pct}%</span>
      </div>

      {/* Progress */}
      <div className="progress-track">
        <div className="progress-fill" style={{ width:`${pct}%` }} />
      </div>

      {/* Speaker */}
      <div className="speaker-row">
        <div className={`speaker-badge spk-${step.speaker}`}>
          Speaker {step.speaker}
        </div>
        <div className="step-type-label">{
          step.step_type === 'listen'   ? '▶ 듣기' :
          step.step_type === 'repeat'   ? '🎤 따라말하기' :
          step.step_type === 'recall'   ? '💬 말하기' :
                                          '💭 인출'
        }</div>
      </div>

      {/* Main content */}
      <div className="step-body">
        {/* 영어 텍스트 */}
        {step.show_text && (
          <div className="sentence-en">
            {step.chunks?.length > 0
              ? step.chunks.map((c,i) => <span key={i} className="chunk">{c} </span>)
              : step.sentence_text
            }
          </div>
        )}
        {!step.show_text && step.step_type !== 'listen' && (
          <div className="sentence-hidden">???</div>
        )}

        {/* 한글 번역 */}
        {step.show_translation && step.translation && (
          <div className="sentence-ko">{step.translation}</div>
        )}

        {/* 결과 */}
        {score != null && (
          <div className="score-row" style={{ color: scoreColor }}>
            <span>{score >= .8 ? '✓ 정확해요!' : score >= .5 ? '△ 한 번 더!' : '✗ 다시 해봐요'}</span>
            <span className="score-pct">{Math.round(score*100)}%</span>
            {spoken && <div className="spoken-text">"{spoken}"</div>}
          </div>
        )}

        {speechErr && <div className="speech-err">{speechErr}</div>}
      </div>

      {/* Actions */}
      <div className="action-area">
        {step.step_type === 'listen' ? (
          <div className="listen-hint">
            <button className="btn-replay" onClick={() => playAudio(step.audio_key)}>↺ 다시 듣기</button>
            <button className="btn-next-auto" onClick={advance}>다음 →</button>
          </div>
        ) : phase === 'idle' ? (
          <button className="btn-speak" onClick={handleSpeak}>
            {step.silence_seconds > 0 ? `🎤 ${step.silence_seconds}초 카운트다운 후 말하기` : '🎤 말하기'}
          </button>
        ) : phase === 'countdown' ? (
          <Countdown
            seconds={step.silence_seconds}
            onDone={startListening}
            onSkip={startListening}
          />
        ) : phase === 'listening' ? (
          <button className="btn-speak active" onClick={stop}>⏹ 듣는 중...</button>
        ) : null}
        <button className="btn-skip" onClick={advance}>건너뛰기</button>
      </div>
    </div>
  )
}
