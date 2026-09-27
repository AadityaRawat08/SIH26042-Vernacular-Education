/**
 * Microphone recorder that produces a 16 kHz mono WAV blob.
 *
 * Why not the browser's default `MediaRecorder`? That emits webm/opus, and the
 * existing voice service (`ai services/stt.py`) hands the upload to
 * SpeechRecognition's `AudioFile` reader, which only understands uncompressed
 * PCM WAV. Recording straight to WAV keeps the existing Python speech
 * implementation untouched while making speech-to-text actually work.
 */

const TARGET_SAMPLE_RATE = 16_000;

export interface Recording {
  blob: Blob;
  durationMs: number;
}

type WindowWithLegacyAudio = Window & { webkitAudioContext?: typeof AudioContext };

/** Linear-interpolation resampler — plenty for 16 kHz speech recognition. */
function resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const length = Math.floor(input.length / ratio);
  const output = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const position = i * ratio;
    const lower = Math.floor(position);
    const upper = Math.min(lower + 1, input.length - 1);
    const weight = position - lower;
    output[i] = (input[lower] ?? 0) * (1 - weight) + (input[upper] ?? 0) * weight;
  }
  return output;
}

/** Encodes mono float samples as a 16-bit PCM WAV file. */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

/**
 * Records the microphone into a single WAV blob.
 *
 * Usage: `await recorder.start()`, then `const { blob } = recorder.stop()`.
 */
export class WavRecorder {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private silentGain: GainNode | null = null;
  private chunks: Float32Array[] = [];
  private startedAt = 0;

  get recording(): boolean {
    return this.processor !== null;
  }

  async start(): Promise<void> {
    if (this.recording) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser cannot record audio.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });

    const AudioCtor =
      window.AudioContext ?? (window as WindowWithLegacyAudio).webkitAudioContext;
    if (!AudioCtor) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("This browser cannot record audio.");
    }

    const context = new AudioCtor();
    await context.resume();

    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    // A zero-gain node keeps the capture graph pulling without echoing the mic
    // back through the speakers.
    const silentGain = context.createGain();
    silentGain.gain.value = 0;

    this.chunks = [];
    processor.onaudioprocess = (event) => {
      this.chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    };

    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(context.destination);

    this.context = context;
    this.stream = stream;
    this.source = source;
    this.processor = processor;
    this.silentGain = silentGain;
    this.startedAt = Date.now();
  }

  /** Stops the microphone and returns the recording as a WAV blob. */
  stop(): Recording {
    const durationMs = this.startedAt ? Date.now() - this.startedAt : 0;
    const sourceRate = this.context?.sampleRate ?? TARGET_SAMPLE_RATE;
    const chunks = this.chunks;
    this.teardown();

    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const joined = new Float32Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      joined.set(chunk, offset);
      offset += chunk.length;
    }

    const samples = resample(joined, sourceRate, TARGET_SAMPLE_RATE);
    return { blob: encodeWav(samples, TARGET_SAMPLE_RATE), durationMs };
  }

  /** Releases the microphone without producing a recording. */
  cancel(): void {
    this.teardown();
  }

  private teardown(): void {
    if (this.processor) {
      this.processor.onaudioprocess = null;
      this.processor.disconnect();
    }
    this.source?.disconnect();
    this.silentGain?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    void this.context?.close().catch(() => undefined);

    this.context = null;
    this.stream = null;
    this.source = null;
    this.processor = null;
    this.silentGain = null;
    this.chunks = [];
    this.startedAt = 0;
  }
}
