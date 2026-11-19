import { arrangeMusic } from "./MusicScores.js";

export const musicSampleRate = 22050;
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const TAU = Math.PI * 2;

// Rounded, band-limited additive/FM voices. No samples, network or random score
// generation. Every note has an attack/release; echo tails wrap around the loop.
function renderNote(channels, note, rate) {
    const [left,right]=channels, count=Math.ceil(note.duration*rate), offset=Math.round(note.start*rate);
    const frequency=hz(note.pitch), pan=Math.max(-1,Math.min(1,note.pan));
    const gains=[Math.sqrt((1-pan)/2),Math.sqrt((1+pan)/2)];
    const instrument=note.instrument;
    const attack=instrument==="pad"?.45:instrument==="flute"||instrument==="reed"?.07:.008;
    const release=instrument==="pad"?.65:instrument==="flute"||instrument==="reed"?.12:.08;
    let phase=0, seed=113+Math.round(note.pitch*193), air=0;
    for(let i=0;i<count;i++) {
        const t=i/rate, progress=t/note.duration;
        const vibrato=["flute","reed"].includes(instrument)?1+.0025*Math.sin(TAU*4.7*t)*Math.min(1,t*4):1;
        phase+=TAU*frequency*vibrato/rate;
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;
        air=air*.72+(seed/2147483648-1)*.28;
        const envelope=Math.min(1,t/attack)*Math.min(1,(note.duration-t)/release);
        let value;
        switch(instrument) {
            case "harp": value=(Math.sin(phase)+.22*Math.sin(2*phase)+.08*Math.sin(3*phase))*Math.exp(-4.8*progress);break;
            case "keys": value=(Math.sin(phase+.7*Math.sin(2.01*phase)*Math.exp(-8*t))+.12*Math.sin(2*phase))*Math.exp(-2.8*progress);break;
            case "flute": value=(Math.sin(phase)+.08*Math.sin(2*phase)+.045*air)*(.9+.1*Math.sin(Math.PI*progress));break;
            case "reed": value=(.82*Math.sin(phase)+.16*Math.sin(3*phase)+.04*Math.sin(5*phase))*(1-.25*progress);break;
            case "wood": value=(Math.sin(phase)+.25*Math.sin(2.7*phase)*Math.exp(-12*t))*Math.exp(-6*progress);break;
            case "bell": value=(Math.sin(phase)*Math.exp(-2.5*progress)+.28*Math.sin(2.76*phase)*Math.exp(-7*progress)+.08*Math.sin(4.07*phase)*Math.exp(-14*progress));break;
            case "glass": value=(Math.sin(phase)+.25*Math.sin(2.01*phase)*Math.exp(-3*progress))*Math.exp(-3.5*progress);break;
            case "pad": value=.65*Math.sin(phase)+.25*Math.sin(phase*1.002)+.08*Math.sin(2*phase);break;
            case "bass": value=(Math.sin(phase)+.10*Math.sin(2*phase))*Math.exp(-3*progress);break;
            case "drum": value=(Math.sin(TAU*(90*t-20*t*t))*.7+air*.3)*Math.exp(-7*progress);break;
            case "shaker": value=air*Math.exp(-6*progress);break;
            default: throw new Error(`Unknown music instrument: ${instrument}`);
        }
        value*=envelope*note.level;
        const at=(offset+i)%left.length;
        left[at]+=value*gains[0];right[at]+=value*gains[1];
        // Quiet cross-channel echoes belong to the score, not the FX channel.
        if(instrument==="bell"||instrument==="glass") {
            const a=(at+Math.round(.31*rate))%left.length,b=(at+Math.round(.59*rate))%left.length;
            left[a]+=value*gains[1]*.22;right[b]+=value*gains[0]*.18;
        }
    }
}

function finishMusic(buffer,channels) {
    const length=buffer.length;
    let peak=0,energy=0;
    for(const data of channels)for(const sample of data){peak=Math.max(peak,Math.abs(sample));energy+=sample*sample;}
    const rms=Math.sqrt(energy/(length*2));
    const gain=Math.min(4,.018/(rms||1),.16/(peak||1));
    for(const data of channels) {
        for(let i=0;i<data.length;i++)data[i]*=gain;
        // A tiny 12ms value correction removes a boundary step without fading
        // the arrangement to silence. Wrapped instrumental/echo tails remain.
        const delta=(data.at(-1)-data[0])/2,window=256;
        for(let i=0;i<window;i++) {
            const correction=delta*(1+Math.cos(Math.PI*i/window))/2;
            data[i]+=correction;data[data.length-1-i]-=correction;
        }
    }
    return buffer;
}

export function synthesizeMusic(context,key) {
    const arrangement=arrangeMusic(key);
    if(!arrangement)return null;
    const rate=musicSampleRate,length=Math.round(arrangement.duration*rate);
    const buffer=context.createBuffer(2,length,rate),channels=[buffer.getChannelData(0),buffer.getChannelData(1)];
    for(const note of arrangement.notes)renderNote(channels,note,rate);
    return finishMusic(buffer,channels);
}

// Fallback when workers are unavailable. Yield between short batches of notes
// so generating a long loop never holds the gameplay thread for its full length.
export async function synthesizeMusicAsync(context,key,cancelled=()=>false) {
    const arrangement=arrangeMusic(key);if(!arrangement)return null;
    const rate=musicSampleRate,buffer=context.createBuffer(2,Math.round(arrangement.duration*rate),rate);
    const channels=[buffer.getChannelData(0),buffer.getChannelData(1)];
    let slice=performance.now();
    for(const note of arrangement.notes) {
        if(cancelled())return null;
        renderNote(channels,note,rate);
        if(performance.now()-slice>12){await new Promise(resolve=>setTimeout(resolve,0));slice=performance.now();}
    }
    if(cancelled())return null;
    return finishMusic(buffer,channels);
}
