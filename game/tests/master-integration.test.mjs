import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

for (const [scenario, description] of [
    ['tasks', 'upstream timed/typed tasks preserve model rewards and legacy call defaults'],
    ['avatar', 'actual game avatar loads equipped shop layers and clears them for another account'],
    ['session', 'shared session loads each account separately and clears on sign-out']
]) test(description, () => {
    const output = execFileSync(process.execPath, ['--experimental-vm-modules', '--no-warnings',
        fileURLToPath(new URL('./helpers/masterIntegration.cjs', import.meta.url)), scenario],
    { encoding: 'utf8', timeout: 10000 });
    assert.match(output, new RegExp(`PASS ${scenario}`));
});
