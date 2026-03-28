import type { BrowserContext, Page } from "playwright";

export type BrowseOptions = {
  blockAssets?: boolean;
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
};

export async function preparePage(context: BrowserContext, options: BrowseOptions = {}): Promise<Page> {
  if (options.blockAssets ?? true) {
    await context.route("**/*", async route => {
      const resourceType = route.request().resourceType();

      if (["image", "font", "media"].includes(resourceType)) {
        await route.abort();
        return;
      }

      await route.continue();
    });
  }

  return context.newPage();
}

export async function browseTo(context: BrowserContext, url: string, options: BrowseOptions = {}) {
  const page = await preparePage(context, options);
  await page.goto(url, { waitUntil: options.waitUntil ?? "domcontentloaded" });
  return page;
}
