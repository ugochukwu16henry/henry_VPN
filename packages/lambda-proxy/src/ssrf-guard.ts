import dns from "node:dns/promises";
import net from "node:net";

const PRIVATE_IPV4_RANGES: Array<[number, number]> = [
  [ipToInt("10.0.0.0"), ipToInt("10.255.255.255")],
  [ipToInt("127.0.0.0"), ipToInt("127.255.255.255")],
  [ipToInt("169.254.0.0"), ipToInt("169.254.255.255")],
  [ipToInt("172.16.0.0"), ipToInt("172.31.255.255")],
  [ipToInt("192.168.0.0"), ipToInt("192.168.255.255")]
];

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

export async function assertSafeTarget(targetUrl: string): Promise<URL> {
  const parsed = new URL(targetUrl);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https targets are allowed.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error(`Blocked hostname: ${hostname}`);
  }

  if (net.isIP(hostname) && isBlockedIp(hostname)) {
    throw new Error(`Blocked IP address: ${hostname}`);
  }

  const resolved = await dns.lookup(hostname, { all: true });
  for (const address of resolved) {
    if (isBlockedIp(address.address)) {
      throw new Error(`Resolved to blocked IP address: ${address.address}`);
    }
  }

  return parsed;
}

function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const value = ipToInt(ip);
    return PRIVATE_IPV4_RANGES.some(([start, end]) => value >= start && value <= end);
  }

  if (net.isIPv6(ip)) {
    return ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:");
  }

  return false;
}

function ipToInt(ip: string): number {
  return ip
    .split(".")
    .map(Number)
    .reduce((acc, octet) => ((acc << 8) | octet) >>> 0, 0);
}
