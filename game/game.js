import { drawEnemy } from "./rendering/EnemyRenderer.js";
import { GrasslandRenderer } from "./rendering/GrasslandRenderer.js";
import { drawInteractivePlatforms } from "./rendering/PlatformRenderer.js";
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
let lastTime = null;
let cameraX = 0;
const deathDelay = 0.7;
let deathTimeLeft = 0;
const avatar = new AvatarRenderer();
const grassland = new GrasslandRenderer();

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

function updateCoinHUD() {
    // The visible HUD is drawn inside the canvas; announce pickups without another panel.
    document.getElementById("coinCounter").textContent = `Coins: ${coins.count}/3. Reach the flag to save new coins.`;
}

function changeAccount(userId) {
    if (userId === progress.userId) return;
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
    // Check identity again at the save boundary (including sign-outs in another tab).
    const verified = await accountSession.verifyAccount(userId);
    if (revision !== attemptRevision || !level.complete) return;
    const saved = verified
        ? progress.completeLevel(level.config.id, attemptIds)
        : progress.getLevel(level.config.id);
    worldMap.refresh();
    const nextButton = document.getElementById("nextLevel");
    nextButton.disabled = !worldMap.hasNext();
    nextButton.textContent = nextButton.disabled ? "Next Level · Coming soon" : "Next Level";
    coins.reset(saved.coinIds);
    updateCoinHUD();
    completionTitle.textContent = `Level ${level.config.id} Complete!`;
    document.getElementById("levelCompleteDescription").textContent = `You reached the flag! Replay ${level.config.name} or return to the World Map.`;
    document.getElementById("completionCoinCount").textContent = `Coin Collection: ${saved.coinIds.length}/3`;
    renderCoinProgress(document.getElementById("completionCoins"), level.config.coins, saved.coinIds);
    document.getElementById("perfectCoins").hidden = !saved.fullyCompleted;
    document.getElementById("completionSaveStatus").textContent = !verified
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
    attemptRevision++;
    level.restart();
    coins.reset(progress.getLevel(level.config.id).coinIds);
    updateCoinHUD();
    cameraX = 0;
    deathTimeLeft = 0;
    keys.clear();

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

function playLevel(config) {
    closeCompletion();
    level.load(config);
    ({ groundY, worldWidth } = config);
    ({ platforms } = level);
    ({ player, enemies, flagX } = level);
    coins = new CoinManager(config.coins);
    restartLevel();
    playing = true;
    document.getElementById("levelHeading").textContent = `Level ${config.id}: ${config.name}`;
    canvas.setAttribute("aria-label", `Level ${config.id}: ${config.name} platform game`);
    canvas.focus();
}

function showMap() {
    playing = false;
    closeCompletion();
    restartLevel(); // Abandoning a level never saves new coins.
}

canvas.addEventListener("keydown", event => {

    if (!sessionReady || !playing) return;

    if (event.code === "KeyR") {
        event.preventDefault();
        if (!event.repeat) restartLevel();
        return;
    }

    if (level.complete || deathTimeLeft > 0) return;

    const controls = ["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space", "KeyW", "ArrowUp"];
    if (!controls.includes(event.code)) return;

    // Stop arrows and Space from scrolling the page while playing.
    event.preventDefault();
    keys.add(event.code);

    if (
        ["Space", "KeyW", "ArrowUp"].includes(event.code) &&
        !event.repeat &&
        player.grounded
    ) {
        jump(player, jumpStrength);
    }
});

canvas.addEventListener("keyup", event => {
    keys.delete(event.code);
});

// Avoid stuck movement when switching tabs or clicking away.
canvas.addEventListener("blur", () => keys.clear());
window.addEventListener("blur", () => keys.clear());

function startDeath(message) {
    if (deathTimeLeft > 0) return;
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

    const result = stepLevel(level, Number(right) - Number(left), dt);
    if (result.death) {
        const message = { enemy: "A creature caught you! Restarting…", fall: "You fell! Restarting…", thorns: "You touched the thorns! Restarting…" };
        startDeath(message[result.death]);
        return;
    }

    cameraX = followCamera(cameraX, player, worldWidth, canvas.width, dt);

    // Hazards win over collection when both are touched in the same frame.
    if (coins.update(player, dt)) updateCoinHUD();

    if (level.checkCompletion()) {
        keys.clear();
        status.textContent = "Flag reached! Saving collectible progress…";
        void finishLevel();
    }
}

function drawPlayer() {
    avatar.draw(ctx, player);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    grassland.drawBackground(ctx, canvas.width, canvas.height, cameraX, groundY, level.config.theme);

    ctx.save();
    ctx.translate(-cameraX, 0);
    grassland.drawDecorations(ctx, level.config.scenery ?? [], groundY, cameraX, canvas.width);
    grassland.drawPlatforms(ctx, platforms.filter((platform) => !platform.type), cameraX, canvas.width);
    drawInteractivePlatforms(ctx, platforms, cameraX, canvas.width);

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

    drawHazards(ctx, level.config.hazards ?? []);
    enemies.forEach((enemy) => drawEnemy(ctx, enemy, cameraX, canvas.width));
    coins.draw(ctx, cameraX, canvas.width);
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
    // Seconds since the previous frame. Cap long pauses.
    const dt = lastTime === null
        ? 0
        : Math.min((time - lastTime) / 1000, 1 / 30);

    lastTime = time;

    // Pause movement when the game does not have keyboard focus.
    if (sessionReady && playing && document.activeElement === canvas) {
        update(dt);
        player.animation.update(player, dt, {
            dead: deathTimeLeft > 0,
            deathProgress: 1 - deathTimeLeft / deathDelay,
            complete: level.complete
        });
    }

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
        onMap: showMap
    });
});
requestAnimationFrame(gameLoop);





