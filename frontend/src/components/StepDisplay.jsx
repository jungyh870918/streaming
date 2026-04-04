import React from 'react'
import './StepDisplay.css'

const TYPE_META = {
  full_listen:      { icon: '▶', label: '듣기',        action: null },
  prompt_response:  { icon: '🎤', label: '따라 말하기', action: 'speak' },
  recall:           { icon: '💬', label: '인출하기',    action: 'speak' },
  full_recall:      { icon: '💭', label: '전체 인출',   action: 'speak' },
  gap:              { icon: '✏️', label: '빈칸 채우기',  action: 'speak' },
}

export default function StepDisplay({ step, score, listening, speechErr, onPlayAudio, onSpeak, onSkip, onStop }) {
  if (!step) return null
  const meta = TYPE_META[step.step_type] || TYPE_META.full_listen
  const needSpeak = meta.action === 'speak'

  const scoreColor = score == null ? null : score >= 0.8 ? '#a8ff78' : score >= 0.5 ? '#ffdd57' : '#ff6b6b'

  return (
    <div className="step-wrap">
      <div className="step-type-label">
        <span className="step-icon">{meta.icon}</span>
        {meta.label}
        {step.mode === 'translation_reveal' && ' · 한글 확인'}
      </div>

      {step.cue && (
        <div className="step-cue">{step.cue}</div>
      )}

      {step.visible_text && step.step_type !== 'recall' && (
        <div className={`step-text ${step.step_type === 'full_listen' ? 'primary' : 'secondary'}`}>
          {step.visible_text}
        </div>
      )}

      {score != null && (
        <div className="score-bar" style={{ color: scoreColor }}>
          {score >= 0.8 ? '✓ 정확해요!' : score >= 0.5 ? '△ 한 번 더!' : '✗ 다시 해봐요'}
          {' '}({Math.round(score * 100)}%)
        </div>
      )}

      {speechErr && <div className="speech-err">음성인식 오류: {speechErr}</div>}

      <div className="action-row">
        {step.audio_key && (
          <button className="btn-play" onClick={onPlayAudio} title="오디오 재생">
            ▶
          </button>
        )}

        {needSpeak ? (
          listening ? (
            <button className="btn-mic active" onClick={onStop}>⏹ 듣는 중...</button>
          ) : (
            <button className="btn-mic" onClick={onSpeak}>🎤 말하기</button>
          )
        ) : (
          <button className="btn-next" onClick={onSkip}>다음 →</button>
        )}

        <button className="btn-skip" onClick={onSkip}>건너뛰기</button>
      </div>
    </div>
  )
}
