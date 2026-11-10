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
const deathDelay = 0.35;
let deathTimeLeft = 0;


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

let avatarImages = [];

async function loadGameAvatar() {
    try {
        const [
            { supabase },
            { loadPlayer },
            { SHOP_ITEMS },
            { cleanEquipped },
            { stageLayers }
        ] = await Promise.all([
            import("../main/users/supabaseClient.js"),
            import("../main/users/playerData.js"),
            import("../main/shop/shopItems.js"),
            import("../main/customize/avatar/loadout.js"),
            import("../main/customize/avatar/stage.js")
        ]);

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) return;

        const saved = await loadPlayer(data.session.user.id);
        const equipped = cleanEquipped(SHOP_ITEMS, saved.inventory, saved.equipped ?? []);
        const layers = stageLayers("avatar", equipped);

        const images = await Promise.all(layers.map(async ({ src }) => {
            const image = new Image();

            // Shop paths start at the app root, one folder above /game/.
            image.src = new URL(`../${src}`, document.baseURI).href;

            try {
                await image.decode();
                return image;
            } catch {
                return null;
            }
        }));

        // Keep the stick figure if the base sprite couldn't load.
        if (images[0]) avatarImages = images.filter(Boolean);
    } catch (error) {
        console.warn("Could not load the game avatar:", error);
    }
}

function drawPlayer() {
    const centerX = player.x + player.width / 2;
    const feetY = player.y + player.height;
    const isActive = deathTimeLeft === 0 && !level.complete;
    const isWalking = isActive && player.isMoving && player.grounded;

    const stride = isWalking ? Math.sin(player.walkPhase) : 0;
    const bounce = Math.abs(stride) * 3;

    let tilt = stride * 0.06;
    let stretchX = 1;
    let stretchY = 1;

    if (isActive && !player.grounded) {
        // Blend through a neutral pose at the top of the jump.
        const airMotion = Math.max(-1, Math.min(1, player.velocityY / 350));
        tilt = -airMotion * 0.14;
        stretchX = 1 + airMotion * 0.08;
        stretchY = 1 - airMotion * 0.10;
    }

    ctx.save();
    ctx.translate(centerX, feetY - bounce);
    ctx.scale(player.facing, 1);
    ctx.rotate(tilt);
    ctx.scale(stretchX, stretchY);
    ctx.translate(-centerX, -feetY);
    drawPlayerArt();
    ctx.restore();
}

function drawPlayerArt() {

    if (avatarImages.length > 0) {
        const size = player.height;
        const centerX = player.x + player.width / 2;
        const feetY = player.y + player.height;

        for (const image of avatarImages) {
            const scale = size / Math.max(image.naturalWidth, image.naturalHeight);
            const width = image.naturalWidth * scale;
            const height = image.naturalHeight * scale;

            ctx.drawImage(image, centerX - width / 2, feetY - height, width, height);
        }

        return;
    }

    // Temporary stick character, drawn without an image file.
    const centerX = player.x + player.width / 2;
    const top = player.y;

    ctx.strokeStyle = "#222";
    ctx.fillStyle = "#faf0e6";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    // Head.
    ctx.beginPath();
    ctx.arc(centerX, top + 12, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Body, arms, and legs.
    ctx.beginPath();
    ctx.moveTo(centerX, top + 22);
    ctx.lineTo(centerX, top + 42);

    ctx.moveTo(centerX - 12, top + 37);
    ctx.lineTo(centerX, top + 27);
    ctx.lineTo(centerX + 12, top + 37);

    ctx.moveTo(centerX - 12, top + 62);
    ctx.lineTo(centerX, top + 42);
    ctx.lineTo(centerX + 12, top + 62);
    ctx.stroke();
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

    // Sky.
    ctx.fillStyle = "#b9e1ef";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Distant hills.
    ctx.fillStyle = "#80a88b";
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(220, 240);
    ctx.lineTo(440, groundY);
    ctx.lineTo(700, 190);
    ctx.lineTo(canvas.width, groundY);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.translate(-cameraX, 0);

    // Draw the ground and floating platforms.
    for (const platform of platforms) {
        ctx.fillStyle = "#9e7954";
        ctx.fillRect(
            platform.x,
            platform.y,
            platform.width,
            platform.height
        );

        ctx.fillStyle = "#5e744a";
        ctx.fillRect(
            platform.x,
            platform.y,
            platform.width,
            10
        );
    }

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
    }

    draw();
    requestAnimationFrame(gameLoop);
}

status.textContent = "Click inside the game to begin The First Adventure.";
loadGameAvatar();
requestAnimationFrame(gameLoop);