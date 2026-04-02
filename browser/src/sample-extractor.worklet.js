class SampleExtractorProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.bufferSize = options.processorOptions?.bufferSize || 512;
    this.buffer = new Float32Array(this.bufferSize);
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0 && input[0]) {
      const inputSamples = input[0];
      this.buffer.set(inputSamples);
      this.port.postMessage({
        type: 'samples',
        samples: this.buffer.slice()
      });
    }
    return true;
  }
}

registerProcessor('sample-extractor', SampleExtractorProcessor);
