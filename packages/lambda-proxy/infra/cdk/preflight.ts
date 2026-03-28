import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

const DEFAULT_REGIONS = ["us-east-1", "eu-west-1", "ap-southeast-1"];
const REGION_PATTERN = /^[a-z]{2}-[a-z]+-\d$/;

type PreflightConfig = {
  regions: string[];
  stage: string;
  expectedAccountId?: string;
};

async function main() {
  const config = readConfig();
  validateConfig(config);

  const identity = await getCallerIdentity();
  const accountId = identity.Account;

  if (!accountId) {
    throw new Error("Unable to determine AWS account from STS identity.");
  }

  if (config.expectedAccountId && config.expectedAccountId !== accountId) {
    throw new Error(
      `AWS account mismatch. Expected ${config.expectedAccountId}, got ${accountId}.`
    );
  }

  console.log(
    `[PREFLIGHT] PASS stage=${config.stage} account=${accountId} regions=${config.regions.join(",")}`
  );
}

function readConfig(): PreflightConfig {
  const regions = (process.env.DEPLOY_REGIONS ?? DEFAULT_REGIONS.join(","))
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);

  const stage = (process.env.STAGE ?? "dev").trim();
  const expectedAccountId = process.env.EXPECTED_AWS_ACCOUNT_ID?.trim();

  return {
    regions,
    stage,
    expectedAccountId
  };
}

function validateConfig(config: PreflightConfig) {
  if (config.regions.length === 0) {
    throw new Error("DEPLOY_REGIONS is empty. Provide at least one AWS region.");
  }

  for (const region of config.regions) {
    if (!REGION_PATTERN.test(region)) {
      throw new Error(`Invalid AWS region '${region}'.`);
    }
  }

  if (!config.stage) {
    throw new Error("STAGE must be non-empty.");
  }
}

async function getCallerIdentity() {
  const region = process.env.AWS_REGION ?? process.env.CDK_DEFAULT_REGION ?? DEFAULT_REGIONS[0];
  const client = new STSClient({ region });

  try {
    return await client.send(new GetCallerIdentityCommand({}));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`AWS credential check failed: ${message}`);
  }
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[PREFLIGHT] FAIL ${message}`);
  process.exit(1);
});
