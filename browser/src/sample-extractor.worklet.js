class SampleExtractorProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.bufferSize = options.processorOptions?.bufferSize || 512;
    this.buffer = new Float32Array(this.bufferSize);
  }

  pushSamples(inputSamples) {
    const inputLength = inputSamples.length;

    if (inputLength >= this.bufferSize) {
      // If the input block is larger than the visualization buffer, keep only the newest part.
      this.buffer.set(inputSamples.subarray(inputLength - this.bufferSize));
      return;
    }

    // Shift existing samples left and append the newest input block at the tail.
    this.buffer.copyWithin(0, inputLength);
    this.buffer.set(inputSamples, this.bufferSize - inputLength);
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0 && input[0]) {
      const inputSamples = input[0];
      this.pushSamples(inputSamples);
      this.port.postMessage({
        type: 'samples',
        samples: this.buffer.slice()
      });
    }
    return true;
  }
}

registerProcessor('sample-extractor', SampleExtractorProcessor);
