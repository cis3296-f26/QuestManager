import { DesertRenderer, drawWind } from "./rendering/DesertRenderer.js";
import { developmentBuild } from "./dev/buildConfig.js";
import { CaveRenderer } from "./rendering/CaveRenderer.js";
import { drawCaveMechanics } from "./rendering/CaveMechanicsRenderer.js";
import { drawEnemy } from "./rendering/EnemyRenderer.js";
import { GrasslandRenderer } from "./rendering/GrasslandRenderer.js";
import { drawInteractivePlatforms } from "./rendering/PlatformRenderer.js";
import { drawExplorationFoliage, drawDiscoveryNotice } from "./rendering/ExplorationRenderer.js";
import { AvatarRenderer } from "./rendering/AvatarRenderer.js";
import { levels } from "./levels/levels.js";
import { WorldMap } from "./ui/WorldMap.js";
import { drawHazards } from "./engine/Hazards.js";
import { LevelManager } from "./levels/LevelManager.js";
import { followCamera } from "./engine/Camera.js";
import { jump } from "./engine/Physics.js";
import { movement } from "./engine/Movement.js";
import { stepLevel } from "./engine/stepLevel.js";
import { CoinManager } from "./levels/CoinManager.js";
import { LocalProgressStore } from "./progress/LocalProgressStore.js";
import { LevelProgressManager } from "./progress/LevelProgressManager.js";
import { connectGameSession } from "./progress/GameSession.js";
import { renderCoinProgress, drawCoinHUD } from "./ui/CoinProgress.js";
import { GamePauseManager, GameClock } from "./engine/GamePauseManager.js";
import { GameSettings, SettingsPersistence } from "./settings/GameSettings.js";
import { PauseMenu } from "./ui/PauseMenu.js";
import { AudioManager } from "./audio/AudioManager.js";
import { GameAudioEvents } from "./audio/GameAudioEvents.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const status = document.getElementById("gameStatus");
const completionDialog = document.getElementById("levelCompleteDialog");
const completionTitle = document.getElementById("levelCompleteTitle");

const level = new LevelManager(levels[0]);
let { groundY, worldWidth } = level.config;
let { platforms } = level;
let { player, enemies, flagX } = level;
const jumpStrength = movement.jumpStrength;

const keys = new Set();
const clock = new GameClock();
let cameraX = 0;
const deathDelay = 0.7;
let deathTimeLeft = 0;
const avatar = new AvatarRenderer();
const grassland = new GrasslandRenderer();
const cave = new CaveRenderer();
const desert = new DesertRenderer();

let storage = null;
try { storage = window.localStorage; } catch { /* Restricted browsers use memory only. */ }
const progress = new LevelProgressManager(new LocalProgressStore(storage));
levels.forEach((config) => progress.registerLevel(config));
let coins = new CoinManager(level.config.coins);
let worldMap;
let playing = false;
let accountSession;
let sessionReady = false;
let attemptRevision = 0;
let testingLevel = false;
let developer = null;
const settings = new GameSettings(new SettingsPersistence(storage));
const audio = new AudioManager(settings);
const audioEvents = new GameAudioEvents(audio);
audio.listenForUnlock(window);
const pause = new GamePauseManager(() => sessionReady && playing && !level.complete && deathTimeLeft <= 0 && !completionDialog.open);
pause.subscribe(() => { keys.clear(); clock.reset(); audio.setPaused(pause.paused); });
const pauseMenu = new PauseMenu({ document, pause, settings,
    onRestart: () => restartLevel(), onMap: () => worldMap.openMap(),
    returnFocus: () => { if (playing && !completionDialog.open) canvas.focus(); } });

