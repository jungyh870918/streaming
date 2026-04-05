// Web Audio API로 효과음 생성 (파일 불필요)
let _ctx = null
function ctx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)()
  return _ctx
}

function beep({ freq = 880, duration = 0.08, gain = 0.15, type = 'sine' } = {}) {
  try {
    const c = ctx()
    const osc = c.createOscillator()
    const g   = c.createGain()
    osc.connect(g); g.connect(c.destination)
    osc.type      = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(gain, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
    osc.start(); osc.stop(c.currentTime + duration)
  } catch(e) {}
}

export const sounds = {
  section:  () => beep({ freq: 660,  duration: 0.12, gain: 0.12 }),  // 섹션 전환
  sentence: () => beep({ freq: 1100, duration: 0.06, gain: 0.08 }),  // 문장 전환
  roleSwap: () => { beep({ freq: 550, duration: 0.08, gain: 0.1 }); setTimeout(()=>beep({freq:770,duration:0.08,gain:0.1}),100) },
  done:     () => { beep({freq:660,duration:0.1,gain:0.12}); setTimeout(()=>beep({freq:880,duration:0.15,gain:0.12}),120) },
}
