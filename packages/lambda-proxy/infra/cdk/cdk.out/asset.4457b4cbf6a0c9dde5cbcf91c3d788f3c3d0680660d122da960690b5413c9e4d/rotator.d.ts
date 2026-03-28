import type { ProxyRequest, RotationPlan } from "./types.js";
export declare class RegionRotator {
    private readonly regions;
    private index;
    constructor(regions?: string[]);
    next(functionBaseName: string): RotationPlan;
}
export declare function invokeRotatedRequest(functionBaseName: string, request: ProxyRequest, regions?: string[]): Promise<import("@aws-sdk/client-lambda").InvokeCommandOutput>;
