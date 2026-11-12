import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { MUSIC_TRACKS, arrangeMusic } from "../audio/MusicScores.js";
import { createSynthAssets } from "../audio/SynthAssets.js";
import { AudioManager } from "../audio/AudioManager.js";
import { GameSettings } from "../settings/GameSettings.js";
import { levels } from "../levels/levels.js";
import { mountMusicPreview } from "../dev/MusicPreview.js";
import fake from "./helpers/fakeAudioContext.cjs";
const {FakeAudioContext}=fake;
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test("existing biome keys select six original arrangements with distinct meter, texture and phrase development",()=>{
    assert.deepEqual(levels.map(l=>l.audio.music),["grassland","forest","deepForest","cave","desert"]);
    assert.deepEqual(Object.keys(MUSIC_TRACKS),["map","grassland","forest","deepForest","cave","desert"]);
    const textures=new Set(),rhythms=new Set();
    for(const key of Object.keys(MUSIC_TRACKS)) {
        const {score,notes,duration}=arrangeMusic(key);
        assert.ok(duration>=45&&duration<=90);assert.equal(score.bars,24);
        assert.ok(notes.length>80);
        textures.add([...new Set(notes.map(n=>n.instrument))].sort().join(','));
        rhythms.add(`${score.bpm}/${score.beatsPerBar}`);
        assert.ok(notes.some(n=>n.pan<0)&&notes.some(n=>n.pan>0));
        const section=duration/3;
        const signature=part=>notes.filter(n=>n.start>=part*section&&n.start<(part+1)*section)
            .map(n=>[Math.round((n.start-part*section)*100),n.pitch,n.instrument]);
        assert.notDeepEqual(signature(0),signature(1),`${key} needs an answering phrase, not an eight-bar copy`);
        assert.notDeepEqual(signature(0),signature(2),`${key} needs a varied return`);
    }
    assert.equal(textures.size,6);assert.equal(rhythms.size,6);
    assert.equal(arrangeMusic("desertRuins"),null,"unfinished biomes have no placeholder scores");
    // Forest family shares the motif's rising 3rd/5th contour with a changed mode/register.
    assert.deepEqual(MUSIC_TRACKS.forest.melody[0].map(n=>n-67),[0,4,7,9]);
    assert.deepEqual(MUSIC_TRACKS.deepForest.melody[0].map(n=>n-62),[0,3,7,9]);
});

test("all existing gameplay sound effects retain identical sample data",()=>{
    const expected=JSON.parse(readFileSync(new URL('./fixtures/sound-effects-baseline.json',import.meta.url)));
    const assets=createSynthAssets(new FakeAudioContext());
    for(const [name,hash]of Object.entries(expected)) {
        const samples=assets.effect(name).getChannelData(0);
        assert.equal(createHash('sha256').update(Buffer.from(samples.buffer)).digest('hex'),hash,name);
    }
});

function delayedAudio() {
    const context=new FakeAudioContext(),settings=new GameSettings(),cache=new Map(),requests=new Map();
    const assets={getMusic:key=>cache.get(key),prepareMusic:key=>new Promise(resolve=>requests.set(key,buffer=>{if(buffer)cache.set(key,buffer);resolve(buffer);})),
        effect:()=>({duration:.1}),clear(){}};
    const audio=new AudioManager(settings,{contextFactory:()=>context,assetsFactory:()=>assets});
    const resolve=key=>requests.get(key)({name:key,duration:60});
    return {audio,context,settings,requests,resolve};
}

test("off-thread preparation keeps old music until ready, rejects stale scene results, and schedules nonoverlapping fades",async()=>{
    const {audio,context,resolve}=delayedAudio();audio.setScene('map');await audio.unlock();
    assert.equal(audio.music,null);resolve('map');await audio.waitForMusic();
    context.advance(2);const old=audio.music;
    audio.setScene('forest',{gameplay:true});assert.equal(audio.music,old);
    audio.setScene('cave',{gameplay:true});resolve('forest');await tick();
    assert.equal(audio.music,old,"stale forest must never replace the requested cave");
    resolve('cave');await audio.waitForMusic();
    assert.equal(audio.music.scene,'cave');assert.equal(old.source.stopped,true);
    const fade=old.gain.gain.events.findLast(e=>e.type==='ramp');
    assert.equal(fade.value,0);assert.equal(audio.music.source.starts[0].when,fade.time);
    assert.ok(audio.music.gain.gain.events.some(e=>e.type==='ramp'&&e.value===1));
    audio.dispose();
});

test("pending scores cannot start after pause, completion or disposal; a missing score becomes silence",async()=>{
    for(const boundary of ['pause','complete','dispose','missing']) {
        const {audio,resolve,requests}=delayedAudio();audio.setScene('map');await audio.unlock();
        resolve('map');await audio.waitForMusic();audio.setScene('forest',{gameplay:true});
        if(boundary==='pause')audio.setPaused(true);
        if(boundary==='complete')audio.complete();
        if(boundary==='dispose')audio.dispose();
        requests.get('forest')(boundary==='missing'?null:{name:'forest',duration:60});await audio.waitForMusic();await tick();
        assert.ok(!audio.music,boundary);
        if(boundary==='pause'){audio.setPaused(false);assert.equal(audio.music.scene,'forest');}
        audio.dispose();
    }
});

