import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, LaunchOptions } from "playwright";

chromium.use(StealthPlugin());

export type BrowserFactoryOptions = {
  headless?: boolean;
  proxyServer?: string;
};

export async function createBrowser(options: BrowserFactoryOptions = {}): Promise<Browser> {
  const launchOptions: LaunchOptions = {
    channel: "chrome",
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

  return chromium.launch(launchOptions);
}
