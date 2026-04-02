// http://stackoverflow.com/questions/4723213/detect-http-or-https-then-force-https-in-javascript
if (document.location.hostname !== 'localhost' && window.location.protocol !== 'https:') {
  window.location.href = 'https:' + window.location.href.substring(window.location.protocol.length)
}
const AudioContext = window.AudioContext || window.webkitAudioContext

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

  const source = context.createBufferSource()
  source.buffer = audioBuffer
  source.loop = true
  source.start(0)
  return source
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

  // Load the worklet module if not already loaded
  // The path must match the emitted file from webpack
  if (!context.audioWorklet.modules || !context.audioWorklet.modules.includes('sample-extractor')) {
    // Use relative path from index.html served root
    await context.audioWorklet.addModule('sample-extractor.worklet.js');
  }
  const node = new AudioWorkletNode(context, 'sample-extractor', {
    processorOptions: { bufferSize: N }
  });
  node.port.onmessage = (event) => {
    if (event.data.type === 'samples') {
      appendSamples(buffer, event.data.samples)
      latestSampleIndex = event.data.sampleIndex || (latestSampleIndex + event.data.samples.length)
    }
  };
  node.getSampleIndex = () => latestSampleIndex
  return node;
}

export default async function createAudio (N, sourcePromise, context = new AudioContext()) {
  const timeSamples = new Float32Array(N);
  const quadSamples = new Float32Array(N);

  const [delay, hilbert] = createHilbertFilter(context, N);
  const time = await createSampleExtractorNode(context, timeSamples, N);
  const quad = await createSampleExtractorNode(context, quadSamples, N);

  const input = await sourcePromise;
  input.connect(delay);
  input.connect(hilbert);
  hilbert.connect(time);
  delay.connect(quad);
  time.connect(context.destination);
  quad.connect(context.destination);

  return {
    getContext () {
      return context;
    },
    getTimeSamples () {
      return timeSamples;
    },
    getQuadSamples () {
      return quadSamples;
    },
    getTimeSampleIndex () {
      return time.getSampleIndex()
    },
    getQuadSampleIndex () {
      return quad.getSampleIndex()
    }
  };
}
