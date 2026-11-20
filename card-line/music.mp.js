/**
 * 块 16 · 背景音乐（小程序）
 *
 * 小程序没有 Web Audio，只能用 InnerAudioContext 播一个**文件**。
 * 但工程里没有、也不该有 mp3：主包 2MB，一首歌就吃掉四分之一。
 *
 * 所以这里的策略是「有源就放，没源就不装」：
 *   theme.card.music.src 填了音频地址 → supported = true，正常播
 *   没填           → supported = false，页面连按钮都不画
 * 这样默认状态下用户不会看到一个点了没反应的喇叭，
 * 将来要放真音乐，只需要往主题里加一个 src，页面代码一行都不用改。
 */

/**
 * @param {{src?:string, loop?:boolean, volume?:number, onChange?:(playing:boolean)=>void}} opts
 */
export function createMusic(opts) {
  const cfg = opts || {}
  const src = typeof cfg.src === 'string' ? cfg.src.trim() : ''
  if (!src || typeof uni === 'undefined' || !uni.createInnerAudioContext) {
    return {
      supported: false,
      playing: false,
      start: () => false,
      stop: () => {},
      toggle: () => false,
      dispose: () => {}
    }
  }

  const onChange = typeof cfg.onChange === 'function' ? cfg.onChange : null
  const notify = () => {
    if (onChange) onChange(playing)
  }

  const audio = uni.createInnerAudioContext()
  audio.src = src
  audio.loop = cfg.loop !== false
  audio.volume = Number(cfg.volume) > 0 ? Number(cfg.volume) : 0.5
  let playing = false

  // 播放失败（链接失效、格式不支持）不能把页面搞崩，只把状态打回去
  audio.onError(() => {
    playing = false
    notify()
  })
  audio.onEnded(() => {
    if (!audio.loop) {
      playing = false
      notify()
    }
  })

  return {
    supported: true,
    get playing() {
      return playing
    },
    start() {
      try {
        audio.play()
        playing = true
        notify()
        return true
      } catch (e) {
        playing = false
        notify()
        return false
      }
    },
    stop() {
      try {
        audio.pause()
      } catch (e) {
        /* 忽略 */
      }
      playing = false
      notify()
    },
    toggle() {
      if (playing) this.stop()
      else this.start()
      return playing
    },
    dispose() {
      try {
        audio.destroy()
      } catch (e) {
        /* 忽略 */
      }
      playing = false
    }
  }
}
