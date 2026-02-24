class PlaybackProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const bufferSeconds = options.processorOptions?.bufferSeconds || 10;
    this.ringBuffer = new Float32Array(sampleRate * bufferSeconds);
    this.writeIndex = 0;
    this.readIndex = 0;
    this.isPlaying = false;

    this.port.onmessage = (e) => {
      if (e.data.type === "audio") {
        const pcm16 = new Int16Array(e.data.pcm);
        const used = this.writeIndex - this.readIndex;
        const free = this.ringBuffer.length - used;
        const toWrite = Math.min(pcm16.length, free);
        for (let i = 0; i < toWrite; i++) {
          this.ringBuffer[this.writeIndex % this.ringBuffer.length] =
            pcm16[i] / 32768;
          this.writeIndex++;
        }
        if (!this.isPlaying && toWrite > 0) {
          this.isPlaying = true;
          this.port.postMessage({ type: "playbackStart" });
        }
      } else if (e.data.type === "clear") {
        this.writeIndex = 0;
        this.readIndex = 0;
        this.isPlaying = false;
        this.port.postMessage({ type: "playbackStop" });
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0]?.[0];
    if (!output) return true;

    const available = this.writeIndex - this.readIndex;
    const samplesToRead = Math.min(available, output.length);

    if (samplesToRead > 0) {
      for (let i = 0; i < samplesToRead; i++) {
        output[i] = this.ringBuffer[this.readIndex % this.ringBuffer.length];
        this.readIndex++;
      }
    } else if (this.isPlaying) {
      this.isPlaying = false;
      this.port.postMessage({ type: "playbackStop" });
    }

    return true;
  }
}

registerProcessor("playback-processor", PlaybackProcessor);
