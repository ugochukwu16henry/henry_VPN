import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageDir = path.resolve(__dirname, "../..");
const cdkDir = path.resolve(__dirname);

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
  const account = process.env.CDK_DEFAULT_ACCOUNT ?? process.env.AWS_ACCOUNT_ID;

  const args =
    action === "bootstrap"
      ? [
          "bootstrap",
          ...(account ? [`aws://${account}/${region}`] : [])
        ]
      : ["deploy", "--require-approval", "never"];

  return new Promise((resolve, reject) => {
    const isWindows = process.platform === "win32";
    const cdkBinary = isWindows
      ? path.resolve(packageDir, "node_modules", ".bin", "cdk.cmd")
      : path.resolve(packageDir, "node_modules", ".bin", "cdk");

    const env = {
      ...process.env,
      CDK_DEFAULT_REGION: region
    };

    const child = isWindows
      ? spawn(`${quote(cdkBinary)} ${args.map(quote).join(" ")}`, [], {
          cwd: cdkDir,
          stdio: "inherit",
          shell: true,
          env
        })
      : spawn(cdkBinary, args, {
          cwd: cdkDir,
          stdio: "inherit",
          shell: false,
          env
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

function quote(value: string): string {
  if (/\s/.test(value)) {
    return `"${value.replaceAll('"', '\\"')}"`;
  }

  return value;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
