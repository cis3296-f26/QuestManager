import { drawRigLayer } from "./AvatarRig.js";

export class AvatarRenderer {
    constructor() { this.layers = []; }

    async load() {
        const version = this.loadVersion = (this.loadVersion ?? 0) + 1;
        this.layers = [];
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
            const definitions = stageLayers("avatar", equipped, SHOP_ITEMS,
                data.session.user.user_metadata?.appearance);
            const layers = await Promise.all(definitions.map(async (layer) => {
                const sources = layer.frames?.length ? layer.frames : [layer.src];
                const frames = await Promise.all(sources.map(load));
                if (!frames[0]) return null;
                // Current wardrobe assets are horizontal sheets (four 32px frames).
                // Older separate-frame images still use one full image per frame.
                const count = layer.count ?? 1;
                if (!Number.isInteger(count) || count < 1 ||
                    frames[0].naturalWidth % count !== 0) return null;
                const frameWidth = frames[0].naturalWidth / count;
                return {
                    // Keep indices aligned if a later frame is unavailable.
                    frames: frames.map((frame) => frame ?? frames[0]),
                    count,
                    rigged: [32, 128].includes(frameWidth) &&
                        frames[0].naturalHeight === frameWidth && /\.png$/i.test(layer.src)
                };
            }));
            // Missing body parts keep the fallback; a missing optional item is skipped.
            const baseComplete = definitions.every((layer, i) => !layer.base || layers[i]);
            if (layers[0] && baseComplete && version === this.loadVersion)
                this.layers = layers.filter(Boolean);
        } catch (error) {
            console.warn("Could not load the game avatar:", error);
        }
    }

    draw(ctx, player, { reduceMotion = false } = {}) {
        const animation = player.animation;
        // Keep limb/air/death state readable; omit bobbing, rotation and squash only in rendering.
        const pose = reduceMotion ? { ...animation.pose, lift: 0, tilt: 0, xScale: 1, yScale: 1, spriteFrame: 0 } : animation.pose;
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
                const count = layer.count ?? 1;
                const frameWidth = image.naturalWidth / count;
                const sourceX = (pose.spriteFrame % count) * frameWidth;
                ctx.save();
                if (layer.rigged) {
                    ctx.translate(-player.height / 2, -player.height);
                    ctx.scale(player.height / 128, player.height / 128);
                    drawRigLayer(ctx, image, pose, {
                        x: sourceX, width: frameWidth, height: image.naturalHeight
                    });
                } else {
                    // Preserve legacy item pictures without slicing them into body parts.
                    const scale = player.height / Math.max(frameWidth, image.naturalHeight);
                    const w = frameWidth * scale, h = image.naturalHeight * scale;
                    ctx.drawImage(image, sourceX, 0, frameWidth, image.naturalHeight,
                        -w / 2, -h, w, h);
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


