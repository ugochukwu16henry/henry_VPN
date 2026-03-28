import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { getProxyForUrl } from "proxy-from-env";

export type ProxyAgents = {
  httpAgent?: HttpProxyAgent<string>;
  httpsAgent?: HttpsProxyAgent<string>;
  proxyUrl?: string;
};

export type ProxyAgentOptions = {
  proxyUrl?: string;
};

export function createProxyAgents(targetUrl: string, options: ProxyAgentOptions = {}): ProxyAgents {
  const proxyUrl = options.proxyUrl ?? getProxyForUrl(targetUrl);

  if (!proxyUrl) {
    return {};
  }

  return {
    proxyUrl,
    httpAgent: new HttpProxyAgent(proxyUrl),
    httpsAgent: new HttpsProxyAgent(proxyUrl)
  };
}
