export type ProxyRequest = {
  targetUrl: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
};

export type ProxyResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

export type RotationPlan = {
  region: string;
  functionName: string;
};
