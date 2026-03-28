import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

const DEFAULT_REGIONS = ["us-east-1", "eu-west-1", "ap-southeast-1"];

type SmokeConfig = {
  regions: string[];
  functionBase: string;
  targetUrl: string;
  timeoutMs: number;
};

async function main() {
  const config = readConfig();
  validateConfig(config);

  for (const region of config.regions) {
    await runRegionSmoke(region, config);
  }

  console.log(`[SMOKE] PASS regions=${config.regions.join(",")}`);
}

function readConfig(): SmokeConfig {
  const regions = (process.env.DEPLOY_REGIONS ?? DEFAULT_REGIONS.join(","))
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);

  return {
    regions,
    functionBase: process.env.LAMBDA_FUNCTION_BASE ?? "henry-vpn-proxy",
    targetUrl: process.env.SMOKE_TARGET_URL ?? "https://api.ipify.org?format=json",
    timeoutMs: Number(process.env.SMOKE_TIMEOUT_MS ?? 15000)
  };
}

function validateConfig(config: SmokeConfig) {
  if (config.regions.length === 0) {
    throw new Error("DEPLOY_REGIONS is empty.");
  }

  if (!config.targetUrl.startsWith("http://") && !config.targetUrl.startsWith("https://")) {
    throw new Error(`SMOKE_TARGET_URL must be http/https. Got: ${config.targetUrl}`);
  }

  if (!Number.isFinite(config.timeoutMs) || config.timeoutMs <= 0) {
    throw new Error(`SMOKE_TIMEOUT_MS must be a positive number. Got: ${config.timeoutMs}`);
  }
}

async function runRegionSmoke(region: string, config: SmokeConfig) {
  const functionName = `${config.functionBase}-${region}`;
  const client = new LambdaClient({ region });

  const payload = {
    targetUrl: config.targetUrl,
    method: "GET",
    timeoutMs: config.timeoutMs
  };

  console.log(`[SMOKE] invoking ${functionName} in ${region} target=${config.targetUrl}`);

  const result = await client.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: "RequestResponse",
      Payload: Buffer.from(JSON.stringify(payload))
    })
  );

  if (result.FunctionError) {
    throw new Error(`Lambda function error in ${region}: ${result.FunctionError}`);
  }

  const responseText = result.Payload ? Buffer.from(result.Payload).toString("utf8") : "";
  const responseJson = parseJsonOrThrow(responseText, `Unable to parse invoke response in ${region}`);

  const statusCode = responseJson?.statusCode;
  if (typeof statusCode !== "number") {
    throw new Error(`Missing numeric statusCode in ${region} response: ${responseText}`);
  }

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Non-success statusCode from ${region}: ${statusCode}`);
  }

  console.log(`[SMOKE] PASS region=${region} function=${functionName} statusCode=${statusCode}`);
}

function parseJsonOrThrow(text: string, message: string): any {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${message}. Raw payload: ${text}`);
  }
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[SMOKE] FAIL ${message}`);
  process.exit(1);
});
