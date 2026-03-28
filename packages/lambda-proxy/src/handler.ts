import axios from "axios";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

import { assertSafeTarget } from "./ssrf-guard.js";
import type { ProxyRequest } from "./types.js";

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const request = parseRequest(event);
  const safeUrl = await assertSafeTarget(request.targetUrl);

  const response = await axios.request({
    data: request.body,
    headers: request.headers,
    method: request.method ?? "GET",
    timeout: request.timeoutMs ?? 15_000,
    url: safeUrl.toString(),
    validateStatus: () => true
  });

  return {
    statusCode: response.status,
    headers: normalizeHeaders(response.headers as Record<string, string | string[] | undefined>),
    body: typeof response.data === "string" ? response.data : JSON.stringify(response.data)
  };
}

function parseRequest(event: APIGatewayProxyEventV2): ProxyRequest {
  if (!event.body) {
    throw new Error("Request body is required.");
  }

  return JSON.parse(event.body) as ProxyRequest;
}

function normalizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  const normalizedEntries = Object.entries(headers)
    .flatMap(([key, value]) => {
      if (value === undefined) {
        return [];
      }

      return [[key, Array.isArray(value) ? value.join(", ") : value] as const];
    });

  return Object.fromEntries(
    normalizedEntries
  );
}