// Production config is false. No developer UI or implementation modules are
// loaded unless the explicitly opted-in local server supplies a development build.
if (developmentBuild) {
    const { installDeveloperTools } = await import("./dev/installDeveloperTools.js");
    developer = installDeveloperTools({ document, pause, pauseMenu, levels, getLevel: () => level,
        changed: () => {
            keys.clear(); clock.reset(); updateCoinHUD();
            // A teleport is a deliberate camera cut; ordinary travel still uses
            // smooth follow. The player must be visible even while paused.
            if (player.x < cameraX || player.x + player.width > cameraX + canvas.width) {
                cameraX = Math.max(0, Math.min(worldWidth - canvas.width,
                    player.x + player.width / 2 - canvas.width * .45));
            }
        },
        loadLevel: (id) => {
            if (!developer.canLoad(id, levels)) return;
            developer.testLevelId = id;
            const hash = `#test-level-${id}`;
            if (location.hash === hash) worldMap.render();
            else location.hash = hash;
        },
        prepareCoinReset: (scope) => ({ scope, levelId: level.config.id,
            userId: progress.userId, revision: attemptRevision, cancelled: false }),
        resetCoins: async (request) => {
            const valid = () => developer?.available && developer.enabled && pause.screen === "admin" &&
                !request.cancelled && ["current", "all"].includes(request.scope) &&
                request.userId === progress.userId && request.revision === attemptRevision && request.levelId === level.config.id;
            if (!valid() || !await accountSession.verifyAccount(request.userId) || !valid())
                return { message: "Reset cancelled: the account or attempt changed. No coins were cleared." };
            const result = progress.clearCoinProgress(request.scope === "all" ? null : request.levelId);
            developer.markAttempt();
            coins.reset(progress.getLevel(level.config.id).coinIds);
            worldMap.refresh();
            return { message: `${request.scope === "all" ? "All saved level coins" : "This level's saved coins"} cleared${result.persistent ? " for this account on this browser" : " for this session only; browser storage is unavailable"}. This attempt remains a test run.` };
        },
        restart: () => restartLevel(), onMap: () => worldMap.openMap()
    });
}

function updateCoinHUD() {
    // The visible HUD is drawn inside the canvas; announce pickups without another panel.
    document.getElementById("coinCounter").textContent = level.developerAssisted
        ? `Coins: ${coins.count}/3. TEST RUN — PROGRESS NOT SAVED.`
        : `Coins: ${coins.count}/3. Reach the flag to save new coins.`;
}

function changeAccount(userId) {
    if (userId === progress.userId) return;
    pause.close();
    developer?.resetSession();
    developer?.panel.sync();
    settings.setUser(userId);
    progress.setUser(userId);
    if (completionDialog.open) {
        completionDialog.returnValue = "";
        completionDialog.close();
    }
    restartLevel(); // Discard the previous account's unfinished attempt, including coins.
    worldMap?.refresh();
    if (worldMap && playing && !worldMap.isPlayable(level.config.id)) {
        playing = false;
        worldMap.openMap(); // A different account must unlock this level for itself.
    }
    avatar.load(); // Also clear the previous account's avatar and reject stale image loads.
}

async function finishLevel() {
    const revision = attemptRevision;
    const userId = progress.userId;
    const attemptIds = [...coins.pending];
    const assisted = level.developerAssisted;
    // Check identity again at the save boundary (including sign-outs in another tab).
    const verified = assisted ? false : await accountSession.verifyAccount(userId);
    if (revision !== attemptRevision || !level.complete) return;
    const saved = verified && !assisted && !level.developerAssisted
        ? progress.completeLevel(level.config.id, attemptIds, { developerAssisted: level.developerAssisted })
        : progress.getLevel(level.config.id);
    worldMap.refresh();
    const nextButton = document.getElementById("nextLevel");
    nextButton.disabled = !worldMap.hasNext();
    nextButton.textContent = nextButton.disabled ? "Next Level · Coming soon" : "Next Level";
    coins.reset(saved.coinIds);
    updateCoinHUD();
    completionTitle.textContent = `Level ${level.config.id} Complete!${assisted || level.developerAssisted ? " · TEST RUN" : ""}`;
    document.getElementById("completionSaveStatus").classList.toggle("is-test-run", assisted || level.developerAssisted);
    document.getElementById("levelCompleteDescription").textContent = `You reached the flag! Replay ${level.config.name} or return to the World Map.`;
    document.getElementById("completionCoinCount").textContent = `Coin Collection: ${saved.coinIds.length}/3`;
    renderCoinProgress(document.getElementById("completionCoins"), level.config.coins, saved.coinIds);
    document.getElementById("perfectCoins").hidden = !saved.fullyCompleted;
    document.getElementById("completionSaveStatus").textContent = assisted || level.developerAssisted
        ? "TEST RUN — PROGRESS NOT SAVED" : !verified
        ? "Your account could not be verified. This attempt was not saved; replay to try again."
        : progress.persistent ? "Progress saved for your account on this browser."
            : "Progress kept for this session only; it will not survive closing or refreshing this page.";
    status.textContent = `Level ${level.config.id} complete! Press R to play again.`;
    completionDialog.returnValue = "";
    completionDialog.showModal();
}


