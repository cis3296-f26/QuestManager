import { drawEnemy } from "./rendering/EnemyRenderer.js";
import { GrasslandRenderer } from "./rendering/GrasslandRenderer.js";
import { AvatarRenderer } from "./rendering/AvatarRenderer.js";
import { level1 } from "./levels/Level1.js";
import { touchesHazard, drawHazards } from "./engine/Hazards.js";
import { LevelManager } from "./levels/LevelManager.js";
import { followCamera } from "./engine/Camera.js";
import { moveHorizontally, applyGravity, jump } from "./engine/Physics.js";
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

const level = new LevelManager(level1);
const { groundY, worldWidth, platforms } = level.config;
const { player, enemies, flagX } = level;
const speed = 280;
const gravity = 1800;
const jumpStrength = 650;

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
progress.registerLevel(level.config);
const coins = new CoinManager(level.config.coins);
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
    coins.reset(saved.coinIds);
    updateCoinHUD();
    completionTitle.textContent = `Level ${level.config.id} Complete!`;
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

// Future navigation remains disabled while Level 1 is being playtested.
completionDialog.addEventListener("close", () => {
    if (completionDialog.returnValue === "replay") restartLevel();
    canvas.focus();
});

canvas.addEventListener("keydown", event => {

    if (!sessionReady) return;

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

    moveHorizontally(player, Number(right) - Number(left), speed, worldWidth, dt);
    applyGravity(player, gravity, platforms, dt);

    if (player.y >= canvas.height) {
        startDeath("You fell! Restarting…");
        return;
    }

    enemies.forEach((enemy) => enemy.update(dt));
    if (enemies.some((enemy) => enemy.touches(player))) {
        startDeath("A creature caught you! Restarting…");
        return;
    }

    if (touchesHazard(player, level.config.hazards ?? [])) {
        startDeath("You touched the thorns! Restarting…");
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

    grassland.drawBackground(ctx, canvas.width, canvas.height, cameraX, groundY);

    ctx.save();
    ctx.translate(-cameraX, 0);
    grassland.drawDecorations(ctx, level.config.scenery ?? [], groundY, cameraX, canvas.width);
    grassland.drawPlatforms(ctx, platforms, cameraX, canvas.width);

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
    if (sessionReady && document.activeElement === canvas) {
        update(dt);
        player.animation.update(player, dt, {
            dead: deathTimeLeft > 0,
            deathProgress: 1 - deathTimeLeft / deathDelay,
            complete: level.complete
        });
    }

    draw();
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
    status.textContent = "Click inside the game to begin The First Adventure.";
});
requestAnimationFrame(gameLoop);

