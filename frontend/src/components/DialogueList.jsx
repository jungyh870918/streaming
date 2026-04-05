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
            </button>
          ))}
        </div>
      </section>

      <div className="method-info">
        <h3>PM6R 훈련 방식</h3>
        <div className="round-list">
          {[
            ['P2','Memorization','3회 반복 듣기 + 한글 확인'],
            ['P3','Repetition',  '청크별 듣고 바로 따라말하기'],
            ['P4','Reflection',  '텍스트 보며 5초 후 말하기'],
            ['P5','Rehearsal',   '대화 흐름 속 10초 후 말하기'],
            ['P6','Recital',     '한글만 보고 15초 후 말하기'],
            ['P7','Retrieval',   '한글 큐만 보고 25초 완전 인출'],
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
