import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageDir = path.resolve(__dirname, "../..");

const defaultRegions = ["us-east-1", "eu-west-1", "ap-southeast-1"];
const regions = (process.env.DEPLOY_REGIONS ?? defaultRegions.join(","))
  .split(",")
  .map(region => region.trim())
  .filter(Boolean);

async function main() {
  for (const region of regions) {
    await runCdk(region, "bootstrap");
    await runCdk(region, "deploy");
  }

  console.log(`Deployment flow completed for regions: ${regions.join(", ")}`);
}

function runCdk(region: string, action: "bootstrap" | "deploy"): Promise<void> {
  const args =
    action === "bootstrap"
      ? ["cdk", "bootstrap", "--app", "node --import tsx ./infra/cdk/app.ts"]
      : [
          "cdk",
          "deploy",
          "--require-approval",
          "never",
          "--app",
          "node --import tsx ./infra/cdk/app.ts"
        ];

  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", args, {
      cwd: packageDir,
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        CDK_DEFAULT_REGION: region
      }
    });

    child.on("close", code => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`cdk ${action} failed for region ${region} with exit code ${code ?? "unknown"}`));
    });

    child.on("error", reject);
  });
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
