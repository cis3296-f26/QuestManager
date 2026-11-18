class FakeAudioContext {
    constructor() { this.state = "suspended"; this.currentTime = 0; this.destination = {}; this.sources = []; this.gains = []; }
    async resume() { this.state = "running"; }
    async close() { this.state = "closed"; }
    createBuffer(channels, length, sampleRate) {
        const samples = Array.from({length:channels},()=>new Float32Array(length));
        return { duration: length / sampleRate, length, sampleRate, numberOfChannels:channels, getChannelData: channel => samples[channel] };
    }
    createGain() {
        const node = { gain: { value: 1, events: [],
            setValueAtTime(value,time) { this.value = value;this.events.push({type:"set",value,time}); },
            linearRampToValueAtTime(value,time) { this.value=value;this.events.push({type:"ramp",value,time}); },
            cancelScheduledValues(time) { this.events.push({type:"cancel",time}); }
        }, connect() {}, disconnect() { this.disconnected = true; } };
        this.gains.push(node); return node;
    }
    createBufferSource() {
        const context = this;
        const source = { starts: [], loop: false, stopped: false, connect() {}, disconnect() { this.disconnected = true; },
            start(when = 0, offset = 0) { this.starts.push({ when, offset }); this.started = context.currentTime; },
            stop() { if (!this.stopped) { this.stopped = true; this.onended?.(); } } };
        this.sources.push(source); return source;
    }
    advance(seconds) {
        this.currentTime += seconds;
        for (const source of this.sources) if (source.starts.length && !source.loop && !source.stopped && this.currentTime >= source.started + source.buffer.duration) source.stop();
    }
}
module.exports = { FakeAudioContext };
