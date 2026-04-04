import React from 'react'
import './ProgressBar.css'

export default function ProgressBar({ value, max }) {
  const pct = max ? Math.round((value / max) * 100) : 0
  return (
    <div className="progress-wrap">
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-pct">{pct}%</span>
    </div>
  )
}
