// http://stackoverflow.com/questions/4723213/detect-http-or-https-then-force-https-in-javascript
if (document.location.hostname !== 'localhost' && window.location.protocol !== 'https:') {
  window.location.href = 'https:' + window.location.href.substring(window.location.protocol.length)
}
const AudioContext = window.AudioContext || window.webkitAudioContext
import sampleExtractorWorkletUrl from './sample-extractor.worklet.js'

const loadedWorkletContexts = new WeakSet()

export function getMic (context) {
  const constraints = {
    audio: {
      channelCount: 2,
      echoCancellation: false,
      autoGainControl: false,
      noiseSuppression: false,
      highpassFilter: false
    },
    video: false
  }

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    return navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => context.createMediaStreamSource(stream))
  }

  const getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia
  if (!getUserMedia) {
    return Promise.reject(new Error('getUserMedia is not supported in this browser'))
  }

  return new Promise((resolve, reject) => {
    getUserMedia.call(navigator, constraints, stream => {
      resolve(context.createMediaStreamSource(stream))
    }, reject)
  })
}

export async function getFileSource (context, file) {
  const arrayBuffer = await file.arrayBuffer()
  const audioBuffer = await new Promise((resolve, reject) => {
    context.decodeAudioData(arrayBuffer, resolve, reject)
  })

  return {
    kind: 'file',
    buffer: audioBuffer
  }
}

// const FFT_SIZE = 1024 // guessing webaudio will choose this length
function createHilbertFilter (context, N) {
  let filterLength = 768
  // let filterLength = FFT_SIZE - N
  if (filterLength % 2 === 0) {
    filterLength -= 1
  }
  let impulse = new Float32Array(filterLength)

  let mid = ((filterLength - 1) / 2) | 0

  for (let i = 0; i <= mid; i++) {
    // hamming window
    let k = 0.53836 + 0.46164 * Math.cos(i * Math.PI / (mid + 1))
    if (i % 2 === 1) {
      let im = 2 / Math.PI / i
      impulse[mid + i] = k * im
      impulse[mid - i] = k * -im
    }
  }

  let impulseBuffer = context.createBuffer(2, filterLength, context.sampleRate)
  impulseBuffer.copyToChannel(impulse, 0)
  impulseBuffer.copyToChannel(impulse, 1)
  let hilbert = context.createConvolver()
  hilbert.normalize = false
  hilbert.buffer = impulseBuffer

  let delayTime = mid / context.sampleRate
  let delay = context.createDelay(delayTime)
  delay.delayTime.value = delayTime

  return [delay, hilbert]
}


async function createSampleExtractorNode(context, buffer, N) {
  function appendSamples(target, samples) {
    const sampleCount = samples.length

    if (sampleCount >= N) {
      target.set(samples.subarray(sampleCount - N))
      return
    }

    target.copyWithin(0, sampleCount)
    target.set(samples, N - sampleCount)
  }

  let latestSampleIndex = 0

  // Load the worklet module once per AudioContext.
  if (!loadedWorkletContexts.has(context)) {
    await context.audioWorklet.addModule(sampleExtractorWorkletUrl)
    loadedWorkletContexts.add(context)
  }
  const node = new AudioWorkletNode(context, 'sample-extractor', {
    processorOptions: { bufferSize: N }
  })
  node.port.onmessage = (event) => {
    if (event.data.type === 'samples') {
      appendSamples(buffer, event.data.samples)
      latestSampleIndex = event.data.sampleIndex || (latestSampleIndex + event.data.samples.length)
    }
  }
  node.getSampleIndex = () => latestSampleIndex
  return node
}

