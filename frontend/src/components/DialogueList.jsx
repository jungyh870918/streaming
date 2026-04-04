import React, { useEffect, useState } from 'react'
import './DialogueList.css'

const TEMPLATE_OPTIONS = [
  { value: 'dialogue_memorization', label: '핵심 훈련', desc: '청크 반복 + 인출' },
  { value: 'chunked_repetition',    label: '워밍업',    desc: '청크별 따라말하기' },
  { value: 'cue_based_recall',      label: '고급 인출', desc: '한글 큐 → 영어' },
  { value: 'simple_repeat',         label: '입문',      desc: '듣고 따라말하기' },
]

export default function DialogueList({ onStart }) {
  const [dialogues, setDialogues] = useState([])
  const [selected, setSelected] = useState(null)
  const [template, setTemplate] = useState('dialogue_memorization')

  useEffect(() => {
    fetch('/api/dialogues').then(r=>r.json()).then(d => {
      setDialogues(d.dialogues)
      if (d.dialogues.length) setSelected(d.dialogues[0].id)
    })
  }, [])

  return (
    <div className="dialogue-list">
      <section className="section">
        <h2 className="section-title">다이얼로그 선택</h2>
        <div className="card-grid">
          {dialogues.map(d => (
            <button
              key={d.id}
              className={`dialogue-card ${selected === d.id ? 'active' : ''}`}
              onClick={() => setSelected(d.id)}
            >
              <span className="card-title">{d.title}</span>
              <span className="card-meta">{d.line_count} lines</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">훈련 방식</h2>
        <div className="template-grid">
          {TEMPLATE_OPTIONS.map(t => (
            <button
              key={t.value}
              className={`template-card ${template === t.value ? 'active' : ''}`}
              onClick={() => setTemplate(t.value)}
            >
              <span className="t-label">{t.label}</span>
              <span className="t-desc">{t.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="start-row">
        <button
          className="start-btn"
          disabled={!selected}
          onClick={() => onStart(selected, template)}
        >
          훈련 시작
        </button>
      </div>
    </div>
  )
}
