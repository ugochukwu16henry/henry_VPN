import {
  browseTo,
  createBrowser,
  createStealthContext
} from "../../packages/stealth-browser/dist/index.js";

const TARGET = process.env.WEBRTC_TARGET_URL ?? "https://browserleaks.com/webrtc";

const PRIVATE_IP_PATTERNS = [
  /\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  /\b192\.168\.\d{1,3}\.\d{1,3}\b/g,
  /\b172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}\b/g,
  /\b127\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  /\bfc[0-9a-f]{2}:[0-9a-f:]+\b/gi,
  /\bfd[0-9a-f]{2}:[0-9a-f:]+\b/gi,
  /\bfe80:[0-9a-f:]+\b/gi
];

function fail(message) {
  console.error(`[WEBRTC CHECK] FAIL: ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`[WEBRTC CHECK] PASS: ${message}`);
}

async function main() {
  const browser = await createBrowser({ headless: true });
  const { context, cleanup } = await createStealthContext(browser);

  try {
    const page = await browseTo(context, TARGET, { waitUntil: "load" });
    await page.waitForTimeout(4000);

    const text = await page.evaluate(() => document.body?.innerText ?? "");
    const leaked = PRIVATE_IP_PATTERNS.flatMap(pattern => text.match(pattern) ?? []);

    if (leaked.length > 0) {
      fail(`Detected private IP candidates in page output: ${[...new Set(leaked)].join(", ")}`);
    }

    pass("No private/local IP candidates detected in WebRTC output.");
  } finally {
    await context.close();
    await cleanup();
    await browser.close();
  }
}

main().catch(error => {
  fail(error instanceof Error ? error.message : String(error));
});