// Click the game to give it keyboard focus.
canvas.addEventListener("pointerdown", () => {
    canvas.focus();
});

function restartLevel() {
    pause.close();
    clock.reset();
    attemptRevision++;
    level.restart();
    developer?.beginAttempt({ bypass: testingLevel && !progress.getLevel(level.config.id).unlocked });
    coins.reset(progress.getLevel(level.config.id).coinIds);
    updateCoinHUD();
    cameraX = 0;
    deathTimeLeft = 0;
    keys.clear();
    audioEvents.reset();
    audio.setScene(playing ? level.config.audio?.music ?? "grassland" : "map", { gameplay: playing, restart: playing });

    status.textContent = "Reach the flag! Press R to restart.";
}

// Finishing never advances automatically; navigation requires an explicit choice.
completionDialog.addEventListener("close", () => {
    if (completionDialog.returnValue === "replay") restartLevel();
    if (completionDialog.returnValue === "map") worldMap.openMap();
    else if (playing) canvas.focus();
});

document.getElementById("nextLevel").addEventListener("click", () => {
    if (!worldMap?.hasNext()) return;
    completionDialog.returnValue = "";
    completionDialog.close();
    worldMap.openNext();
});

function closeCompletion() {
    if (!completionDialog.open) return;
    completionDialog.returnValue = "";
    completionDialog.close();
}

function playLevel(config, { developerBypass = false } = {}) {
    testingLevel = developerBypass;
    closeCompletion();
    level.load(config);
    ({ groundY, worldWidth } = config);
    ({ platforms } = level);
    ({ player, enemies, flagX } = level);
    coins = new CoinManager(config.coins);
    restartLevel();
    playing = true;
    if (developerBypass) developer?.markAttempt();
    audio.setScene(config.audio?.music ?? "grassland", { gameplay: true });
    document.getElementById("levelHeading").textContent = `Level ${config.id}: ${config.name}`;
    document.getElementById("enemyInstructions").textContent = config.theme === "desert"
        ? "Jump over scorpions: they cannot be stomped. Watch the ribbons before entering a wind gust."
        : "Land on slimes to defeat them; mushrooms must still be avoided.";
    canvas.setAttribute("aria-label", `Level ${config.id}: ${config.name} platform game`);
    canvas.focus();
}

function showMap() {
    testingLevel = false;
    playing = false;
    pause.close();
    closeCompletion();
    restartLevel(); // Abandoning a level never saves new coins.
}

