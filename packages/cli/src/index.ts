#!/usr/bin/env node
import { config as loadEnv } from "dotenv";
import { Command } from "commander";

import { runBrowse } from "./commands/browse.js";
import { runProxyRotate, runProxyTest } from "./commands/proxy.js";
import { runWgCommand } from "./commands/wg.js";

loadEnv();

const program = new Command();

program
  .name("henry-vpn")
  .description("Unified CLI for WireGuard, residential proxy, lambda rotation, and stealth browser flows")
  .version("0.1.0");

program
  .command("wg")
  .description("Run WireGuard operations")
  .argument(
    "<action>",
    "up|down|status|add-peer|revoke-peer|kill-switch-enable|kill-switch-disable|kill-switch-status"
  )
  .option("--peer <name>", "Peer name for add-peer/revoke-peer")
  .action(async (action: string, options: { peer?: string }) => {
    await runWgCommand(action, options.peer);
  });

program
  .command("proxy-test")
  .description("Send a request through the residential proxy transport")
  .option("--url <url>", "URL to request", "https://ja3er.com/json")
  .action(async (options: { url: string }) => {
    await runProxyTest(options.url);
  });

program
  .command("proxy-rotate")
  .description("Invoke region-hopping lambda proxy")
  .requiredOption("--function-base <name>", "Base Lambda function name prefix")
  .option("--target <url>", "Target URL", "https://api.ipify.org?format=json")
  .option("--regions <list>", "Comma separated regions", "us-east-1,eu-west-1,ap-southeast-1")
  .action(async (options: { functionBase: string; target: string; regions: string }) => {
    const regions = options.regions.split(",").map(region => region.trim()).filter(Boolean);
    await runProxyRotate(options.functionBase, options.target, regions);
  });

program
  .command("browse")
  .description("Open a target with stealth browser defaults")
  .argument("<url>", "URL to open")
  .option("--headful", "Run browser in headful mode", false)
  .option("--proxy-url <url>", "Authenticated upstream proxy URL")
  .option("--storage-state <path>", "Path to storage state JSON")
  .action(
    async (
      url: string,
      options: { headful: boolean; proxyUrl?: string; storageState?: string }
    ) => {
      await runBrowse(url, {
        headless: !options.headful,
        proxyUrl: options.proxyUrl,
        storageStatePath: options.storageState
      });
    }
  );

program.parseAsync(process.argv).catch(error => {
  console.error(error);
  process.exit(1);
});
