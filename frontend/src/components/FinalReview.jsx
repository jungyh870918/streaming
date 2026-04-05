import React, { useState } from 'react'
import { useSpeech, scoreMatch } from '../hooks/useSpeech'
import './FinalReview.css'

// 단어 힌트: 문장을 단어 배열로 나누고 단계별로 보여줄 인덱스 선택
function getHintWords(text, level) {
  const words = text.split(' ')
  if (level === 0) return []
  // level 1: 첫 단어만, level 2: 1/3, level 3: 절반, level 4+: 전부
  const counts = [0, 1, Math.ceil(words.length/3), Math.ceil(words.length/2), words.length]
  const count  = counts[Math.min(level, counts.length-1)]
  // 균등 간격으로 단어 선택
  const step   = words.length / count
  const indices = new Set()
  for (let i = 0; i < count; i++) indices.add(Math.round(i * step))
  return [...indices]
}

function HintDisplay({ text, hintLevel, showAnswer }) {
  const words = text.split(' ')
  const hintIndices = new Set(getHintWords(text, hintLevel))

  if (showAnswer) {
    return <div className="hint-full-answer">{text}</div>
  }

  return (
    <div className="hint-word-row">
      {words.map((word, i) => (
        <span key={i} className="hint-word-wrap">
          {/* 실제 문장 위치 (투명 — 자리 확보용) */}
          <span className="hint-placeholder">{word}</span>
          {/* 힌트 단어 (해당 위치에만 노출) */}
          {hintIndices.has(i) && (
            <span className="hint-visible">{word}</span>
          )}
        </span>
      ))}
    </div>
  )
}

export default function FinalReview({ lines, onBack }) {
  const [idx,        setIdx]        = useState(0)
  const [hintLevel,  setHintLevel]  = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [sttPhase,   setSttPhase]   = useState('idle')
  const [sttScore,   setSttScore]   = useState(null)
  const [sttText,    setSttText]    = useState('')
  const [allScores,  setAllScores]  = useState([])
  const [done,       setDone]       = useState(false)
  const { start, stop, listening, error: speechErr } = useSpeech()

  const line     = lines[idx]
  const maxHint  = 4
  const scoreColor = sttScore == null ? null : sttScore >= .8 ? '#a8ff78' : sttScore >= .5 ? '#ffdd57' : '#ff6b6b'

  function next() {
    setAllScores(s => [...s, sttScore ?? 0])
    if (idx + 1 < lines.length) {
      setIdx(i => i+1)
      setHintLevel(0); setShowAnswer(false)
      setSttScore(null); setSttText(''); setSttPhase('idle')
    } else {
      setDone(true)
    }
  }

  function handleSTT() {
    setSttPhase('listening')
    start(text => {
      setSttText(text)
      const s = scoreMatch(text, line.text)
      setSttScore(s)
      setSttPhase('result')
    })
  }

  if (done) {
    const avg = allScores.length
      ? Math.round(allScores.reduce((a,b)=>a+b,0)/allScores.length*100) : 0
    return (
      <div className="review-done">
        <p className="done-label">최종 점검 완료</p>
        <div className="done-score">{avg}<span>%</span></div>
        <p className="done-sub">
          {avg >= 80 ? '완벽해요! 암기 완성 🎉' : avg >= 60 ? '잘 하고 있어요. 한 번 더 들어보세요.' : '음원을 다시 들어보세요.'}
        </p>
        <button className="btn-back" onClick={onBack}>← 다시 듣기</button>
      </div>
    )
  }

  return (
    <div className="review-shell">
      <div className="review-header">
        <button className="exit-link" onClick={onBack}>← 돌아가기</button>
        <span className="review-title">최종 점검</span>
        <span className="review-counter">{idx+1} / {lines.length}</span>
      </div>

      {/* 진행 바 */}
      <div className="review-progress">
        <div className="review-progress-fill" style={{width:`${(idx/lines.length)*100}%`}}/>
      </div>

      {/* 화자 */}
      <div className="review-speaker">
        <span className={`speaker-badge spk-${line.speaker}`}>Speaker {line.speaker}</span>
      </div>

      {/* 한글 큐 */}
      <div className="review-body">
        {line.translation && (
          <div className="review-ko">{line.translation}</div>
        )}

        {/* 힌트 표시 영역 */}
        <div className="hint-area">
          <HintDisplay
            text={line.text}
            hintLevel={hintLevel}
            showAnswer={showAnswer}
          />
        </div>

        {/* STT 결과 */}
        {sttScore != null && (
          <div className="review-score" style={{color: scoreColor}}>
            <span>{sttScore >= .8 ? '✓ 정확해요!' : sttScore >= .5 ? '△ 한 번 더!' : '✗ 다시 해봐요'}</span>
            <span className="score-pct">{Math.round(sttScore*100)}%</span>
            {sttText && <div className="spoken-text">"{sttText}"</div>}
          </div>
        )}
        {speechErr && <div className="speech-err">{speechErr}</div>}
      </div>

      {/* 힌트 버튼들 */}
      <div className="hint-controls">
        <div className="hint-btns">
          {[1,2,3,4].map(lv => (
            <button
              key={lv}
              className={`btn-hint-lv ${hintLevel >= lv ? 'active' : ''}`}
              onClick={() => { setHintLevel(lv); setShowAnswer(false) }}
            >
              힌트 {lv}
            </button>
          ))}
        </div>
        <button
          className={`btn-show-answer ${showAnswer ? 'active' : ''}`}
          onClick={() => setShowAnswer(v => !v)}
        >
          {showAnswer ? '답 숨기기' : '정답 보기'}
        </button>
      </div>

      {/* 말하기 버튼 */}
      <div className="review-actions">
        {sttPhase === 'idle' && (
          <button className="btn-stt" onClick={handleSTT}>🎤 말하기</button>
        )}
        {sttPhase === 'listening' && (
          <button className="btn-stt active" onClick={stop}>⏹ 듣는 중...</button>
        )}
        {sttPhase === 'result' && (
          <button className="btn-next" onClick={next}>
            {idx + 1 < lines.length ? '다음 문장 →' : '결과 보기'}
          </button>
        )}
        {sttPhase === 'idle' && idx > 0 && (
          <button className="btn-skip" onClick={next}>건너뛰기</button>
        )}
      </div>
    </div>
  )
}
