// Flat canvas scenery with gentle parallax. No physics or level state is changed.
export class GrasslandRenderer {
    drawBackground(ctx, viewWidth, viewHeight, cameraX, groundY) {
        ctx.save();
        ctx.fillStyle = "#b9e1ef";
        ctx.fillRect(0, 0, viewWidth, viewHeight);

        ctx.fillStyle = "#f6edc7";
        ctx.beginPath();
        ctx.arc(viewWidth - 115, 108, 23, 0, Math.PI * 2);
        ctx.fill();

        // Clouds and hills move more slowly than the foreground.
        const cloudOffset = cameraX * 0.12;
        const firstCloud = Math.floor(cloudOffset / 330) - 1;
        for (let i = firstCloud; i < firstCloud + Math.ceil(viewWidth / 330) + 3; i++) {
            const x = i * 330 - cloudOffset;
            const y = 112 + ((i * 47 % 70) + 70) % 70;
            this.drawCloud(ctx, x, y);
        }
        this.drawHills(ctx, viewWidth, viewHeight, cameraX * 0.18,
            groundY + 8, 710, 175, "#a3c7b0");
        this.drawHills(ctx, viewWidth, viewHeight, cameraX * 0.32,
            groundY + 42, 530, 170, "#83ae8d");
        ctx.restore();
    }

    drawCloud(ctx, x, y) {
        ctx.fillStyle = "#f5fbfc";
        ctx.beginPath();
        ctx.ellipse(x, y, 43, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x - 15, y - 8, 19, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 13, y - 12, 23, 20, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawHills(ctx, width, height, offset, base, period, rise, color) {
        ctx.fillStyle = color;
        const start = Math.floor(offset / period) - 1;
        for (let i = start; i < start + Math.ceil(width / period) + 3; i++) {
            const x = i * period - offset;
            ctx.beginPath();
            ctx.moveTo(x, height);
            ctx.lineTo(x, base);
            ctx.quadraticCurveTo(x + period / 2, base - rise, x + period, base);
            ctx.lineTo(x + period, height);
            ctx.closePath();
            ctx.fill();
        }
    }

    drawDecorations(ctx, decorations, groundY, cameraX, viewWidth) {
        ctx.save();
        for (const decoration of decorations) {
            if (decoration.x < cameraX - 90 || decoration.x > cameraX + viewWidth + 90) continue;
            ctx.save();
            ctx.translate(decoration.x, groundY);
            if (decoration.type === "tree") {
                ctx.fillStyle = "#795c3f";
                ctx.fillRect(-9, -67, 18, 67);
                ctx.fillStyle = "#4e7446";
                for (const [x, y, radius] of [[-23, -75, 27], [19, -77, 29], [0, -98, 30]]) {
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = "#709052";
                ctx.beginPath();
                ctx.arc(-9, -107, 17, 0, Math.PI * 2);
                ctx.fill();
            } else if (decoration.type === "bush") {
                ctx.fillStyle = "#698c4f";
                for (const [x, y, radius] of [[-13, -9, 12], [0, -14, 15], [15, -9, 11]]) {
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (decoration.type === "flowers") {
                for (let i = 0; i < 3; i++) {
                    const x = i * 9 - 9, y = -10 - (i % 2) * 5;
                    ctx.strokeStyle = "#5e744a";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                    ctx.fillStyle = "#faf0e6";
                    ctx.fillRect(x - 3, y - 1, 7, 3);
                    ctx.fillRect(x - 1, y - 3, 3, 7);
                    ctx.fillStyle = "#d7ad48";
                    ctx.fillRect(x - 1, y - 1, 3, 3);
                }
            }
            ctx.restore();
        }
        ctx.restore();
    }

    drawPlatforms(ctx, platforms, cameraX, viewWidth) {
        ctx.save();
        for (const platform of platforms) {
            if (platform.x + platform.width < cameraX || platform.x > cameraX + viewWidth) continue;
            const { x, y, width, height } = platform;
            ctx.fillStyle = "#a47f58";
            ctx.fillRect(x, y, width, height);
            ctx.fillStyle = "#896746";
            ctx.fillRect(x, y + height - 4, width, 4);
            ctx.fillRect(x, y + 8, 3, height - 8);
            ctx.fillRect(x + width - 3, y + 8, 3, height - 8);

            // Work only on visible dirt tiles, even on very long ground segments.
            const first = Math.max(0, Math.floor((cameraX - x) / 32));
            const last = Math.min(Math.ceil(width / 32), Math.ceil((cameraX + viewWidth - x) / 32));
            for (let tile = first; tile < last; tile++) {
                const tileX = x + tile * 32;
                if (tileX + 22 < x + width - 3) {
                    ctx.fillStyle = tile % 2 ? "#b28c63" : "#94704d";
                    ctx.fillRect(tileX + 10, y + Math.min(height - 9, 17 + tile % 3 * 5), 8, 3);
                }
                if (height > 40 && tileX + 19 < x + width - 3) {
                    ctx.fillStyle = "#896746";
                    ctx.fillRect(tileX + 15, y + 49, 4, 3);
                }
            }

            // The visible grass top stays exactly at the collision surface.
            ctx.fillStyle = "#638647";
            ctx.fillRect(x, y, width, 8);
            ctx.fillStyle = "#86a75b";
            ctx.fillRect(x, y, width, 3);
            ctx.fillStyle = "#638647";
            for (let tile = first; tile < last; tile++) {
                const bladeX = x + tile * 32 + 12;
                if (bladeX + 8 >= x + width) continue;
                ctx.beginPath();
                ctx.moveTo(bladeX, y + 8);
                ctx.lineTo(bladeX + 4, y + 12);
                ctx.lineTo(bladeX + 8, y + 8);
                ctx.fill();
            }
        }
        ctx.restore();
    }
}
