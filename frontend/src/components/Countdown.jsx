import React, { useState, useEffect } from 'react'
import './Countdown.css'

export default function Countdown({ seconds, onDone, onSkip }) {
  const [left, setLeft] = useState(seconds)

  useEffect(() => {
    if (left <= 0) { onDone?.(); return }
    const t = setTimeout(() => setLeft(l => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left])

  const pct = ((seconds - left) / seconds) * 100

  return (
    <div className="countdown-wrap">
      <svg className="countdown-ring" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="26" className="ring-bg"/>
        <circle
          cx="30" cy="30" r="26"
          className="ring-fill"
          style={{
            strokeDasharray: `${2 * Math.PI * 26}`,
            strokeDashoffset: `${2 * Math.PI * 26 * (1 - pct/100)}`,
          }}
        />
      </svg>
      <div className="countdown-num">{left}</div>
      <button className="btn-skip-countdown" onClick={onSkip}>지금 말하기</button>
    </div>
  )
}
