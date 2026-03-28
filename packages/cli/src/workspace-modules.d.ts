declare module "@henry-vpn/residential-proxy" {
  export function fetchWithResidentialProxy(
    url: string,
    options?: Record<string, unknown>
  ): Promise<{ statusCode: number; body: string }>;
}

declare module "@henry-vpn/lambda-proxy" {
  export function invokeRotatedRequest(
    functionBaseName: string,
    request: { targetUrl: string; method?: string },
    regions?: string[]
  ): Promise<{ StatusCode?: number }>;
}

declare module "@henry-vpn/stealth-browser" {
  export type StealthBrowser = {
    close: () => Promise<void>;
  };

  export type StealthContext = {
    close: () => Promise<void>;
  };

  export function createBrowser(options?: { headless?: boolean; proxyServer?: string }): Promise<StealthBrowser>;
  export function createStealthContext(
    browser: StealthBrowser,
    options?: { proxyUrl?: string; storageStatePath?: string }
  ): Promise<{ context: StealthContext; cleanup: () => Promise<void> }>;
  export function browseTo(
    context: StealthContext,
    url: string,
    options?: { waitUntil?: "load" | "domcontentloaded" | "networkidle" }
  ): Promise<{ url: () => string; title: () => Promise<string> }>;
}
