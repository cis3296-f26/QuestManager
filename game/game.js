const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const status = document.getElementById("gameStatus");

const groundY = 460;
const speed = 280;
const gravity = 1800;
const jumpStrength = 650;
const worldWidth = 1800;

const platforms = [
    { x: 0, y: groundY, width: worldWidth, height: 80 },
    { x: 220, y: 370, width: 150, height: 24 },
    { x: 440, y: 280, width: 150, height: 24 },
    { x: 660, y: 190, width: 150, height: 24 },

    // A second staircase, farther down the level.
    { x: 920, y: 370, width: 150, height: 24 },
    { x: 1140, y: 280, width: 150, height: 24 },
    { x: 1360, y: 190, width: 150, height: 24 }
];

const finishPlatform = platforms[platforms.length - 1];
const flagX = finishPlatform.x + finishPlatform.width - 40;
let levelComplete = false;

const player = {
    x: 80,
    y: groundY - 64,
    width: 32,
    height: 64,
    velocityY: 0,
    grounded: true
};

const keys = new Set();
let lastTime = null;

// Click the game to give it keyboard focus.
canvas.addEventListener("pointerdown", () => {
    canvas.focus();
});

function restartLevel() {
    player.x = 80;
    player.y = groundY - player.height;
    player.velocityY = 0;
    player.grounded = true;
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

function update(dt) {
    if (levelComplete) return;
    const left = keys.has("ArrowLeft") || keys.has("KeyA");
    const right = keys.has("ArrowRight") || keys.has("KeyD");

    player.x += (Number(right) - Number(left)) * speed * dt;

    player.x = Math.max(
        0,
        Math.min(worldWidth - player.width, player.x)
    );

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

    const cameraX = Math.max(
        0,
        Math.min(player.x - canvas.width / 2, worldWidth - canvas.width)
    );

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

    drawPlayer();
    ctx.restore();
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