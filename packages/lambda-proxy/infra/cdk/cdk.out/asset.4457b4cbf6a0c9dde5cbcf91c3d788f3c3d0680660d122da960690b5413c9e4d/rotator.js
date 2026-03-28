import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
const DEFAULT_REGIONS = ["us-east-1", "eu-west-1", "ap-southeast-1"];
export class RegionRotator {
    regions;
    index = 0;
    constructor(regions = DEFAULT_REGIONS) {
        if (regions.length === 0) {
            throw new Error("At least one region is required.");
        }
        this.regions = regions;
    }
    next(functionBaseName) {
        const region = this.regions[this.index % this.regions.length];
        this.index += 1;
        return {
            region,
            functionName: `${functionBaseName}-${region}`
        };
    }
}
export async function invokeRotatedRequest(functionBaseName, request, regions = DEFAULT_REGIONS) {
    const rotator = new RegionRotator(regions);
    const plan = rotator.next(functionBaseName);
    const client = new LambdaClient({ region: plan.region });
    return client.send(new InvokeCommand({
        FunctionName: plan.functionName,
        InvocationType: "RequestResponse",
        Payload: Buffer.from(JSON.stringify(request))
    }));
}
//# sourceMappingURL=rotator.js.map