export default async function createAudio (N, sourcePromise, context = new AudioContext()) {
  const timeSamples = new Float32Array(N)
  const quadSamples = new Float32Array(N)

  const [delay, hilbert] = createHilbertFilter(context, N)
  const time = await createSampleExtractorNode(context, timeSamples, N)
  const quad = await createSampleExtractorNode(context, quadSamples, N)
  const gain = context.createGain()
  gain.gain.value = 1

  const sourceInfo = await sourcePromise
  const fileBuffer = sourceInfo && sourceInfo.kind === 'file' ? sourceInfo.buffer : null
  const streamInput = !fileBuffer ? sourceInfo : null

  let fileSource = null
  let fileOffsetSeconds = 0
  let fileStartContextTime = 0
  let filePlaying = false

  function connectGraph (inputNode) {
    // Analysis branch: bypass gain so visualization is unaffected by the volume slider
    inputNode.connect(delay)
    inputNode.connect(hilbert)
    // Playback branch: through gain to speakers (skipped for mic input to avoid feedback)
    if (fileBuffer) {
      inputNode.connect(gain)
    }
  }

  function createAndStartFileSource (offsetSeconds) {
    if (!fileBuffer) {
      return
    }

    const duration = fileBuffer.duration || 0
    if (duration <= 0) {
      return
    }

    const normalizedOffset = ((offsetSeconds % duration) + duration) % duration
    const source = context.createBufferSource()
    source.buffer = fileBuffer
    source.loop = true
    connectGraph(source)
    source.start(0, normalizedOffset)

    fileSource = source
    fileOffsetSeconds = normalizedOffset
    fileStartContextTime = context.currentTime
    filePlaying = true
  }

  function stopFileSource () {
    if (!fileSource) {
      return
    }

    try {
      fileSource.stop()
    } catch (err) {
      // Ignore stop() on an already-stopped source.
    }
    fileSource.disconnect()
    fileSource = null
  }

  hilbert.connect(time)
  delay.connect(quad)
  gain.connect(context.destination)

  if (fileBuffer) {
    createAndStartFileSource(0)
  } else {
    connectGraph(streamInput)
  }

  function getFileDuration () {
    return fileBuffer ? fileBuffer.duration : 0
  }

  function isFileSource () {
    return !!fileBuffer
  }

  function getPlaybackTime () {
    if (!fileBuffer) {
      return 0
    }

    const duration = getFileDuration()
    if (duration <= 0) {
      return 0
    }

    if (!filePlaying) {
      return fileOffsetSeconds
    }

    const elapsed = context.currentTime - fileStartContextTime
    return (fileOffsetSeconds + elapsed) % duration
  }

  function pauseFile () {
    if (!fileBuffer || !filePlaying) {
      return
    }

    fileOffsetSeconds = getPlaybackTime()
    filePlaying = false
    stopFileSource()
  }

  function resumeFile () {
    if (!fileBuffer || filePlaying) {
      return
    }

    createAndStartFileSource(fileOffsetSeconds)
  }

  function seekFile (timeSeconds) {
    if (!fileBuffer) {
      return
    }

    const duration = getFileDuration()
    const clamped = Math.max(0, Math.min(duration, timeSeconds || 0))

    if (duration <= 0) {
      fileOffsetSeconds = 0
      return
    }

    if (filePlaying) {
      stopFileSource()
      createAndStartFileSource(clamped)
    } else {
      fileOffsetSeconds = clamped % duration
    }
  }

  function isPlayingFile () {
    return !!fileBuffer && filePlaying
  }

  function setVolume (value) {
    const clamped = Math.max(0, Math.min(1, value))
    gain.gain.setValueAtTime(clamped, context.currentTime)
  }

  function getVolume () {
    return gain.gain.value
  }

  return {
    getContext () {
      return context
    },
    getTimeSamples () {
      return timeSamples
    },
    getQuadSamples () {
      return quadSamples
    },
    getTimeSampleIndex () {
      return time.getSampleIndex()
    },
    getQuadSampleIndex () {
      return quad.getSampleIndex()
    },
    isFileSource,
    isPlayingFile,
    getDuration () {
      return getFileDuration()
    },
    getPlaybackTime,
    pauseFile,
    resumeFile,
    seekFile,
    setVolume,
    getVolume
  }
}
