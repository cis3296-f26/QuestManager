import { drawRigLayer } from "./AvatarRig.js";

export class AvatarRenderer {
    constructor() { this.layers = []; }

    async load() {
        try {
            const [{ supabase }, { loadPlayer }, { SHOP_ITEMS }, { cleanEquipped }, { stageLayers }] =
                await Promise.all([
                    import("../../main/users/supabaseClient.js"),
                    import("../../main/users/playerData.js"),
                    import("../../main/shop/shopItems.js"),
                    import("../../main/customize/avatar/loadout.js"),
                    import("../../main/customize/avatar/stage.js")
                ]);
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            if (!data.session) return;

            const saved = await loadPlayer(data.session.user.id);
            const equipped = cleanEquipped(SHOP_ITEMS, saved.inventory, saved.equipped ?? []);
            const root = new URL("../../", import.meta.url);
            const images = new Map();
            const load = (src) => {
                if (!images.has(src)) images.set(src, (async () => {
                    const image = new Image();
                    image.src = new URL(src, root).href;
                    try { await image.decode(); return image; }
                    catch { return null; }
                })());
                return images.get(src);
            };
            const layers = await Promise.all(stageLayers("avatar", equipped).map(async (layer) => {
                const sources = layer.frames?.length ? layer.frames : [layer.src];
                const frames = await Promise.all(sources.map(load));
                if (!frames[0]) return null;
                return {
                    // Keep indices aligned if a later frame is unavailable.
                    frames: frames.map((frame) => frame ?? frames[0]),
                    rigged: frames[0].naturalWidth === 128 &&
                        frames[0].naturalHeight === 128 && /\.png$/i.test(layer.src)
                };
            }));
            // A missing base keeps the animated stick figure as a fallback.
            if (layers[0]) this.layers = layers.filter(Boolean);
        } catch (error) {
            console.warn("Could not load the game avatar:", error);
        }
    }

    draw(ctx, player) {
        const animation = player.animation;
        const pose = animation.pose;
        const anchor = animation.state === "dead" ? animation.deathAnchor : null;
        const x = anchor?.x ?? player.x + player.width / 2;
        const feetY = anchor?.feetY ?? player.y + player.height;
        ctx.save();
        ctx.globalAlpha *= Math.max(0, pose.opacity);
        ctx.translate(x, feetY - pose.lift);
        ctx.scale(player.facing, 1);
        ctx.rotate(pose.tilt);
        ctx.scale(pose.xScale, pose.yScale);

        if (this.layers.length) {
            ctx.imageSmoothingEnabled = false;
            // All matching PNG layers use the same joint transforms and frame clock.
            for (const layer of this.layers) {
                const image = layer.frames[pose.spriteFrame % layer.frames.length];
                ctx.save();
                if (layer.rigged) {
                    ctx.translate(-player.height / 2, -player.height);
                    ctx.scale(player.height / 128, player.height / 128);
                    drawRigLayer(ctx, image, pose);
                } else {
                    // Preserve legacy item pictures without slicing them into body parts.
                    const scale = player.height / Math.max(image.naturalWidth, image.naturalHeight);
                    const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
                    ctx.drawImage(image, -w / 2, -h, w, h);
                }
                ctx.restore();
            }
        } else {
            this.drawFallback(ctx, pose);
        }
        ctx.restore();
    }

    drawFallback(ctx, pose) {
        ctx.strokeStyle = "#222";
        ctx.fillStyle = "#faf0e6";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, -52, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -42);
        ctx.lineTo(0, -22);
        ctx.stroke();
        const limb = (x, y, endX, endY, angle) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            ctx.restore();
        };
        limb(0, -37, -12, 10, pose.leftArm);
        limb(0, -37, 12, 10, pose.rightArm);
        limb(0, -22, -12, 20, pose.leftLeg);
        limb(0, -22, 12, 20, pose.rightLeg);
    }
}
