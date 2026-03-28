import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

import type { ProxyRequest, RotationPlan } from "./types.js";

const DEFAULT_REGIONS = ["us-east-1", "eu-west-1", "ap-southeast-1"];
const COUNTRY_TO_REGIONS: Record<string, string[]> = {
  us: ["us-east-1", "us-east-2", "us-west-1", "us-west-2"],
  gb: ["eu-west-2"],
  de: ["eu-central-1"],
  fr: ["eu-west-3"],
  jp: ["ap-northeast-1"],
  br: ["sa-east-1"],
  ca: ["ca-central-1"],
  au: ["ap-southeast-2"]
};

export type RotationStrategy = "round-robin" | "random";

export type RotationOptions = {
  countryCode?: string;
  strategy?: RotationStrategy;
};

export class RegionRotator {
  private readonly regions: string[];
  private readonly strategy: RotationStrategy;
  private index = 0;

  constructor(regions: string[] = DEFAULT_REGIONS, strategy: RotationStrategy = "round-robin") {
    if (regions.length === 0) {
      throw new Error("At least one region is required.");
    }

    this.regions = regions;
    this.strategy = strategy;
  }

  next(functionBaseName: string): RotationPlan {
    const region = this.selectRegion();
    return {
      region,
      functionName: `${functionBaseName}-${region}`
    };
  }

  private selectRegion(): string {
    if (this.strategy === "random") {
      return this.regions[Math.floor(Math.random() * this.regions.length)]!;
    }

    const region = this.regions[this.index % this.regions.length]!;
    this.index += 1;
    return region;
  }
}

export async function invokeRotatedRequest(
  functionBaseName: string,
  request: ProxyRequest,
  regions: string[] = DEFAULT_REGIONS,
  options: RotationOptions = {}
) {
  const resolvedRegions = resolveRegions(regions, options.countryCode);
  const rotator = new RegionRotator(resolvedRegions, options.strategy ?? "round-robin");
  const plan = rotator.next(functionBaseName);
  const client = new LambdaClient({ region: plan.region });

  const response = await client.send(
    new InvokeCommand({
      FunctionName: plan.functionName,
      InvocationType: "RequestResponse",
      Payload: Buffer.from(JSON.stringify(request))
    })
  );

  return {
    response,
    plan
  };
}

function resolveRegions(regions: string[], countryCode?: string): string[] {
  const normalizedCountryCode = countryCode?.trim().toLowerCase();

  if (!normalizedCountryCode) {
    return regions;
  }

  const mappedRegions = COUNTRY_TO_REGIONS[normalizedCountryCode] ?? [];

  if (mappedRegions.length === 0) {
    return regions;
  }

  // Keep only mapped regions that are actually deployed/allowed by caller list.
  const intersection = mappedRegions.filter(region => regions.includes(region));
  return intersection.length > 0 ? intersection : mappedRegions;
}
