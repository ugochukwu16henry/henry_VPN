import { spawn } from "node:child_process";

const checks = [
  {
    name: "TLS JA3",
    command: "node",
    args: ["./scripts/verification/tls-ja3-check.mjs"]
  },
  {
    name: "WebRTC Leak",
    command: "node",
    args: ["./scripts/verification/webrtc-check.mjs"]
  },
  {
    name: "Kill-Switch",
    command: "node",
    args: ["./scripts/verification/killswitch-check.mjs"]
  }
];

const results = [];

for (const check of checks) {
  // Run each check in sequence so output remains readable and failures are attributable.
  const result = await runCheck(check.command, check.args);
  const status = classifyStatus(result);
  results.push({ name: check.name, status, code: result.code });
}

for (const result of results) {
  console.log(`[VERIFY] ${result.name}: ${result.status}`);
}

const hasFail = results.some(result => result.status === "FAIL");
if (hasFail) {
  process.exit(1);
}

function runCheck(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", chunk => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", chunk => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("error", reject);
    child.on("close", code => {
      resolve({ code, stdout, stderr });
    });
  });
}

function classifyStatus(result) {
  const combined = `${result.stdout}\n${result.stderr}`;

  if (/\[.*CHECK\] SKIP:/i.test(combined)) {
    return "SKIP";
  }

  if (result.code === 0) {
    return "PASS";
  }

  return "FAIL";
}
