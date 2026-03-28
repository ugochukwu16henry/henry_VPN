import path from "node:path";
import { fileURLToPath } from "node:url";

import { Duration, Stack, type StackProps } from "aws-cdk-lib";
import { Architecture, FunctionUrlAuthType, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import type { Construct } from "constructs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class LambdaProxyStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const handler = new NodejsFunction(this, "LambdaProxyFunction", {
      architecture: Architecture.ARM_64,
      entry: path.resolve(__dirname, "../../src/handler.ts"),
      functionName: `henry-vpn-proxy-${this.region}`,
      memorySize: 512,
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(15),
      bundling: {
        format: "esm",
        minify: false,
        sourceMap: true,
        target: "node22"
      }
    });

    handler.addFunctionUrl({
      authType: FunctionUrlAuthType.AWS_IAM
    });
  }
}
