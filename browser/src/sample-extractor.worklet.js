class SampleExtractorProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.sampleIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0 && input[0]) {
      const inputSamples = input[0];
      this.sampleIndex += inputSamples.length;
      this.port.postMessage({
        type: 'samples',
        samples: inputSamples.slice(),
        sampleIndex: this.sampleIndex
      });
    }
    return true;
  }
}

registerProcessor('sample-extractor', SampleExtractorProcessor);
