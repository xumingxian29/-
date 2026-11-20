/**
 * 块 16 · 背景音乐（H5）
 *
 * 为什么不用 mp3：
 *   1. 版权 —— 市面上的圣诞歌几乎都在版权保护期，贴进网页是侵权；
 *   2. 体积 —— 一首 30 秒 mp3 就 500KB 起，为了一个开关不值；
 *   3. 小程序 2MB 主包限制，塞音频进去是自杀。
 * 所以这里**用 Web Audio 现场合成**：音符是数据，音色是振荡器，
 * 默认曲目《圣诞快乐》用的是 1857 年的铃儿响叮当副歌（公有领域）。
 *
 * 一条硬约束：浏览器禁止无用户手势的自动播放。
 * 所以「默认播放」的真实含义是 —— 页面一进来就尝试 start()，
 * 被拦下时保持"想播"的状态，用户第一次触摸/按键立刻接上。
 * 这也是页面里 setMusicOn 与 musicPlaying 要分开两个状态的原因。
 */

/** 音名 → 半音偏移 */
const STEP_OF = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/**
 * 音名转频率。A4 = 440Hz，十二平均律。
 * @param {string} name 形如 'C4' / 'F#5'
 */
export function noteFreq(name) {
  const m = /^([A-G])(#?)(\d)$/.exec(String(name || ''))
  if (!m) return 0
  const midi = STEP_OF[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) + 1) * 12
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/**
 * 《圣诞快乐》主旋律
 *
 * 铃儿响叮当的副歌，[音名, 拍数]。
 * 只取副歌 28 拍：主歌太长，循环起来像卡带。
 */
export const MELODY = [
  ['E4', 1], ['E4', 1], ['E4', 2],
  ['E4', 1], ['E4', 1], ['E4', 2],
  ['E4', 1], ['G4', 1], ['C4', 1.5], ['D4', 0.5], ['E4', 4],

  ['F4', 1], ['F4', 1], ['F4', 1.5], ['F4', 0.5],
  ['F4', 1], ['E4', 1], ['E4', 1], ['E4', 0.5], ['E4', 0.5],
  ['E4', 1], ['D4', 1], ['D4', 1], ['E4', 1], ['D4', 2], ['G4', 2]
]

/** 一轮循环多少拍（自测用：用来算时长、判断有没有写坏的音符） */
export function melodyBeats(melody) {
  const list = melody || MELODY
  return list.reduce((sum, n) => sum + (Number(n[1]) || 0), 0)
}

/**
 * 一个铃铛音
 *
 * 两个振荡器叠：三角波定音高，高八度正弦做"金属亮光"。
 * 衰减用 exponentialRamp，指数曲线听感才像敲击，线性会像风琴。
 */
function strike(ctx, dest, f, at, dur) {
  const env = ctx.createGain()
  env.connect(dest)
  env.gain.setValueAtTime(0.0001, at)
  env.gain.linearRampToValueAtTime(0.9, at + 0.012)
  env.gain.exponentialRampToValueAtTime(0.0008, at + Math.min(Math.max(dur * 0.9, 0.18), 0.7))

  const body = ctx.createOscillator()
  body.type = 'triangle'
  body.frequency.setValueAtTime(f, at)

  const shine = ctx.createOscillator()
  shine.type = 'sine'
  // 微微失谐，才有"两片金属"的拍频感；正好 2 倍会听起来像电子琴
  shine.frequency.setValueAtTime(f * 2.01, at)
  const shineGain = ctx.createGain()
  shineGain.gain.setValueAtTime(0.34, at)

  body.connect(env)
  shine.connect(shineGain)
  shineGain.connect(env)

  const stopAt = at + Math.max(dur, 0.2) + 0.1
  body.start(at)
  shine.start(at)
  body.stop(stopAt)
  shine.stop(stopAt)
}

/**
 * 造一个播放器
 *
 * @param {{tempo?:number, volume?:number, onChange?:(playing:boolean)=>void}} opts
 * @returns {{supported:boolean, playing:boolean, start:Function, stop:Function, toggle:Function, dispose:Function}}
 */
export function createMusic(opts) {
  const cfg = opts || {}
  const tempo = Number(cfg.tempo) > 0 ? Number(cfg.tempo) : 120
  const volume = Number(cfg.volume) > 0 ? Number(cfg.volume) : 0.18
  const onChange = typeof cfg.onChange === 'function' ? cfg.onChange : null
  const beat = 60 / tempo

  let ctx = null
  let master = null
  let timer = null
  let step = 0
  let nextAt = 0
  let playing = false
  let disposed = false
  /** 用户的意愿。resume 还没落地时，靠它决定"接上之后要不要真的开始" */
  let want = false

  function notify() {
    if (onChange) onChange(playing)
  }

  function ensureCtx() {
    if (ctx) return ctx
    if (typeof window === 'undefined') return null
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    try {
      ctx = new AC()
    } catch (e) {
      return null
    }
    master = ctx.createGain()
    master.gain.setValueAtTime(0.0001, ctx.currentTime)
    master.connect(ctx.destination)
    return ctx
  }

  /** 提前 0.7 秒排好音符：setInterval 的抖动不会让节奏发抖 */
  function schedule() {
    if (!ctx || !playing) return
    const horizon = ctx.currentTime + 0.7
    let guard = 0
    while (nextAt < horizon && guard < 64) {
      guard++
      const note = MELODY[step % MELODY.length]
      const dur = (Number(note[1]) || 1) * beat
      const f = noteFreq(note[0])
      if (f) strike(ctx, master, f, nextAt, dur)
      nextAt += dur
      step++
    }
  }

  /** 真正开始排期。只有 AudioContext 已经是 running 才调用 */
  function begin() {
    if (disposed || playing || !ctx) return
    playing = true
    step = 0
    nextAt = ctx.currentTime + 0.08
    const now = ctx.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now)
    master.gain.linearRampToValueAtTime(volume, now + 0.8)
    if (timer) clearInterval(timer)
    timer = setInterval(schedule, 120)
    schedule()
    notify()
  }

  /**
   * 起播
   *
   * 难点全在自动播放策略：没有用户手势时 AudioContext 是 suspended，
   * 而 resume() 是**异步**的 —— 同步读 ctx.state 一定是 suspended。
   * 所以这里不能"resume 完就立刻排期"，只能把意愿记在 want 里，
   * 等 Promise 落地再 begin()，并回头通知页面更新按钮。
   *
   * @returns {boolean} 此刻是否已经在响（还没落地时为 false，不代表失败）
   */
  function start() {
    if (disposed || !ensureCtx()) return false
    want = true
    if (playing) return true

    if (ctx.state === 'running') {
      begin()
      return playing
    }

    if (ctx.resume) {
      const p = ctx.resume()
      if (p && typeof p.then === 'function') {
        p.then(() => {
          if (!disposed && want) begin()
        }).catch(() => {
          /* 被策略拒绝：保持静音，等下一次手势 */
        })
      }
    }
    return false
  }

  function stop() {
    want = false
    if (!playing) return
    playing = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    if (ctx && master) {
      const now = ctx.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now)
      // 渐变而不是直接切 0：直接切会"咔"一声
      master.gain.linearRampToValueAtTime(0.0001, now + 0.35)
    }
    notify()
  }

  /**
   * 切到后台就挂起
   *
   * 不挂起的后果不是"还在响"，而是"回来时节奏乱掉"：
   * 浏览器会节流定时器，音符全部堆在同一时刻播。
   * resume 同样是异步的，必须在 Promise 落地后再排期。
   */
  function onVisibility() {
    if (typeof document === 'undefined' || !playing) return

    if (document.hidden) {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      if (ctx && ctx.suspend) ctx.suspend()
      return
    }

    if (!ctx) return
    const restart = () => {
      if (!ctx || !playing || document.hidden) return
      nextAt = ctx.currentTime + 0.15
      if (!timer) timer = setInterval(schedule, 120)
      schedule()
    }
    const p = ctx.resume ? ctx.resume() : null
    if (p && typeof p.then === 'function') p.then(restart).catch(() => {})
    else restart()
  }

  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', onVisibility)
  }

  return {
    supported: true,
    get playing() {
      return playing
    },
    start,
    stop,
    toggle() {
      if (playing) stop()
      else start()
      return playing
    },
    dispose() {
      disposed = true
      stop()
      if (typeof document !== 'undefined' && document.removeEventListener) {
        document.removeEventListener('visibilitychange', onVisibility)
      }
      if (ctx && ctx.close) {
        try {
          ctx.close()
        } catch (e) {
          /* 忽略 */
        }
      }
      ctx = null
      master = null
    }
  }
}
