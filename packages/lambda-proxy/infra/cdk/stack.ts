import path from "node:path";
import { fileURLToPath } from "node:url";

import { Duration, Stack, type StackProps } from "aws-cdk-lib";
import { Architecture, Code, Function, FunctionUrlAuthType, Runtime } from "aws-cdk-lib/aws-lambda";
import type { Construct } from "constructs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class LambdaProxyStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const handler = new Function(this, "LambdaProxyFunction", {
      architecture: Architecture.ARM_64,
      code: Code.fromAsset(path.resolve(__dirname, "../../dist")),
      functionName: `henry-vpn-proxy-${this.region}`,
      handler: "handler.handler",
      memorySize: 512,
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(15)
    });

    handler.addFunctionUrl({
      authType: FunctionUrlAuthType.AWS_IAM
    });
  }
}
