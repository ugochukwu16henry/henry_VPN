import { spawn } from "node:child_process";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      ...options
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", chunk => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", code => {
      resolve({ code, stdout, stderr });
    });
  });
}

function pass(message) {
  console.log(`[KILLSWITCH CHECK] PASS: ${message}`);
}

function fail(message) {
  console.error(`[KILLSWITCH CHECK] FAIL: ${message}`);
  process.exit(1);
}

function skip(message) {
  console.warn(`[KILLSWITCH CHECK] SKIP: ${message}`);
  process.exit(0);
}

async function main() {
  if (process.env.KILLSWITCH_DISRUPTIVE !== "1") {
    skip("Set KILLSWITCH_DISRUPTIVE=1 to run this disruptive check.");
  }

  if (process.platform === "win32") {
    skip("Kill-switch test requires Linux/WSL with iptables and wg-quick.");
  }

  const checkWg = await run("which", ["wg-quick"]);
  const checkCurl = await run("which", ["curl"]);

  if (checkWg.code !== 0 || checkCurl.code !== 0) {
    skip("Missing required commands (`wg-quick` and/or `curl`) on this machine.");
  }

  const iface = process.env.WG_INTERFACE ?? "wg0";
  const down = await run("sudo", ["wg-quick", "down", iface]);
  if (down.code !== 0) {
    skip(`Unable to bring down ${iface}. Run this check with sudo privileges.`);
  }

  const curl = await run("curl", ["--max-time", "8", "https://google.com"]);
  if (curl.code === 0) {
    fail("Outbound traffic still succeeded after tunnel down; kill-switch is not fail-closed.");
  }

  pass("Outbound traffic blocked after tunnel down; kill-switch appears fail-closed.");
}

main().catch(error => {
  fail(error instanceof Error ? error.message : String(error));
});
