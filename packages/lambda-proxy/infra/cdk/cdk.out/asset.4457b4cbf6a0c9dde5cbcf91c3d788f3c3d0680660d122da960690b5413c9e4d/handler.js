import axios from "axios";
import { assertSafeTarget } from "./ssrf-guard.js";
export async function handler(event) {
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
        headers: normalizeHeaders(response.headers),
        body: typeof response.data === "string" ? response.data : JSON.stringify(response.data)
    };
}
function parseRequest(event) {
    if (!event.body) {
        throw new Error("Request body is required.");
    }
    return JSON.parse(event.body);
}
function normalizeHeaders(headers) {
    const normalizedEntries = Object.entries(headers)
        .flatMap(([key, value]) => {
        if (value === undefined) {
            return [];
        }
        return [[key, Array.isArray(value) ? value.join(", ") : value]];
    });
    return Object.fromEntries(normalizedEntries);
}
//# sourceMappingURL=handler.js.map