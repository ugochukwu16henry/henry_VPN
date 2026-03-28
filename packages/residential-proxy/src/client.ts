import { gotScraping, type OptionsOfTextResponseBody } from "got-scraping";

import { createProxyAgents } from "./proxy-agent.js";

export async function fetchWithResidentialProxy(url: string, options: OptionsOfTextResponseBody = {}) {
  const agents = createProxyAgents(url);

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
