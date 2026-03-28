type SessionMode = "sticky" | "rotating";

export type SessionOptions = {
  username: string;
  password: string;
  mode?: SessionMode;
  countryCode?: string;
  geo?: string;
  sessionId?: string;
};

export function buildSessionUsername(options: SessionOptions): string {
  const mode = options.mode ?? "rotating";
  const parts = [options.username];

  if (mode === "sticky") {
    parts.push(`session-${options.sessionId ?? crypto.randomUUID()}`);
  }

  if (options.countryCode) {
    parts.push(`country-${options.countryCode.trim().toLowerCase()}`);
  }

  if (options.geo) {
    parts.push(options.geo);
  }

  return parts.join("-");
}

export function buildProxyUrl(host: string, port: number, options: SessionOptions): string {
  const username = encodeURIComponent(buildSessionUsername(options));
  const password = encodeURIComponent(options.password);
  return `http://${username}:${password}@${host}:${port}`;
}
