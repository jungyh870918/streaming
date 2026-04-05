import React, { useState, useEffect, useRef } from 'react'
import { useSpeech, scoreMatch } from '../hooks/useSpeech'
import './PM6RSession.css'

const ROUND_META = {
  memorization: { num:'P2', name:'MEMORIZATION', color:'#888',    target: 0 },
  repetition:   { num:'P3', name:'REPETITION',   color:'#47c5ff', target: 3 },
  reflection:   { num:'P4', name:'REFLECTION',   color:'#a78bfa', target: 3 },
  rehearsal:    { num:'P5', name:'REHEARSAL',     color:'#fb923c', target: 2 },
  recital:      { num:'P6', name:'RECITAL',       color:'#f472b6', target: 2 },
  retrieval:    { num:'P7', name:'RETRIEVAL',     color:'#e8ff47', target: 1 },
}

// 빈칸 처리: 마지막 청크를 ___로
function buildBlankText(sentence, chunks) {
  if (!chunks || chunks.length === 0) return { visible: sentence, blank: '' }
  if (chunks.length === 1) return { visible: '', blank: sentence }
  const blank = chunks[chunks.length - 1]
  const visible = sentence.replace(blank, '').trim()
  return { visible, blank }
}

export default function PM6RSession({ session, onExit }) {
  const rounds = session.rounds
  const [rIdx,     setRIdx]     = useState(0)
  const [sIdx,     setSIdx]     = useState(0)
  const [count,    setCount]    = useState(0)   // 카운팅 버튼 횟수
  const [reveal,   setReveal]   = useState(false) // 꾹 누르기 정답 노출
  const [revealPct,setRevealPct]= useState(0)   // 0~100% 노출 진행
  const [showKo,   setShowKo]   = useState(true) // 한글 자막 토글
  const [sttScore, setSttScore] = useState(null)
  const [sttText,  setSttText]  = useState('')
  const [sttPhase, setSttPhase] = useState('idle') // idle|listening|result
  const audioRef   = useRef(null)
  const revealTimer= useRef(null)
  const { listening, start, stop, error: speechErr } = useSpeech()

  const round  = rounds[rIdx]
  const step   = round?.steps[sIdx]
  const rm     = ROUND_META[round?.round_type] || {}
  const isLast = round?.round_type === 'retrieval'

  const totalSteps = rounds.reduce((a,r) => a + r.steps.length, 0)
  const doneSteps  = rounds.slice(0,rIdx).reduce((a,r)=>a+r.steps.length,0) + sIdx
  const pct        = totalSteps ? Math.round(doneSteps/totalSteps*100) : 0

  // 스텝 변경 시 초기화 + 오디오 자동재생
  useEffect(() => {
    if (!step) return
    setCount(0); setReveal(false); setRevealPct(0)
    setSttScore(null); setSttText(''); setSttPhase('idle')
    if (step.step_type === 'listen' && step.audio_key) {
      playAudio(step.audio_key, advance)
    }
  }, [rIdx, sIdx])

  function playAudio(key, onEnd) {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    const a = new Audio(`/audio/${key}.mp3`)
    audioRef.current = a
    a.onended = onEnd || null
    a.onerror = () => onEnd?.()
    a.play().catch(() => onEnd?.())
  }

  function advance() {
    const r = rounds[rIdx]
    if (sIdx + 1 < r.steps.length) setSIdx(s => s+1)
    else if (rIdx + 1 < rounds.length) { setRIdx(r => r+1); setSIdx(0) }
    else setRIdx(-1) // 완료
  }

  // 카운팅 버튼
  function handleCount() {
    const next = count + 1
    setCount(next)
    if (step.audio_key) playAudio(step.audio_key)
    if (next >= (rm.target || 1)) {
      setTimeout(advance, 600)
    }
  }

  // 꾹 누르기 시작
  function startReveal() {
    setReveal(true)
    setRevealPct(0)
    let p = 0
    revealTimer.current = setInterval(() => {
      p += 2
      setRevealPct(Math.min(p, 100))
      if (p >= 100) clearInterval(revealTimer.current)
    }, 30)
  }

  function stopReveal() {
    clearInterval(revealTimer.current)
    setReveal(false)
    setRevealPct(0)
  }

  // P7 STT
  function handleSTT() {
    setSttPhase('listening')
    start((text) => {
      setSttText(text)
      const s = scoreMatch(text, step.expected_text || '')
      setSttScore(s)
      setSttPhase('result')
    })
  }

  if (rIdx === -1) return (
    <div className="done-screen">
      <p className="done-label">완료</p>
      <h1 className="done-title">PM6R</h1>
      <p className="done-sub">모든 라운드 완주!</p>
      <button className="exit-btn" onClick={onExit}>← 목록으로</button>
    </div>
  )

  if (!step) return null

  const needCount = step.step_type !== 'listen' && !isLast
  const needSTT   = step.step_type !== 'listen' && isLast
  const { visible, blank } = buildBlankText(step.sentence_text, step.chunks)
  const scoreColor = sttScore == null ? null : sttScore >= .8 ? '#a8ff78' : sttScore >= .5 ? '#ffdd57' : '#ff6b6b'

  return (
    <div className="session-shell">

      {/* Header */}
      <div className="session-header">
        <button className="exit-link" onClick={onExit}>← 나가기</button>
        <div className="round-badge" style={{color: rm.color}}>
          <span className="round-num-badge">{rm.num}</span>
          {rm.name}
        </div>
        <div className="header-right">
          {/* 한글 자막 토글 */}
          <button
            className={`ko-toggle ${showKo ? 'on' : 'off'}`}
            onClick={() => setShowKo(v => !v)}
            title="한글 자막 on/off"
          >
            가
          </button>
          <span className="step-counter">{pct}%</span>
        </div>
      </div>

      {/* Progress */}
      <div className="progress-track">
        <div className="progress-fill" style={{width:`${pct}%`}}/>
      </div>

      {/* Speaker */}
      <div className="speaker-row">
        <div className={`speaker-badge spk-${step.speaker}`}>Speaker {step.speaker}</div>
        <div className="step-type-label">{
          step.step_type === 'listen'   ? '▶ 듣기' :
          isLast                        ? '💭 인출' : '🎤 말하기'
        }</div>
      </div>

      {/* Main */}
      <div className="step-body">

        {/* LISTEN: 전체 문장 표시 */}
        {step.step_type === 'listen' && (
          <div className="sentence-en">{step.sentence_text}</div>
        )}

        {/* REPEAT/RECALL: 빈칸 처리 */}
        {step.step_type !== 'listen' && !isLast && (
          <div className="sentence-blank-wrap">
            {visible && <span className="sentence-visible">{visible} </span>}
            <span className="blank-area">
              {/* 꾹 누르기로 서서히 노출 */}
              <span className="blank-mask">___</span>
              <span
                className="blank-reveal"
                style={{clipPath: `inset(0 ${100-revealPct}% 0 0)`}}
              >{blank}</span>
            </span>
          </div>
        )}

        {/* P7 RETRIEVAL: 빈칸 전체 */}
        {isLast && step.step_type !== 'listen' && (
          <div className="sentence-blank-wrap">
            <span className="blank-area">
              <span className="blank-mask">___________</span>
              <span
                className="blank-reveal"
                style={{clipPath: `inset(0 ${100-revealPct}% 0 0)`}}
              >{step.sentence_text}</span>
            </span>
          </div>
        )}

        {/* 한글 자막 */}
        {showKo && step.translation && (
          <div className="sentence-ko">{step.translation}</div>
        )}

        {/* STT 결과 (P7) */}
        {sttScore != null && (
          <div className="score-row" style={{color: scoreColor}}>
            <span>{sttScore >= .8 ? '✓ 정확해요!' : sttScore >= .5 ? '△ 한 번 더!' : '✗ 다시 해봐요'}</span>
            <span className="score-pct">{Math.round(sttScore*100)}%</span>
            {sttText && <div className="spoken-text">"{sttText}"</div>}
          </div>
        )}

        {speechErr && <div className="speech-err">{speechErr}</div>}
      </div>

      {/* Actions */}
      <div className="action-area">

        {/* LISTEN: 다음 버튼 (자동재생 후 advance 호출되므로 수동도 제공) */}
        {step.step_type === 'listen' && (
          <div className="listen-actions">
            <button className="btn-replay" onClick={() => playAudio(step.audio_key)}>↺ 다시 듣기</button>
            <button className="btn-next-manual" onClick={advance}>다음 →</button>
          </div>
        )}

        {/* REPEAT/RECALL (P3~P6): 카운팅 버튼 + 꾹 누르기 힌트 */}
        {needCount && (
          <div className="count-area">
            <div className="count-display">
              {Array.from({length: rm.target || 1}).map((_,i) => (
                <div key={i} className={`count-dot ${i < count ? 'filled' : ''}`}/>
              ))}
            </div>
            <button className="btn-count" onClick={handleCount}>
              말했어요 +1
            </button>
            <button
              className="btn-hint"
              onMouseDown={startReveal}
              onMouseUp={stopReveal}
              onMouseLeave={stopReveal}
              onTouchStart={startReveal}
              onTouchEnd={stopReveal}
            >
              👁 꾹 눌러서 정답 보기
            </button>
          </div>
        )}

        {/* P7 RETRIEVAL: STT 버튼 + 꾹 누르기 힌트 */}
        {needSTT && (
          <div className="count-area">
            {sttPhase === 'idle' && (
              <button className="btn-stt" onClick={handleSTT}>🎤 말하고 채점받기</button>
            )}
            {sttPhase === 'listening' && (
              <button className="btn-stt active" onClick={stop}>⏹ 듣는 중...</button>
            )}
            {sttPhase === 'result' && (
              <button className="btn-next-manual" onClick={advance}>다음 →</button>
            )}
            <button
              className="btn-hint"
              onMouseDown={startReveal}
              onMouseUp={stopReveal}
              onMouseLeave={stopReveal}
              onTouchStart={startReveal}
              onTouchEnd={stopReveal}
            >
              👁 꾹 눌러서 정답 보기
            </button>
          </div>
        )}

        <button className="btn-skip" onClick={advance}>건너뛰기</button>
      </div>
    </div>
  )
}
