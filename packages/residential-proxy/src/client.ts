import { gotScraping, type OptionsOfTextResponseBody } from "got-scraping";

import { createProxyAgents } from "./proxy-agent.js";
import { buildProxyUrl } from "./session.js";

export type ResidentialRequestOptions = {
  countryCode?: string;
  sessionMode?: "sticky" | "rotating";
  sessionId?: string;
  proxyHost?: string;
  proxyPort?: number;
  username?: string;
  password?: string;
};

export async function fetchWithResidentialProxy(
  url: string,
  options: OptionsOfTextResponseBody = {},
  residentialOptions: ResidentialRequestOptions = {}
) {
  const explicitProxyUrl = buildResidentialProxyUrl(residentialOptions);
  const agents = createProxyAgents(url, {
    proxyUrl: explicitProxyUrl
  });

  return gotScraping({
    ...options,
    url,
    agent: {
      http: agents.httpAgent,
      https: agents.httpsAgent
    },
    https: {
      rejectUnauthorized: true
    },
    headerGeneratorOptions: {
      browsers: [{ name: "chrome", minVersion: 124 }]
    }
  });
}

function buildResidentialProxyUrl(options: ResidentialRequestOptions): string | undefined {
  const host = options.proxyHost ?? process.env.RES_PROXY_HOST;
  const username = options.username ?? process.env.RES_PROXY_USERNAME;
  const password = options.password ?? process.env.RES_PROXY_PASSWORD;

  if (!host || !username || !password) {
    return undefined;
  }

  const portRaw = options.proxyPort ?? Number(process.env.RES_PROXY_PORT ?? "0");
  const port = Number.isFinite(portRaw) && portRaw > 0 ? portRaw : 80;

  return buildProxyUrl(host, port, {
    username,
    password,
    mode: options.sessionMode,
    sessionId: options.sessionId,
    countryCode: options.countryCode
  });
}