canvas.addEventListener("keydown", event => {

    if (event.target && event.target !== canvas) return;
    if (!sessionReady || !playing || pause.paused || completionDialog.open) return;
    if (event.code === "Escape") {
        event.preventDefault();
        if (!event.repeat) pause.open();
        return;
    }
    if (deathTimeLeft > 0) return;

    if (event.code === "KeyR") {
        event.preventDefault();
        if (!event.repeat) restartLevel();
        return;
    }

    if (level.complete || deathTimeLeft > 0) return;

    const controls = ["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space", "KeyW", "ArrowUp"];
    const flyControls = developer?.enabled && developer.fly && ["KeyS", "ArrowDown", "ShiftLeft", "ShiftRight"].includes(event.code);
    if (!controls.includes(event.code) && !flyControls) return;

    // Stop arrows and Space from scrolling the page while playing.
    event.preventDefault();
    keys.add(event.code);

    if (
        ["Space", "KeyW", "ArrowUp"].includes(event.code) &&
        !event.repeat &&
        player.grounded &&
        !developer?.fly
    ) {
        jump(player, jumpStrength);
        audioEvents.jump();
    }
});

canvas.addEventListener("keyup", event => {
    keys.delete(event.code);
});

// Avoid stuck movement when switching tabs or clicking away.
canvas.addEventListener("blur", () => keys.clear());
window.addEventListener("blur", () => keys.clear());
window.addEventListener("blur", () => audio.setActive(false));
window.addEventListener("focus", () => audio.setActive(document.visibilityState !== "hidden"));
window.addEventListener("pageshow", () => audio.setActive(document.visibilityState !== "hidden"));

function startDeath(message, reason = "enemy") {
    if (deathTimeLeft > 0) return;
    audio.die(reason);
    coins.discard();
    updateCoinHUD();
    player.animation.beginDeath(player, canvas.height);
    deathTimeLeft = deathDelay;
    keys.clear();
    status.textContent = message;
}

function update(dt) {
    if (level.complete) return;
    if (deathTimeLeft > 0) {
        deathTimeLeft -= dt;
        if (deathTimeLeft <= 0) restartLevel();
        return;
    }
    const left = keys.has("ArrowLeft") || keys.has("KeyA");
    const right = keys.has("ArrowRight") || keys.has("KeyD");

    const beforeAudio = audioEvents.capture(level, coins);
    const direction = Number(right) - Number(left);
    const result = developer ? developer.step(direction, keys, dt) : stepLevel(level, direction, dt);
    if (result.death) {
        const message = { enemy: "A creature caught you! Restarting…", fall: "You fell! Restarting…", thorns: "You touched the thorns! Restarting…", stalactite: "A falling rock caught you! Restarting…" };
        startDeath(message[result.death], result.death);
        return;
    }
    if (result.discovered.length) status.textContent = `Found: ${level.exploration.notice}. Reach the flag to save new coins.`;

    cameraX = followCamera(cameraX, player, worldWidth, canvas.width, dt);

    // Hazards win over collection when both are touched in the same frame.
    if (coins.update(player, dt)) updateCoinHUD();
    audioEvents.after(beforeAudio, level, coins, result);

    if (level.checkCompletion() || developer?.checkFlyingFinish()) {
        audio.complete();
        keys.clear();
        status.textContent = "Flag reached! Saving collectible progress…";
        void finishLevel();
    }
}

