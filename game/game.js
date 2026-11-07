const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const status = document.getElementById("gameStatus");

const groundY = 460;
const speed = 280;
const gravity = 1800;
const jumpStrength = 650;

// Each platform has a position and size.
// The first platform is the ground.
const platforms = [
    { x: 0, y: groundY, width: canvas.width, height: 80 },
    { x: 220, y: 370, width: 150, height: 24 },
    { x: 440, y: 280, width: 150, height: 24 },
    { x: 660, y: 190, width: 150, height: 24 }
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

canvas.addEventListener("keydown", event => {
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
        Math.min(canvas.width - player.width, player.x)
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
        status.textContent = "Level 1 complete! Refresh to play again.";
    }
}

function drawPlayer() {
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
requestAnimationFrame(gameLoop);