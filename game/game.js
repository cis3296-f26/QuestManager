import { level1 } from "./levels/Level1.js";
import { Player } from "./entities/Player.js";
import { Enemy } from "./entities/Enemy.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const status = document.getElementById("gameStatus");

const { groundY, worldWidth, platforms, spawn } = level1;
const speed = 280;
const gravity = 1800;
const jumpStrength = 650;

const finishPlatform = level1.finish.platform;
const flagX = finishPlatform.x + finishPlatform.width - level1.finish.flagInset;
let levelComplete = false;

const player = new Player(spawn);

const keys = new Set();
let lastTime = null;
let cameraX = 0;
const deathDelay = 0.35;
let deathTimeLeft = 0;

const creature = new Enemy(level1.creature, groundY);

// Click the game to give it keyboard focus.
canvas.addEventListener("pointerdown", () => {
    canvas.focus();
});

function restartLevel() {
    player.reset(spawn);
    creature.reset();
    cameraX = 0;
    deathTimeLeft = 0;
    levelComplete = false;
    keys.clear();

    status.textContent = "Reach the flag! Press R to restart.";
}

canvas.addEventListener("keydown", event => {

    if (event.code === "KeyR") {
        event.preventDefault();
        if (!event.repeat) restartLevel();
        return;
    }

    if (levelComplete) return;
    if (levelComplete || deathTimeLeft > 0) return;

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
        player.velocityY = -jumpStrength;
        player.grounded = false;
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
    if (levelComplete) return;
    if (deathTimeLeft > 0) {
        deathTimeLeft -= dt;
        if (deathTimeLeft <= 0) restartLevel();
        return;
    }
    const left = keys.has("ArrowLeft") || keys.has("KeyA");
    const right = keys.has("ArrowRight") || keys.has("KeyD");

    const previousX = player.x;
    player.x += (Number(right) - Number(left)) * speed * dt;

    player.x = Math.max(
        0,
        Math.min(worldWidth - player.width, player.x)
    );

    player.trackMovement(previousX);

    // Remember where the feet were before falling this frame.
    const previousBottom = player.y + player.height;

    player.velocityY += gravity * dt;
    player.y += player.velocityY * dt;
    player.grounded = false;

    let landingY = Infinity;

    // Only land on a platform while moving downward.
    if (player.velocityY >= 0) {
        for (const platform of platforms) {
            const overlapsHorizontally =
                player.x + player.width > platform.x &&
                player.x < platform.x + platform.width;

            const crossedTop =
                previousBottom <= platform.y &&
                player.y + player.height >= platform.y;

            if (overlapsHorizontally && crossedTop) {
                landingY = Math.min(landingY, platform.y);
            }
        }
    }

    if (landingY !== Infinity) {
        player.y = landingY - player.height;
        player.velocityY = 0;
        player.grounded = true;
    }

    if (player.y >= canvas.height) {
        startDeath("You fell! Restarting…");
        return;
    }

    creature.update(dt);
    if (creature.touches(player)) {
        startDeath("A creature caught you! Restarting…");
        return;
    }

    // Keep the player slightly left of center so they can see what's ahead.
    const playerCenter = player.x + player.width / 2;
    const maxCameraX = Math.max(0, worldWidth - canvas.width);
    const targetCameraX = Math.max(
        0,
        Math.min(maxCameraX, playerCenter - canvas.width * 0.45)
    );

    // Ease toward the target at the same rate across frame rates.
    cameraX += (targetCameraX - cameraX) * (1 - Math.exp(-8 * dt));

    // Finish when the player lands or walks onto the flag.
    if (
        player.grounded &&
        player.y + player.height === finishPlatform.y &&
        player.x <= flagX &&
        player.x + player.width >= flagX
    ) {
        levelComplete = true;
        status.textContent = "Level 1 complete! Press R to play again.";
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
    const isActive = deathTimeLeft === 0 && !levelComplete;
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

function drawCreature() {
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

    const flagTop = finishPlatform.y - 60;

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

    drawCreature();
    drawPlayer();
    ctx.restore();
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

status.textContent = "Click inside the game, then move and jump!";
loadGameAvatar();
requestAnimationFrame(gameLoop);