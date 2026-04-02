import createAudio, { getMic, getFileSource } from './audio'
import createDisplay from './display'

const AudioContext = window.AudioContext || window.webkitAudioContext
const canvas = document.getElementById('c')
const startup = document.getElementById('startup')
const micButton = document.getElementById('use-mic')
const fileButton = document.getElementById('use-file')
const fileInput = document.getElementById('file-input')
const controls = document.getElementById('controls')
const playPauseButton = document.getElementById('play-pause')
const progressSlider = document.getElementById('progress-slider')
const volumeSlider = document.getElementById('volume-slider')
const timeLabel = document.getElementById('time-label')

const N = 512
const CONTROLS_HIDE_DELAY_MS = 3000

let audio = null
let display = null
let timer = null
let controlsHideTimer = null
let controlsEnabled = false
let pendingSeekTime = null
let isScrubbing = false

function hideStartup () {
  if (startup) {
    startup.style.display = 'none'
  }
}

function showStartup () {
  if (startup) {
    startup.style.display = 'flex'
  }
}

function formatTime (timeSeconds) {
  const seconds = Math.max(0, Math.floor(timeSeconds || 0))
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function clearControlsHideTimer () {
  if (controlsHideTimer) {
    window.clearTimeout(controlsHideTimer)
    controlsHideTimer = null
  }
}

function showControls () {
  if (!controls || !controlsEnabled) {
    return
  }

  controls.classList.remove('controls--hidden')
}

function hideControls () {
  if (!controls || !controlsEnabled) {
    return
  }

  controls.classList.add('controls--hidden')
}

function armControlsAutoHide () {
  if (!controlsEnabled) {
    return
  }

  clearControlsHideTimer()
  controlsHideTimer = window.setTimeout(() => {
    hideControls()
  }, CONTROLS_HIDE_DELAY_MS)
}

function onActivity () {
  if (!controlsEnabled) {
    return
  }

  showControls()
  armControlsAutoHide()
}

function setControlsEnabled (enabled) {
  controlsEnabled = enabled
  pendingSeekTime = null
  isScrubbing = false

  if (!controls) {
    return
  }

  if (enabled) {
    controls.classList.remove('controls--off')
    showControls()
    armControlsAutoHide()
  } else {
    clearControlsHideTimer()
    controls.classList.add('controls--off')
    controls.classList.add('controls--hidden')
  }
}

function setPlayPauseLabel () {
  if (!playPauseButton || !audio || !audio.isFileSource()) {
    return
  }

  playPauseButton.textContent = audio.isPlayingFile() ? 'Pause' : 'Play'
}

function updateTimeAndProgressUI (positionSeconds, durationSeconds) {
  if (!controlsEnabled || !timeLabel || !progressSlider) {
    return
  }

  const duration = Math.max(0, durationSeconds || 0)
  const position = Math.max(0, positionSeconds || 0)
  timeLabel.textContent = `${formatTime(position)} / ${formatTime(duration)}`

  if (!isScrubbing) {
    if (duration > 0) {
      progressSlider.value = String(Math.floor((position / duration) * 1000))
    } else {
      progressSlider.value = '0'
    }
  }
}

function refreshControlsUI () {
  if (!audio || !audio.isFileSource()) {
    return
  }

  const duration = audio.getDuration()
  const position = pendingSeekTime != null ? pendingSeekTime : audio.getPlaybackTime()

  updateTimeAndProgressUI(position, duration)
  setPlayPauseLabel()
}

function cleanupSession () {
  window.cancelAnimationFrame(timer)
  timer = null
  clearControlsHideTimer()

  if (audio && audio.getContext) {
    audio.getContext().close()
  }

  audio = null
  display = null
  setControlsEnabled(false)
}

function startLoop () {
  if (!audio || !display) {
    return
  }
  let lastTimeSampleIndex = -1
  let lastQuadSampleIndex = -1

  function loop () {
    refreshControlsUI()

    const timeSampleIndex = audio.getTimeSampleIndex()
    const quadSampleIndex = audio.getQuadSampleIndex()

    if (timeSampleIndex === lastTimeSampleIndex && quadSampleIndex === lastQuadSampleIndex) {
      timer = window.requestAnimationFrame(loop)
      return
    }

    const samplesX = audio.getTimeSamples()
    const samplesY = audio.getQuadSamples()

    display.draw(samplesX, samplesY)
    lastTimeSampleIndex = timeSampleIndex
    lastQuadSampleIndex = quadSampleIndex

    timer = window.requestAnimationFrame(loop)
  }

  loop()
}

async function startVisualization (sourcePromise, context) {
  try {
    audio = await createAudio(N, sourcePromise, context)
    display = createDisplay(canvas, N)
    if (audio.isFileSource()) {
      setControlsEnabled(true)
      refreshControlsUI()
    } else {
      setControlsEnabled(false)
    }
    hideStartup()
    startLoop()
  } catch (err) {
    console.error(err)
    window.alert('Unable to initialize audio source.')
    showStartup()
  }
}

function onFileSelected (event) {
  const files = event.target.files
  if (!files || files.length === 0) {
    return
  }

  const file = files[0]
  cleanupSession()
  const context = new AudioContext()
  startVisualization(getFileSource(context, file), context)
}

function onUseMic () {
  cleanupSession()
  const context = new AudioContext()
  startVisualization(getMic(context), context)
}

function commitPendingSeek () {
  if (!audio || !audio.isFileSource() || pendingSeekTime == null) {
    return
  }

  audio.seekFile(pendingSeekTime)
  pendingSeekTime = null
  isScrubbing = false
  refreshControlsUI()
}

if (micButton) {
  micButton.addEventListener('click', onUseMic)
}

if (fileButton) {
  fileButton.addEventListener('click', () => fileInput.click())
}

if (fileInput) {
  fileInput.addEventListener('change', onFileSelected)
}

if (playPauseButton) {
  playPauseButton.addEventListener('click', () => {
    if (!audio || !audio.isFileSource()) {
      return
    }

    if (audio.isPlayingFile()) {
      audio.pauseFile()
    } else {
      audio.resumeFile()
    }

    setPlayPauseLabel()
    onActivity()
  })
}

if (progressSlider) {
  progressSlider.addEventListener('input', () => {
    if (!audio || !audio.isFileSource()) {
      return
    }

    const duration = audio.getDuration()
    const ratio = Number(progressSlider.value) / 1000
    pendingSeekTime = ratio * duration
    isScrubbing = true
    updateTimeAndProgressUI(pendingSeekTime, duration)
    onActivity()
  })

  progressSlider.addEventListener('change', commitPendingSeek)
  progressSlider.addEventListener('pointerup', commitPendingSeek)
  progressSlider.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End' || event.key === 'PageUp' || event.key === 'PageDown') {
      commitPendingSeek()
    }
  })
}

if (volumeSlider) {
  volumeSlider.addEventListener('input', () => {
    if (!audio) {
      return
    }

    audio.setVolume(Number(volumeSlider.value) / 100)
    onActivity()
  })
}

window.addEventListener('mousemove', onActivity)
window.addEventListener('mousedown', onActivity)
window.addEventListener('touchstart', onActivity, { passive: true })
window.addEventListener('touchmove', onActivity, { passive: true })
window.addEventListener('keydown', onActivity)

if (module.hot) {
  module.hot.accept()

  module.hot.dispose(() => {
    cleanupSession()
  })
}