function drawPlayer() {
    avatar.draw(ctx, player, { reduceMotion: settings.values.reduceMotion });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scenery = level.config.theme === "desert" ? desert : level.config.theme === "cave" ? cave : grassland;
    scenery.drawBackground(ctx, canvas.width, canvas.height, cameraX, groundY, level.config.theme, level.config.openingLandscape ?? level.config.landscape);

    ctx.save();
    ctx.translate(-cameraX, 0);
    scenery.drawDecorations(ctx, level.config.scenery ?? [], groundY, cameraX, canvas.width);
    grassland.drawPlatforms(ctx, platforms.filter((platform) => !platform.type), cameraX, canvas.width);
    drawInteractivePlatforms(ctx, platforms, cameraX, canvas.width, { reduceMotion: settings.values.reduceMotion });
    drawExplorationFoliage(ctx, level.exploration, cameraX, canvas.width);

    const flagTop = level.config.finish.platform.y - 60;

    // Flagpole.
    ctx.fillStyle = "#51452b";
    ctx.fillRect(flagX, flagTop, 4, 60);

    // Gold pennant.
    ctx.fillStyle = "#e5b84b";
    ctx.beginPath();
    ctx.moveTo(flagX + 4, flagTop);
    ctx.lineTo(flagX + 34, flagTop + 12);
    ctx.lineTo(flagX + 4, flagTop + 24);
    ctx.closePath();
    ctx.fill();

    drawWind(ctx, level.wind, cameraX, canvas.width, { reduceMotion: settings.values.reduceMotion });
    drawCaveMechanics(ctx, level, cameraX, canvas.width, { reduceMotion: settings.values.reduceMotion });
    drawHazards(ctx, level.config.hazards ?? []);
    enemies.forEach((enemy) => drawEnemy(ctx, enemy, cameraX, canvas.width));
    coins.draw(ctx, cameraX, canvas.width, { reduceMotion: settings.values.reduceMotion });
    drawPlayer();
    ctx.restore();

    // Section names are drawn in screen space; they never collide with the player.
    const section = [...(level.config.sections ?? [])].reverse().find((entry) => player.x >= entry.x)
        ?? level.config.sections?.[0];
    if (section) {
        ctx.fillStyle = "rgba(250, 240, 230, 0.95)";
        ctx.fillRect(12, 12, canvas.width - 24, 55);
        ctx.fillStyle = "#3d5f26";
        ctx.font = "bold 17px Georgia";
        ctx.fillText(section.title, 25, 34, canvas.width - 190);
        ctx.font = "13px Arial";
        ctx.fillText(section.hint, 25, 55, canvas.width - 190);
    }
    drawCoinHUD(ctx, level.config.coins, coins.saved, coins.pending, canvas.width);
    drawDiscoveryNotice(ctx, level.exploration);
    developer?.draw(ctx, coins, cameraX);

    if (deathTimeLeft > 0) {
        const fade = 1 - deathTimeLeft / deathDelay;
        ctx.fillStyle = `rgba(17, 24, 39, ${fade * 0.8})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#faf0e6";
        ctx.font = "bold 28px Georgia";
        ctx.textAlign = "center";
        ctx.fillText("Try again!", canvas.width / 2, canvas.height / 2);
        ctx.textAlign = "start";
    }
}

function gameLoop(time) {
    // All game state and animation time advance through this one gate.
    const dt = clock.frame(time, sessionReady && playing && !pause.paused &&
        !completionDialog.open && document.activeElement === canvas);
    if (dt !== null && dt > 0) {
        for (const step of developer ? developer.steps(dt) : [dt]) {
            if (level.complete) break;
            update(step);
            player.animation.update(player, step, {
                dead: deathTimeLeft > 0,
                deathProgress: 1 - deathTimeLeft / deathDelay,
                complete: level.complete
            });
        }
    }

    document.getElementById("pauseButton").disabled = !pause.canPause() || pause.paused;
    if (playing) draw();
    requestAnimationFrame(gameLoop);
}

// Leaving never commits an attempt. This also clears attempts restored from the back/forward cache.
window.addEventListener("pagehide", () => {
    if (completionDialog.open) {
        completionDialog.returnValue = "";
        completionDialog.close();
    }
    restartLevel();
    audio.setActive(false);
});

status.textContent = "Checking your account before the adventure begins…";
connectGameSession(changeAccount).then((session) => {
    accountSession = session;
    sessionReady = true;
    updateCoinHUD();
    worldMap = new WorldMap({
        levels,
        getProgress: (id) => progress.getLevel(id),
        getTotal: () => progress.totalCoins,
        onPlay: playLevel,
        getTestLevel: (id) => developer?.available && developer.enabled && developer.testLevelId === id
            ? levels.find(config => config.id === id) ?? null : null,
        onMap: showMap,
        onMapRequest: () => {
            if (pause.canPause()) pause.open("map");
            else if (!pause.paused) worldMap.openMap();
        }
    });
});
requestAnimationFrame(gameLoop);






