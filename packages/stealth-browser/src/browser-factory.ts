import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, LaunchOptions } from "playwright";

chromium.use(StealthPlugin());

export type BrowserFactoryOptions = {
  headless?: boolean;
  proxyServer?: string;
  channel?: LaunchOptions["channel"];
};

export async function createBrowser(options: BrowserFactoryOptions = {}): Promise<Browser> {
  const configuredChannel = options.channel ?? getChannelFromEnv();

  const launchOptions: LaunchOptions = {
    headless: options.headless ?? true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-default-browser-check",
      "--disable-dev-shm-usage"
    ]
  };

  if (options.proxyServer) {
    launchOptions.proxy = {
      server: options.proxyServer
    };
  }

  if (configuredChannel) {
    launchOptions.channel = configuredChannel;
  }

  return chromium.launch(launchOptions);
}

function getChannelFromEnv(): LaunchOptions["channel"] | undefined {
  const value = process.env.STEALTH_BROWSER_CHANNEL?.trim();

  if (!value || value.toLowerCase() === "default") {
    return undefined;
  }

  return value as LaunchOptions["channel"];
}
