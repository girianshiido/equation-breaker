export const cues = ['tap', 'lift', 'cross', 'drop', 'merge', 'win', 'cancel'] as const;
export type Cue = typeof cues[number];
/** Pre-rendered short melodies, decoded once. No oscillator or layout work during a gesture. */
export class SoundBank {
    private context: AudioContext | null = null;
    private buffers = new Map<Cue, Promise<AudioBuffer | null>>();
    private voices = new Set<AudioBufferSourceNode>();
    private generation = 0;
    private last = new Map<Cue, number>();
    private readonly ogg = !!document.createElement('audio').canPlayType('audio/ogg; codecs="opus"');
    constructor(private enabled: () => boolean) {}
    unlock() {
        if (!this.enabled()) return;
        try {
            this.context ??= new AudioContext();
            void this.context.resume().catch(() => {});
            for (const cue of cues) void this.decode(cue);
        } catch { /* Audio remains optional. */ }
    }
    private decode(cue: Cue): Promise<AudioBuffer | null> {
        if (!this.buffers.has(cue)) {
            const load = async (extension: string) => {
                const response = await fetch(`${import.meta.env.BASE_URL}audio/${cue}.${extension}`);
                if (!response.ok) throw Error('Bruit indisponible');
                return this.context!.decodeAudioData(await response.arrayBuffer());
            };
            this.buffers.set(cue, load(this.ogg ? 'ogg' : 'mp3').catch(() => this.ogg ? load('mp3') : null).catch(() => { this.buffers.delete(cue); return null; }));
        }
        return this.buffers.get(cue)!;
    }
    play(cue: Cue) {
        if (!this.enabled()) return;
        const now = performance.now();
        if (now - (this.last.get(cue) ?? -Infinity) < 65) return;
        this.last.set(cue, now); this.unlock();
        if (!this.context) return;
        const generation = this.generation;
        void this.decode(cue).then(buffer => {
            if (!buffer || !this.context || !this.enabled() || generation !== this.generation || this.context.state !== 'running' || performance.now() - now > 350) return;
            if (this.voices.size >= 4) { const oldest = this.voices.values().next().value; if (oldest) { this.voices.delete(oldest); oldest.stop(); } }
            const source = this.context.createBufferSource(), gain = this.context.createGain();
            source.buffer = buffer; gain.gain.value = .38;
            source.connect(gain); gain.connect(this.context.destination); this.voices.add(source);
            source.onended = () => { this.voices.delete(source); source.disconnect(); gain.disconnect(); };
            source.start();
        });
    }
    stop() { this.generation++; for (const voice of this.voices) voice.stop(); this.voices.clear(); }
}
