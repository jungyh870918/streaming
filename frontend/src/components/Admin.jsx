import React, { useState, useEffect } from 'react'
import './Admin.css'

const SPEAKERS = ['A', 'B']

function EmptyLine() {
  return { speaker: 'A', text: '', translation: '' }
}

export default function Admin({ onClose }) {
  const [dialogues, setDialogues]   = useState([])
  const [tab,       setTab]         = useState('list')  // list | create
  const [form,      setForm]        = useState({ id: '', title: '', lines: [EmptyLine(), EmptyLine()] })
  const [generating, setGenerating] = useState({})
  const [msg,        setMsg]        = useState(null)

  useEffect(() => { loadList() }, [])

  async function loadList() {
    const r = await fetch('/api/admin/dialogues')
    const d = await r.json()
    setDialogues(d.dialogues)
  }

  async function handleGenerate(id, force=false) {
    setGenerating(g => ({...g, [id]: true}))
    setMsg(null)
    try {
      const r = await fetch(`/api/admin/dialogues/${id}/generate?force=${force}`, {method:'POST'})
      const d = await r.json()
      setMsg(`✓ ${id} 음원 생성 완료 (${d.duration_sec}초)`)
      loadList()
    } catch(e) {
      setMsg(`✗ 오류: ${e.message}`)
    } finally {
      setGenerating(g => ({...g, [id]: false}))
    }
  }

  async function handleDelete(id) {
    if (!confirm(`"${id}" 를 삭제할까요?`)) return
    await fetch(`/api/admin/dialogues/${id}`, {method:'DELETE'})
    setMsg(`✓ ${id} 삭제됨`)
    loadList()
  }

  async function handleCreate(e) {
    e.preventDefault()
    const lines = form.lines.filter(l => l.text.trim())
    if (!form.id || !form.title || lines.length < 2) {
      setMsg('✗ ID, 제목, 최소 2줄 이상 입력해주세요.')
      return
    }
    const r = await fetch('/api/admin/dialogues', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({...form, lines})
    })
    if (r.ok) {
      setMsg(`✓ "${form.title}" 추가됨. 음원 생성을 눌러주세요.`)
      setForm({id:'', title:'', lines:[EmptyLine(), EmptyLine()]})
      setTab('list')
      loadList()
    } else {
      const d = await r.json()
      setMsg(`✗ ${d.detail}`)
    }
  }

  function addLine() {
    setForm(f => ({...f, lines: [...f.lines, EmptyLine()]}))
  }

  function removeLine(i) {
    setForm(f => ({...f, lines: f.lines.filter((_,idx)=>idx!==i)}))
  }

  function updateLine(i, field, val) {
    setForm(f => {
      const lines = [...f.lines]
      lines[i] = {...lines[i], [field]: val}
      return {...f, lines}
    })
  }

  function fmt(s) {
    if (!s) return '-'
    const m = Math.floor(s/60), sec = Math.floor(s%60)
    return `${m}:${String(sec).padStart(2,'0')}`
  }

  return (
    <div className="admin-overlay">
      <div className="admin-panel">
        <div className="admin-header">
          <h2>관리자</h2>
          <button className="admin-close" onClick={onClose}>✕</button>
        </div>

        {msg && (
          <div className={`admin-msg ${msg.startsWith('✓') ? 'ok' : 'err'}`}>
            {msg}
          </div>
        )}

        <div className="admin-tabs">
          <button className={tab==='list'?'active':''} onClick={()=>setTab('list')}>다이얼로그 목록</button>
          <button className={tab==='create'?'active':''} onClick={()=>setTab('create')}>새로 추가</button>
        </div>

        {/* 목록 탭 */}
        {tab === 'list' && (
          <div className="admin-list">
            {dialogues.length === 0 && <p className="empty">다이얼로그가 없습니다.</p>}
            {dialogues.map(d => (
              <div key={d.id} className="admin-item">
                <div className="item-info">
                  <span className="item-title">{d.title}</span>
                  <span className="item-meta">{d.id} · {d.line_count}줄</span>
                </div>
                <div className="item-status">
                  {d.audio_ready
                    ? <span className="badge-ready">✓ {fmt(d.duration_sec)}</span>
                    : <span className="badge-pending">미생성</span>
                  }
                </div>
                <div className="item-actions">
                  <button
                    className="btn-gen"
                    disabled={generating[d.id]}
                    onClick={() => handleGenerate(d.id, d.audio_ready)}
                  >
                    {generating[d.id] ? '생성 중...' : d.audio_ready ? '재생성' : '음원 생성'}
                  </button>
                  <button className="btn-del" onClick={() => handleDelete(d.id)}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 추가 탭 */}
        {tab === 'create' && (
          <form className="admin-form" onSubmit={handleCreate}>
            <div className="form-row">
              <label>ID <span className="hint">(영문, 언더스코어)</span></label>
              <input
                value={form.id}
                onChange={e=>setForm(f=>({...f,id:e.target.value.replace(/\s/g,'_')}))}
                placeholder="예: shoe_shopping"
              />
            </div>
            <div className="form-row">
              <label>제목</label>
              <input
                value={form.title}
                onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                placeholder="예: Shoe Shopping"
              />
            </div>

            <div className="form-lines-header">
              <label>대화 라인</label>
              <button type="button" className="btn-add-line" onClick={addLine}>+ 줄 추가</button>
            </div>

            <div className="form-lines">
              {form.lines.map((line, i) => (
                <div key={i} className="form-line">
                  <select
                    value={line.speaker}
                    onChange={e=>updateLine(i,'speaker',e.target.value)}
                    className="spk-select"
                  >
                    {SPEAKERS.map(s=><option key={s}>{s}</option>)}
                  </select>
                  <div className="line-texts">
                    <input
                      value={line.text}
                      onChange={e=>updateLine(i,'text',e.target.value)}
                      placeholder="영어 문장"
                    />
                    <input
                      value={line.translation}
                      onChange={e=>updateLine(i,'translation',e.target.value)}
                      placeholder="한글 번역 (선택)"
                      className="ko-input"
                    />
                  </div>
                  <button type="button" className="btn-remove-line" onClick={()=>removeLine(i)}>✕</button>
                </div>
              ))}
            </div>

            <button type="submit" className="btn-submit">저장</button>
          </form>
        )}
      </div>
    </div>
  )
}
