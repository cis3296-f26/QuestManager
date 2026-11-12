// The existing 128px avatar has separate limb regions below its large head.
// Partition the original pixels at their joints, without replacing the artwork.
export function drawRigLayer(ctx, image, pose) {
    const part = (x, y, width, height, pivotX, pivotY, angle = 0) => {
        ctx.save();
        ctx.translate(pivotX, pivotY);
        ctx.rotate(angle);
        ctx.drawImage(image, x, y, width, height, x - pivotX, y - pivotY, width, height);
        ctx.restore();
    };
    // Feet shift a few pixels between idle frames, so include the full bottom row.
    part(44, 108, 20, 4, 54, 108, pose.leftLeg);
    part(0, 112, 64, 16, 54, 108, pose.leftLeg);
    part(64, 108, 20, 4, 74, 108, pose.rightLeg);
    part(64, 112, 64, 16, 74, 108, pose.rightLeg);
    part(44, 80, 40, 28, 64, 80);
    part(0, 80, 44, 32, 44, 84, pose.leftArm);
    part(84, 80, 44, 32, 84, 84, pose.rightArm);
    part(0, 0, 128, 80, 64, 80);
}
