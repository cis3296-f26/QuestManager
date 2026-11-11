const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;

// Discovery is attempt state only. Coins and permanent progress stay in their existing systems.
export class Exploration {
    constructor(areas = []) {
        this.areas = areas;
        this.reset();
    }

    reset() {
        this.discovered = new Set();
        this.exited = new Set();
        this.reveal = new Map(this.areas.map((area) => [area.id, 0]));
        this.notice = null;
        this.noticeTime = 0;
    }

    update(player, dt) {
        this.noticeTime = Math.max(0, this.noticeTime - dt);
        const found = [];
        const supportId = player.supportPlatform?.id ?? player.supportPlatform?.config?.id;
        for (const area of this.areas) {
            // Reveal before entry, so scenery never requires a blind leap.
            const near = { x: area.bounds.x - 140, y: area.bounds.y - 90,
                width: area.bounds.width + 280, height: area.bounds.height + 180 };
            const target = overlaps(player, near) ? 1 : 0;
            const previous = this.reveal.get(area.id) ?? 0;
            this.reveal.set(area.id, previous + (target - previous) * (1 - Math.exp(-12 * dt)));
            if (!this.discovered.has(area.id) && player.grounded && overlaps(player, area.bounds) &&
                area.discoveryPlatforms.includes(supportId)) {
                this.discovered.add(area.id);
                this.notice = area.title;
                this.noticeTime = 2.5;
                found.push(area.id);
            }
            if (this.discovered.has(area.id) && player.grounded && overlaps(player, area.exit)) this.exited.add(area.id);
        }
        return found;
    }
}
