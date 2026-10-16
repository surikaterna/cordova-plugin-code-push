const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const root = path.resolve(__dirname, "../..");
const ios = path.join(root, "src/ios");
const sdk = process.platform === "darwin"
    ? spawnSync("xcrun", ["--sdk", "iphoneos", "--show-sdk-path"], { encoding: "utf8" })
    : null;

function clang(t, files, includes = []) {
    const cache = fs.mkdtempSync(path.join(os.tmpdir(), "codepush-native-test-"));
    t.after(() => fs.rmSync(cache, { recursive: true, force: true }));
    for (const file of files) {
        const result = spawnSync("xcrun", [
            "clang", "-fsyntax-only", "-fobjc-arc", "-fmodules", "-fblocks",
            "-target", "arm64-apple-ios16.0", "-isysroot", sdk.stdout.trim(),
            "-fmodules-cache-path=" + cache,
            ...includes.flatMap(directory => ["-I", directory]), file
        ], { encoding: "utf8", timeout: 60000 });
        assert.equal(result.status, 0, result.stderr || String(result.error));
    }
}

test("WebKit loading switches to main before touching the web-view engine", () => {
    const source = fs.readFileSync(path.join(ios, "CodePush.m"), "utf8");
    const start = source.indexOf("- (void)loadURL:(NSURL*)url {");
    assert.ok(start >= 0);
    const method = source.slice(start, source.indexOf("\n}", start) + 2);
    assert.match(method, /if \(!\[NSThread isMainThread\]\)\s*\{\s*dispatch_sync\(dispatch_get_main_queue\(\),\s*\^\{\s*\[self loadURL:url\];\s*\}\);\s*return;/);
    assert.ok(method.indexOf("[NSThread isMainThread]") < method.indexOf("[self.webViewEngine loadRequest:"));
    assert.equal((method.match(/dispatch_sync/g) || []).length, 1);
    assert.doesNotMatch(source, /CodePushUseBundledClient/);
});

test("model implementations compile without a project prefix header", { skip: !sdk || sdk.status !== 0 }, t => {
    clang(t, ["Utilities.m", "InstallOptions.m", "StatusReport.m", "CodePushPackageMetadata.m", "CodePushPackageManager.m", "CodePushReportingManager.m", "UpdateHashUtils.m"].map(file => path.join(ios, file)));
});

test("complete CodePush source compiles with Cordova headers at iOS 16", {
    skip: !sdk || sdk.status !== 0 || !process.env.CORDOVA_IOS_HEADERS
}, t => {
    const includes = [process.env.CORDOVA_IOS_HEADERS];
    function directories(directory) {
        includes.push(directory);
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            if (entry.isDirectory()) directories(path.join(directory, entry.name));
        }
    }
    directories(ios);
    clang(t, [path.join(ios, "CodePush.m")], includes);
});
