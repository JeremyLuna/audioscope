import createAudio, { getMic, getFileSource } from './audio'
import createDisplay from './display'

const AudioContext = window.AudioContext || window.webkitAudioContext
const canvas = document.getElementById('c')
const startup = document.getElementById('startup')
const micButton = document.getElementById('use-mic')
const fileButton = document.getElementById('use-file')
const fileInput = document.getElementById('file-input')

const N = 512

let audio = null
let display = null
let timer = null

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

function startLoop () {
  if (!audio || !display) {
    return
  }
  let lastTimeSampleIndex = -1
  let lastQuadSampleIndex = -1

  function loop () {
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
  const context = new AudioContext()
  startVisualization(getFileSource(context, file), context)
}

function onUseMic () {
  const context = new AudioContext()
  startVisualization(getMic(context), context)
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

if (module.hot) {
  module.hot.accept()

  module.hot.dispose(() => {
    window.cancelAnimationFrame(timer)
    if (audio && audio.getContext) {
      audio.getContext().close()
    }
  })
}
