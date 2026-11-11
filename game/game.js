import { GrasslandRenderer } from "./rendering/GrasslandRenderer.js";
import { AvatarRenderer } from "./rendering/AvatarRenderer.js";
import { level1 } from "./levels/Level1.js";
import { touchesHazard, drawHazards } from "./engine/Hazards.js";
import { LevelManager } from "./levels/LevelManager.js";
import { followCamera } from "./engine/Camera.js";
import { moveHorizontally, applyGravity, jump } from "./engine/Physics.js";

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


// Click the game to give it keyboard focus.
canvas.addEventListener("pointerdown", () => {
    canvas.focus();
});

function restartLevel() {
    level.restart();
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

    if (level.checkCompletion()) {
        keys.clear();
        completionTitle.textContent = `Level ${level.config.id} Complete!`;
        status.textContent = `Level ${level.config.id} complete! Press R to play again.`;
        // Escape dismisses the dialog without replaying or advancing.
        completionDialog.returnValue = "";
        completionDialog.showModal();
    }
}

function drawPlayer() {
    avatar.draw(ctx, player);
}

function drawCreature(creature) {
    const step = Math.sin(creature.walkTime * 14) * 3;

    ctx.save();
    ctx.translate(creature.x + creature.width / 2, creature.feetY);
    ctx.scale(creature.direction, 1);

    ctx.fillStyle = "#40352b";
    ctx.fillRect(-10, -5 - Math.max(0, step), 8, 5);
    ctx.fillRect(3, -5 - Math.max(0, -step), 8, 5);

    ctx.fillStyle = "#5e744a";
    ctx.beginPath();
    ctx.ellipse(0, -13, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#faf0e6";
    ctx.fillRect(2, -17, 4, 4);
    ctx.fillRect(9, -17, 4, 4);
    ctx.restore();
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
    enemies.forEach(drawCreature);
    drawPlayer();
    ctx.restore();

    // Section names are drawn in screen space; they never collide with the player.
    const section = [...(level.config.sections ?? [])].reverse().find((entry) => player.x >= entry.x);
    if (section) {
        ctx.fillStyle = "rgba(250, 240, 230, 0.95)";
        ctx.fillRect(12, 12, canvas.width - 24, 55);
        ctx.fillStyle = "#3d5f26";
        ctx.font = "bold 17px Georgia";
        ctx.fillText(section.title, 25, 34);
        ctx.font = "13px Arial";
        ctx.fillText(section.hint, 25, 55);
    }

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
    if (document.activeElement === canvas) {
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

status.textContent = "Click inside the game to begin The First Adventure.";
avatar.load();
requestAnimationFrame(gameLoop);