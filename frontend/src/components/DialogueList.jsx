import React, { useEffect, useState } from 'react'
import './DialogueList.css'

export default function DialogueList({ onStart }) {
  const [dialogues, setDialogues] = useState([])
  const [selected,  setSelected]  = useState(null)

  useEffect(() => {
    fetch('/api/dialogues').then(r => r.json()).then(d => {
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
              {d.audio_ready && <span className="ready-badge">✓ 준비됨</span>}
            </button>
          ))}
        </div>
      </section>

      <div className="method-info">
        <h3>PM6R 훈련 구조</h3>
        <div className="round-list">
          {[
            ['1','전체 듣기',      '전체 다이얼로그 2회 재생'],
            ['2','분할 듣기',      '전반부 / 후반부 나눠서 2회씩'],
            ['3','문장 반복',      '각 문장 3회 반복 + 따라말하기 텀'],
            ['4','역할극',         'A/B 역할 번갈아 수행'],
            ['5','최종 점검',      '혼자 말하고 정답 확인'],
          ].map(([num, name, desc]) => (
            <div key={num} className="round-item">
              <span className="round-num">{num}</span>
              <span className="round-name">{name}</span>
              <span className="round-desc">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="start-row">
        <button className="start-btn" disabled={!selected} onClick={() => onStart(selected)}>
          훈련 시작
        </button>
      </div>
    </div>
  )
}
