import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("actual game entry point integrates pause, confirmations and settings without losing attempt state", () => {
    const output = execFileSync(process.execPath, ["--experimental-vm-modules", "--no-warnings",
        fileURLToPath(new URL("./helpers/pauseGameHarness.cjs", import.meta.url))], { encoding: "utf8", timeout: 20000 });
    assert.match(output, /PASS actual game wiring/);
});
