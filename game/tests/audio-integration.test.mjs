import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("actual game events connect audio without changing pause, progress or navigation", () => {
    const output = execFileSync(process.execPath, ["--experimental-vm-modules", "--no-warnings",
        fileURLToPath(new URL("./helpers/pauseGameHarness.cjs", import.meta.url))], {
        encoding: "utf8", timeout: 20000, env: { ...process.env, QUESTMANAGER_TEST_AUDIO: "1" }
    });
    assert.match(output, /PASS actual audio wiring/);
    assert.match(output, /PASS actual game wiring/);
});
