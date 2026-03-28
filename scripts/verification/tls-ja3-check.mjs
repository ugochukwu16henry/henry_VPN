import { fetchWithResidentialProxy } from "../../packages/residential-proxy/dist/index.js";

const configuredTargets = process.env.JA3_TARGET_URLS ?? process.env.JA3_TARGET_URL;
const TARGETS = configuredTargets
  ? configuredTargets.split(",").map(item => item.trim()).filter(Boolean)
  : ["https://ja3er.com/json", "https://tls.peet.ws/api/all"];
const REQUEST_TIMEOUT_MS = Number(process.env.JA3_TIMEOUT_MS ?? 15000);
const RETRIES = Number(process.env.JA3_RETRIES ?? 2);

function fail(message) {
  console.error(`[TLS CHECK] FAIL: ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`[TLS CHECK] PASS: ${message}`);
}

function warn(message) {
  console.warn(`[TLS CHECK] WARN: ${message}`);
}

async function main() {
  const noProxyConfigured = !process.env.HTTP_PROXY && !process.env.HTTPS_PROXY;
  if (noProxyConfigured) {
    warn("No HTTP_PROXY/HTTPS_PROXY set. This check may run direct instead of residential path.");
  }

  const errors = [];

  for (const target of TARGETS) {
    console.log(`[TLS CHECK] Requesting ${target} through residential proxy transport...`);

    for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
      try {
        const response = await fetchWithResidentialProxy(target, {
          method: "GET",
          timeout: {
            request: REQUEST_TIMEOUT_MS
          }
        });

        const payload = JSON.parse(response.body);
        validatePayload(payload);
        pass(`JA3 fields present via ${target} (attempt ${attempt}/${RETRIES}).`);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${target} (attempt ${attempt}/${RETRIES}): ${message}`);
      }
    }
  }

  fail(`Unable to validate JA3 fingerprint. Tried targets: ${errors.join(" | ")}`);
}

function validatePayload(payload) {
  const ja3 = payload?.ja3 ?? payload?.ja3_text ?? payload?.ja3_string;
  const ja3Hash = payload?.ja3_hash ?? payload?.ja3_md5 ?? payload?.tls?.ja3_hash;
  const userAgent = payload?.UserAgent ?? payload?.user_agent ?? payload?.userAgent;

  if (!ja3 && !ja3Hash) {
    throw new Error("Endpoint did not return JA3 fingerprint fields.");
  }

  if (typeof userAgent === "string") {
    if (/node\.js/i.test(userAgent)) {
      throw new Error(`User-Agent still looks like Node.js (${userAgent}).`);
    }

    if (!/chrome|chromium/i.test(userAgent)) {
      warn(`User-Agent does not look browser-like (${userAgent}).`);
    }
  }

  if (!ja3Hash) {
    warn("JA3 hash field missing but JA3 fingerprint data exists.");
  }
}

main();
