import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("actual development entry protects saves through menu, navigation and completion boundaries",()=>{
    const output=execFileSync(process.execPath,["--experimental-vm-modules","--no-warnings",
        fileURLToPath(new URL("./helpers/pauseGameHarness.cjs",import.meta.url))],{
        encoding:"utf8",timeout:20000,env:{...process.env,QUESTMANAGER_TEST_DEV:"1"}
    });
    assert.match(output,/PASS development entry wiring/);
});

test("local server flag defaults off, opt-in response is no-store, and never modifies tracked config",()=>{
    const script=fileURLToPath(new URL("../scripts/serve-development.py",import.meta.url));
    const output=execFileSync("python",["-c",`
import importlib.util, threading, urllib.request, sys
sys.dont_write_bytecode = True
from pathlib import Path
from http.server import ThreadingHTTPServer
spec=importlib.util.spec_from_file_location("dev_server", ${JSON.stringify(script)})
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
config=module.ROOT/"game/dev/buildConfig.js";before=config.read_bytes()
for enabled in (False,True):
    server=ThreadingHTTPServer(("127.0.0.1",0),module.handler_for(enabled))
    worker=threading.Thread(target=server.serve_forever,daemon=True);worker.start()
    try:
        url=f"http://127.0.0.1:{server.server_port}/game/dev/buildConfig.js?dev=true"
        with urllib.request.urlopen(url) as response:
            assert response.read().decode()==f"export const developmentBuild = {str(enabled).lower()};\\n"
            assert "no-store" in response.headers["Cache-Control"]
    finally:
        server.shutdown();server.server_close();worker.join()
assert config.read_bytes()==before
print("PASS local server flags")
`],{encoding:"utf8",timeout:10000});
    assert.match(output,/PASS local server flags/);
});
