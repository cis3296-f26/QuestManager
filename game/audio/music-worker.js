import { synthesizeMusic } from "./MusicSynth.js";

// Buffer data is transferred, not copied as JSON. No AudioContext is needed here.
self.onmessage = ({data:{key}}) => {
    try {
        const context={createBuffer(numberOfChannels,length,sampleRate){
            const channels=Array.from({length:numberOfChannels},()=>new Float32Array(length));
            return {length,sampleRate,channels,getChannelData:c=>channels[c]};
        }};
        const buffer=synthesizeMusic(context,key);
        if(!buffer){self.postMessage({missing:true});return;}
        self.postMessage({channels:buffer.channels,sampleRate:buffer.sampleRate},buffer.channels.map(c=>c.buffer));
    } catch { self.postMessage({failed:true}); }
};
