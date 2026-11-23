import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
test('actual game results count active play, retain retries, save valid records and reject assisted or stale finishes',()=>{
 const output=execFileSync(process.execPath,['--experimental-vm-modules','--no-warnings',fileURLToPath(new URL('./helpers/pauseGameHarness.cjs',import.meta.url))],
  {encoding:'utf8',timeout:20000,env:{...process.env,QUESTMANAGER_TEST_STATS:'1'}});
 assert.match(output,/PASS results wiring/);
});
