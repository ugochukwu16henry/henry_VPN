import chalk from "chalk";

import { browseTo, createBrowser, createStealthContext } from "@henry-vpn/stealth-browser";

export type BrowseCommandOptions = {
  headless?: boolean;
  countryCode?: string;
  proxyUrl?: string;
  storageStatePath?: string;
};

export async function runBrowse(url: string, options: BrowseCommandOptions = {}): Promise<void> {
  const browser = await createBrowser({
    headless: options.headless ?? true
  });

  const { context, cleanup } = await createStealthContext(browser, {
    countryCode: options.countryCode,
    proxyUrl: options.proxyUrl,
    storageStatePath: options.storageStatePath
  });

  try {
    const page = await browseTo(context, url, {
      waitUntil: "domcontentloaded"
    });

    console.log(chalk.green(`Page loaded: ${page.url()}`));
    console.log(chalk.gray(`Title: ${await page.title()}`));
  } finally {
    await context.close();
    await cleanup();
    await browser.close();
  }
}
