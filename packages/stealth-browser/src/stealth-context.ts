import { FingerprintGenerator } from "fingerprint-generator";
import { FingerprintInjector } from "fingerprint-injector";
import { anonymizeProxy } from "proxy-chain";
import type { Browser, BrowserContext, BrowserContextOptions } from "playwright";

const generator = new FingerprintGenerator({
  browsers: [{ name: "chrome", minVersion: 124 }],
  devices: ["desktop"],
  operatingSystems: ["windows", "linux"]
});

const injector = new FingerprintInjector();

export type StealthContextOptions = {
  proxyUrl?: string;
  storageStatePath?: string;
  locale?: string;
  timezoneId?: string;
};

type ExtendedContextOptions = BrowserContextOptions & {
  rtcConfiguration?: {
    iceServers: Array<never>;
  };
};

export async function createStealthContext(
  browser: Browser,
  options: StealthContextOptions = {}
): Promise<{ context: BrowserContext; cleanup: () => Promise<void> }> {
  const fingerprint = generator.getFingerprint();
  let anonymizedProxyUrl: string | undefined;

  if (options.proxyUrl) {
    anonymizedProxyUrl = await anonymizeProxy(options.proxyUrl);
  }

  const storageState = options.storageStatePath;

  const contextOptions: ExtendedContextOptions = {
    colorScheme: "dark",
    deviceScaleFactor: 1,
    extraHTTPHeaders: {
      "accept-language": options.locale ?? "en-US,en;q=0.9"
    },
    locale: options.locale ?? "en-US",
    serviceWorkers: "block",
    storageState,
    timezoneId: options.timezoneId ?? "America/New_York",
    userAgent: fingerprint.fingerprint.navigator.userAgent,
    viewport: {
      width: fingerprint.fingerprint.screen.width,
      height: fingerprint.fingerprint.screen.height
    },
    rtcConfiguration: {
      iceServers: []
    }
  };

  if (anonymizedProxyUrl) {
    contextOptions.proxy = {
      server: anonymizedProxyUrl
    };
  }

  const context = await browser.newContext(contextOptions);
  await injector.attachFingerprintToPlaywright(context, fingerprint);

  const cleanup = async () => {
    if (anonymizedProxyUrl) {
      await closeProxy(anonymizedProxyUrl);
    }
  };

  return { context, cleanup };
}

async function closeProxy(proxyUrl: string) {
  const { closeAnonymizedProxy } = await import("proxy-chain");
  await closeAnonymizedProxy(proxyUrl, true);
}