test("asynchronous fallback yields, produces genuine stereo, caches two scores, and cancels cleared work",async()=>{
    const context=new FakeAudioContext(),assets=createSynthAssets(context);let timerRan=false;
    setTimeout(()=>{timerRan=true;},0);
    const map=await assets.prepareMusic('map');assert.equal(timerRan,true);
    assert.equal(map.numberOfChannels,2);assert.equal(assets.getMusic('map'),map);
    let different=false;const l=map.getChannelData(0),r=map.getChannelData(1);
    for(let i=0;i<l.length;i+=997)if(l[i]!==r[i])different=true;
    assert.equal(different,true);
    await assets.prepareMusic('grassland');await assets.prepareMusic('forest');
    assert.equal(assets.getMusic('map'),null,"least-recent score is evicted");
    assert.ok(assets.getMusic('grassland'));assert.ok(assets.getMusic('forest'));
    const pending=assets.prepareMusic('cave');assets.clear();assert.equal(await pending,null);
    assert.equal(assets.getMusic('forest'),null);assert.equal(await assets.prepareMusic('missing'),null);
});

test("production guard does not import or mount the listening tool",()=>{
    const script=`const vm=require('node:vm'),fs=require('node:fs');
    (async()=>{for(const enabled of [false,true]){
        let loaded=0,mounted=0;const context=vm.createContext({document:{},window:{}});
        const flag=new vm.SyntheticModule(['developmentBuild'],function(){this.setExport('developmentBuild',enabled)},{context});
        await flag.link(()=>{});await flag.evaluate();
        const preview=new vm.SyntheticModule(['mountMusicPreview'],function(){this.setExport('mountMusicPreview',()=>mounted++)},{context});await preview.link(()=>{});await preview.evaluate();
        const entry=new vm.SourceTextModule(fs.readFileSync(process.argv[1],'utf8'),{context,importModuleDynamically:async()=>{loaded++;return preview}});
        await entry.link(()=>flag);await entry.evaluate();
        if(loaded!==Number(enabled)||mounted!==Number(enabled))throw Error('Guard failed');
    }console.log('PASS gated preview')})().catch(e=>{console.error(e);process.exitCode=1});`;
    assert.match(execFileSync(process.execPath,['--experimental-vm-modules','--no-warnings','-e',script,
        fileURLToPath(new URL('../dev/music-preview-entry.js',import.meta.url))],{encoding:'utf8'}),/PASS gated preview/);
});

test("worker transport cancels obsolete jobs, transfers stereo buffers and terminates resources",async()=>{
    const original=globalThis.Worker,workers=[];
    globalThis.Worker=class {
        constructor(url,options){this.url=url;this.options=options;workers.push(this);}
        postMessage(data){this.key=data.key;}
        terminate(){this.terminated=true;}
    };
    try {
        const assets=createSynthAssets(new FakeAudioContext());
        const obsolete=assets.prepareMusic('forest'),current=assets.prepareMusic('cave');
        assert.equal(await obsolete,null);assert.equal(workers[0].terminated,true);
        assert.equal(workers[1].options.type,'module');assert.match(workers[1].url.href,/music-worker\.js$/);
        const channels=[new Float32Array([.01,.02]),new Float32Array([.02,.01])];
        workers[1].onmessage({data:{channels,sampleRate:22050}});
        const buffer=await current;assert.deepEqual([...buffer.getChannelData(1)],[...channels[1]]);
        assert.equal(workers[1].terminated,true);assert.equal(assets.getMusic('cave'),buffer);
        const cancelled=assets.prepareMusic('map');assets.clear();assert.equal(await cancelled,null);
        assert.equal(workers.at(-1).terminated,true);
    } finally {
        if(original===undefined)delete globalThis.Worker;else globalThis.Worker=original;
    }
});

test("listening room switches all six tracks, controls real channel gains and stops on background/dispose without persistent storage",async()=>{
    const elements=new Map(),make=()=>({children:[],hidden:false,value:'60',checked:false,events:new Map(),
        classList:{toggle(){}},appendChild(e){this.children.push(e)},setAttribute(k,v){this[k]=v},
        addEventListener(k,fn){this.events.set(k,fn)},emit(k){return this.events.get(k)?.()}});
    const get=id=>{if(!elements.has(id))elements.set(id,make());return elements.get(id)};
    const doc={hidden:false,getElementById:get,createElement:make,addEventListener(k,fn){this[k]=fn},removeEventListener(k){delete this[k]}};
    const win={setInterval(){return 1},clearInterval(){this.cleared=true},addEventListener(k,fn){this[k]=fn}};
    const context=new FakeAudioContext();
    const preview=mountMusicPreview(doc,win,{audioFactory:settings=>new AudioManager(settings,{contextFactory:()=>context,
        assetsFactory:()=>({music:key=>({name:key,duration:60}),effect:()=>null,clear(){}})})});
    assert.equal(get('tracks').children.length,6);assert.equal(context.sources.length,0);
    for(const card of get('tracks').children){card.children[2].emit('click');await tick();assert.ok(preview.audio.music);}
    get('previewMaster').value='50';get('previewMaster').emit('input');
    get('previewMusic').value='40';get('previewMusic').emit('input');assert.equal(preview.audio.musicGain.gain.value,.2);
    get('previewMuted').checked=true;get('previewMuted').emit('change');assert.equal(preview.audio.musicGain.gain.value,0);
    get('previewMuted').checked=false;get('previewMuted').emit('change');assert.equal(preview.audio.musicGain.gain.value,.2);
    get('previewPause').emit('click');assert.equal(preview.audio.music,null);get('previewPause').emit('click');assert.ok(preview.audio.music);
    doc.hidden=true;doc.visibilitychange();assert.equal(preview.audio.music,null);
    doc.hidden=false;doc.visibilitychange();assert.ok(preview.audio.music);
    assert.equal(preview.settings.persistent,false);win.pagehide();assert.equal(context.state,'closed');assert.equal(win.cleared,true);
});
