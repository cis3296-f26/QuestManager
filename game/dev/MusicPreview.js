import { MUSIC_TRACKS } from "../audio/MusicScores.js";
import { AudioManager } from "../audio/AudioManager.js";
import { GameSettings } from "../settings/GameSettings.js";

export function mountMusicPreview(document, window, {audioFactory = settings => new AudioManager(settings)} = {}) {
    // Same settings/volume model, memory-only persistence. No account imports.
    const settings = new GameSettings(), audio = audioFactory(settings);
    const get = id => document.getElementById(id), buttons = new Map();
    get("unavailable").hidden = true; get("preview").hidden = false;
    const status = get("previewStatus"), pause = get("previewPause");
    const sync = () => {
        for (const [key,{button,card}] of buttons) {
            button.setAttribute("aria-pressed", String(audio.scene === key));
            card.classList.toggle("is-playing", audio.scene === key);
        }
        for (const id of ["previewPause","previewRestart","previewStop"]) get(id).disabled = !audio.scene;
        pause.textContent = audio.paused ? "Resume" : "Pause";
    };
    const select = async (key, restart = false) => {
        status.textContent = "Preparing original music…";
        audio.setScene(key, { restart }); audio.setPaused(false); sync();
        const ready = await audio.unlock();
        await audio.waitForMusic();
        if (audio.scene !== key) return;
        status.textContent = ready && audio.music ? `${MUSIC_TRACKS[audio.scene]?.title ?? "Stopped"} · Listen for phrase changes and the loop seam.`
            : "Audio could not start. Click a track again, or check your browser audio settings.";
    };
    for (const [key,track] of Object.entries(MUSIC_TRACKS)) {
        const card = document.createElement("article"), title = document.createElement("h2"), description = document.createElement("p"), button = document.createElement("button");
        title.textContent = `${track.biome} · ${track.title}`;
        const seconds = Math.round(track.bars * track.beatsPerBar * 60 / track.bpm);
        description.textContent = `${track.description} ${seconds}s · ${track.bpm} BPM · ${track.beatsPerBar}/4.`;
        button.type = "button"; button.textContent = `Play ${track.biome}`;
        button.setAttribute("aria-pressed", "false");button.addEventListener("click",()=>void select(key));
        card.appendChild(title);card.appendChild(description);card.appendChild(button);get("tracks").appendChild(card);
        buttons.set(key,{button,card});
    }
    for (const [id,field,out] of [["previewMaster","masterVolume","masterValue"],["previewMusic","musicVolume","musicValue"]]) {
        get(id).addEventListener("input",()=>{settings.update({[field]:Number(get(id).value)});get(out).textContent=`${settings.values[field]}%`;});
    }
    get("previewMuted").addEventListener("change",()=>settings.update({muted:get("previewMuted").checked}));
    pause.addEventListener("click",()=>{audio.setPaused(!audio.paused);sync();});
    get("previewRestart").addEventListener("click",()=>{if(audio.scene)void select(audio.scene,true);});
    get("previewStop").addEventListener("click",()=>{audio.setScene(null);status.textContent="Stopped. Select a track to compare.";sync();});
    const visible = () => audio.setActive(!document.hidden);
    document.addEventListener("visibilitychange",visible);visible();
    const clock=window.setInterval(()=>{
        const voice=audio.music;
        const elapsed=voice?(audio.offset+Math.max(0,audio.context.currentTime-voice.started))%voice.buffer.duration:audio.offset;
        get("position").textContent=`${Math.floor(elapsed/60)}:${String(Math.floor(elapsed%60)).padStart(2,"0")}${voice?` / ${Math.round(voice.buffer.duration)}s loop`:""}`;
    },500);
    const dispose=()=>{window.clearInterval(clock);document.removeEventListener("visibilitychange",visible);audio.dispose();};
    window.addEventListener("pagehide",dispose,{once:true});sync();
    return {audio,settings,dispose};
}
