import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { getProxyForUrl } from "proxy-from-env";

export type ProxyAgents = {
  httpAgent?: HttpProxyAgent<string>;
  httpsAgent?: HttpsProxyAgent<string>;
  proxyUrl?: string;
};

export function createProxyAgents(targetUrl: string): ProxyAgents {
  const proxyUrl = getProxyForUrl(targetUrl);

  if (!proxyUrl) {
    return {};
  }

  return {
    proxyUrl,
    httpAgent: new HttpProxyAgent(proxyUrl),
    httpsAgent: new HttpsProxyAgent(proxyUrl)
  };
}
