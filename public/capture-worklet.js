class CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.FRAME_SIZE = 2048;
    this.buffer = new Float32Array(this.FRAME_SIZE * 4);
    this.writeIndex = 0;
    this.muted = false;

    this.port.onmessage = (e) => {
      if (e.data.type === "mute") {
        this.muted = e.data.value;
      }
    };
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input || this.muted) return true;

    if (this.writeIndex + input.length > this.buffer.length) {
      const newBuffer = new Float32Array(this.buffer.length * 2);
      newBuffer.set(this.buffer.subarray(0, this.writeIndex));
      this.buffer = newBuffer;
    }

    this.buffer.set(input, this.writeIndex);
    this.writeIndex += input.length;

    while (this.writeIndex >= this.FRAME_SIZE) {
      const pcm16 = new Int16Array(this.FRAME_SIZE);
      for (let i = 0; i < this.FRAME_SIZE; i++) {
        const s = Math.max(-1, Math.min(1, this.buffer[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      const remaining = this.writeIndex - this.FRAME_SIZE;
      this.buffer.copyWithin(0, this.FRAME_SIZE, this.writeIndex);
      this.writeIndex = remaining;

      this.port.postMessage(
        { type: "audio", pcm: pcm16.buffer },
        [pcm16.buffer]
      );
    }

    return true;
  }
}

registerProcessor("capture-processor", CaptureProcessor);
