import React, { useState, useEffect, useRef } from 'react'
import FinalReview from './FinalReview'
import { sounds } from '../hooks/useBeep'
import './Player.css'

const SECTION_COLORS = {
  '전체 듣기': '#888',
  '전반부':    '#47c5ff',
  '후반부':    '#a78bfa',
  '문장 반복': '#fb923c',
  '역할극':    '#f472b6',
  '최종 점검': '#e8ff47',
}

export default function Player({ dialogueId, audioUrl, timelineUrl, title, onExit }) {
  const [timeline,   setTimeline]   = useState(null)
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [currentSec, setCurrentSec] = useState(0)
  const [playing,    setPlaying]    = useState(false)
  const [duration,   setDuration]   = useState(0)
  const [showKo,     setShowKo]     = useState(true)
  const [speed,      setSpeed]      = useState(1.0)
  const [loopRange,  setLoopRange]  = useState(null)
  const [loopActive, setLoopActive] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const audioRef    = useRef(null)
  const rafRef      = useRef(null)
  const prevSecRef  = useRef({ section: '', sentIdx: -1 })

  useEffect(() => {
    fetch(timelineUrl).then(r => r.json()).then(data => {
      setTimeline(data); setDuration(data.duration_sec)
    })
  }, [timelineUrl])

  useEffect(() => {
    function tick() {
      const a = audioRef.current
      if (!a) return
      const t = a.currentTime
      setCurrentSec(t)

      if (timeline) {
        // 현재 문장 인덱스
        const sentences = timeline.events.filter(e =>
          e.type === 'sentence' || e.type === 'final_check'
        )
        let idx = -1
        for (let i = 0; i < sentences.length; i++) {
          if (sentences[i].time_sec <= t) idx = i
        }

        // 문장 전환 효과음
        if (idx !== prevSecRef.current.sentIdx && idx >= 0) {
          sounds.sentence()
          prevSecRef.current.sentIdx = idx
        }
        setCurrentIdx(idx)

        // 섹션 전환 효과음
        const sections = timeline.events.filter(e => e.type === 'section')
        let curSection = ''
        for (const s of sections) {
          if (s.time_sec <= t) curSection = s.label
        }
        if (curSection !== prevSecRef.current.section && curSection) {
          sounds.section()
          prevSecRef.current.section = curSection
          // 역할극 섹션은 다른 소리
          if (curSection === '역할극') sounds.roleSwap()
        }

        // 음원 끝나면 최종 점검 유도
        if (t >= duration - 1 && duration > 0 && !playing) {
          sounds.done()
        }
      }

      // AB 루프
      if (loopActive && loopRange) {
        if (t >= loopRange.end) a.currentTime = loopRange.start
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [timeline, loopActive, loopRange, duration, playing])

  // 현재 문장 자동 스크롤
  useEffect(() => {
    const el = document.querySelector('.lyric-line.active')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentIdx])

  function togglePlay() {
    const a = audioRef.current
    if (!a) return
    playing ? a.pause() : a.play()
    setPlaying(!playing)
  }

  function seek(e) {
    const a = audioRef.current
    if (!a || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    a.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  function changeSpeed(s) {
    setSpeed(s)
    if (audioRef.current) audioRef.current.playbackRate = s
  }

  function setLoopPoint(type) {
    const t = audioRef.current?.currentTime || 0
    setLoopRange(prev => ({
      start: type === 'start' ? t : (prev?.start || 0),
      end:   type === 'end'   ? t : (prev?.end   || duration),
    }))
  }

  const pct      = duration ? (currentSec / duration) * 100 : 0
  const lyrics   = timeline?.events?.filter(e =>
    e.type === 'sentence' || e.type === 'final_check') || []
  const sections = timeline?.events?.filter(e => e.type === 'section') || []
  let currentSection = ''
  for (const s of sections) { if (s.time_sec <= currentSec) currentSection = s.label }
  const sectionColor = SECTION_COLORS[currentSection] || '#888'
  const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`

  // 원본 lines 추출 (최종 점검용)
  const reviewLines = timeline?.events
    ?.filter(e => e.type === 'sentence')
    ?.reduce((acc, e) => {
      if (!acc.find(l => l.text === e.text))
        acc.push({ speaker: e.speaker, text: e.text, translation: e.translation })
      return acc
    }, []) || []

  if (showReview) return (
    <FinalReview lines={reviewLines} onBack={() => setShowReview(false)} />
  )

  return (
    <div className="player-shell">
      {/* Header */}
      <div className="player-header">
        <button className="exit-link" onClick={onExit}>← 나가기</button>
        <div className="player-title">{title}</div>
        <button className={`ko-toggle ${showKo?'on':'off'}`} onClick={()=>setShowKo(v=>!v)}>가</button>
      </div>

      {/* 현재 섹션 */}
      <div className="section-indicator" style={{color: sectionColor}}>
        {currentSection}
      </div>

      {/* 가사 영역 — 스크롤 가능 */}
      <div className="lyrics-area">
        {lyrics.map((ev, i) => (
          <div
            key={i}
            className={`lyric-line ${i===currentIdx?'active':i<currentIdx?'past':'future'}`}
            onClick={() => { if(audioRef.current) audioRef.current.currentTime = ev.time_sec }}
          >
            <span className={`spk-dot spk-${ev.speaker}`}>{ev.speaker}</span>
            <div className="lyric-text-wrap">
              <div className="lyric-en">{ev.text}</div>
              {showKo && ev.translation && (
                <div className="lyric-ko">{ev.translation}</div>
              )}
            </div>
          </div>
        ))}

        {/* 최종 점검 진입 버튼 */}
        <div className="review-entry">
          <button className="btn-review" onClick={() => { audioRef.current?.pause(); setShowReview(true) }}>
            📝 최종 점검하기
          </button>
        </div>
      </div>

      {/* ── 고정 컨트롤 영역 ── */}
      <div className="controls">
        <div className="progress-bar" onClick={seek}>
          <div className="progress-fill" style={{width:`${pct}%`}}/>
          {loopRange && (
            <>
              <div className="loop-marker loop-start" style={{left:`${(loopRange.start/duration)*100}%`}}/>
              <div className="loop-marker loop-end"   style={{left:`${(loopRange.end/duration)*100}%`}}/>
            </>
          )}
        </div>
        <div className="time-row">
          <span>{fmt(currentSec)}</span>
          <span>{fmt(duration)}</span>
        </div>

        <div className="btn-row">
          <button className="btn-ctrl" onClick={()=>{if(audioRef.current)audioRef.current.currentTime-=10}}>−10s</button>
          <button className="btn-play-main" onClick={togglePlay}>{playing?'⏸':'▶'}</button>
          <button className="btn-ctrl" onClick={()=>{if(audioRef.current)audioRef.current.currentTime+=10}}>+10s</button>
        </div>

        <div className="options-row">
          <div className="speed-btns">
            {[0.75,1.0,1.25].map(s=>(
              <button key={s} className={`btn-speed ${speed===s?'active':''}`} onClick={()=>changeSpeed(s)}>{s}x</button>
            ))}
          </div>
          <div className="loop-btns">
            <button className="btn-loop-point" onClick={()=>setLoopPoint('start')}>A</button>
            <button className={`btn-loop-toggle ${loopActive?'active':''}`}
              onClick={()=>setLoopActive(v=>!v)} disabled={!loopRange}>↺</button>
            <button className="btn-loop-point" onClick={()=>setLoopPoint('end')}>B</button>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={()=>setPlaying(true)}
        onPause={()=>setPlaying(false)}
        onEnded={()=>setPlaying(false)}
        onLoadedMetadata={e=>setDuration(e.target.duration)}
      />
    </div>
  )
}
