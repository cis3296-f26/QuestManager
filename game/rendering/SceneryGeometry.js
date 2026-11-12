// Full silhouettes, including canopy circles and the wide supporting branches.
// Used for authoring checks/culling only; scenery never enters physics collision.
export function treeBounds(tree, groundY = 460) {
    if (tree.type === "tree") {
        const scale = tree.scale ?? 1;
        return { x: tree.x - 50 * scale, y: groundY - 128 * scale,
            width: 98 * scale, height: 128 * scale };
    }
    if (tree.type === "branch-tree") {
        const reach = Math.max(70, (tree.reach ?? 0) + 5);
        return { x: tree.x - reach, y: tree.top - 144,
            width: reach * 2, height: groundY - tree.top + 144 };
    }
    return null;
}

export function validateTreeSpacing(scenery = [], groundY = 460, gap = 16) {
    const trees = scenery.map(tree => ({ tree, bounds: treeBounds(tree, groundY) })).filter(t => t.bounds);
    const errors = [];
    for (let a = 0; a < trees.length; a++) for (let b = a + 1; b < trees.length; b++) {
        const x = trees[a].bounds, y = trees[b].bounds;
        if (x.x < y.x + y.width + gap && x.x + x.width + gap > y.x &&
            x.y < y.y + y.height && x.y + x.height > y.y) {
            errors.push(`Foreground trees at ${trees[a].tree.x} and ${trees[b].tree.x} overlap or lack canopy spacing.`);
        }
    }
    return errors;
}
