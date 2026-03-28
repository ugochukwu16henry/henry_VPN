import { FingerprintGenerator } from "fingerprint-generator";
import { FingerprintInjector } from "fingerprint-injector";
import { anonymizeProxy } from "proxy-chain";
import type { Browser, BrowserContext, BrowserContextOptions, Geolocation } from "playwright";

const generator = new FingerprintGenerator({
  browsers: [{ name: "chrome", minVersion: 124 }],
  devices: ["desktop"],
  operatingSystems: ["windows", "linux"]
});

const injector = new FingerprintInjector();

export type StealthContextOptions = {
  countryCode?: string;
  proxyUrl?: string;
  storageStatePath?: string;
  locale?: string;
  timezoneId?: string;
  geolocation?: Geolocation;
};

type ExtendedContextOptions = BrowserContextOptions & {
  rtcConfiguration?: {
    iceServers: Array<never>;
  };
};

type CountryProfile = {
  locale: string;
  timezoneId: string;
  geolocation: Geolocation;
};

const COUNTRY_PROFILE_MAP: Record<string, CountryProfile> = {
  us: {
    locale: "en-US",
    timezoneId: "America/New_York",
    geolocation: { latitude: 40.7128, longitude: -74.006 }
  },
  gb: {
    locale: "en-GB",
    timezoneId: "Europe/London",
    geolocation: { latitude: 51.5072, longitude: -0.1276 }
  },
  fr: {
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    geolocation: { latitude: 48.8566, longitude: 2.3522 }
  },
  de: {
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    geolocation: { latitude: 52.52, longitude: 13.405 }
  },
  jp: {
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    geolocation: { latitude: 35.6762, longitude: 139.6503 }
  },
  br: {
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    geolocation: { latitude: -23.5505, longitude: -46.6333 }
  },
  ca: {
    locale: "en-CA",
    timezoneId: "America/Toronto",
    geolocation: { latitude: 43.6532, longitude: -79.3832 }
  },
  au: {
    locale: "en-AU",
    timezoneId: "Australia/Sydney",
    geolocation: { latitude: -33.8688, longitude: 151.2093 }
  }
};

export async function createStealthContext(
  browser: Browser,
  options: StealthContextOptions = {}
): Promise<{ context: BrowserContext; cleanup: () => Promise<void> }> {
  const fingerprint = generator.getFingerprint();
  const countryProfile = resolveCountryProfile(options.countryCode);
  let anonymizedProxyUrl: string | undefined;

  if (options.proxyUrl) {
    anonymizedProxyUrl = await anonymizeProxy(options.proxyUrl);
  }

  const storageState = options.storageStatePath;
  const locale = options.locale ?? countryProfile?.locale ?? "en-US";
  const timezoneId = options.timezoneId ?? countryProfile?.timezoneId ?? "America/New_York";
  const geolocation = options.geolocation ?? countryProfile?.geolocation;

  const contextOptions: ExtendedContextOptions = {
    colorScheme: "dark",
    deviceScaleFactor: 1,
    extraHTTPHeaders: {
      "accept-language": `${locale},${locale.split("-")[0]};q=0.9`
    },
    locale,
    serviceWorkers: "block",
    storageState,
    timezoneId,
    userAgent: fingerprint.fingerprint.navigator.userAgent,
    viewport: {
      width: fingerprint.fingerprint.screen.width,
      height: fingerprint.fingerprint.screen.height
    },
    rtcConfiguration: {
      iceServers: []
    }
  };

  if (geolocation) {
    contextOptions.geolocation = geolocation;
    contextOptions.permissions = ["geolocation"];
  }

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

function resolveCountryProfile(countryCode?: string): CountryProfile | undefined {
  if (!countryCode) {
    return undefined;
  }

  return COUNTRY_PROFILE_MAP[countryCode.trim().toLowerCase()];
}
