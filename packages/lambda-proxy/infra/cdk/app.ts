import { App } from "aws-cdk-lib";

import { LambdaProxyStack } from "./stack.js";

const app = new App();

const defaultRegion = process.env.CDK_DEFAULT_REGION ?? "us-east-1";
const account = process.env.CDK_DEFAULT_ACCOUNT ?? process.env.AWS_ACCOUNT_ID;
const stage = process.env.STAGE ?? "dev";

new LambdaProxyStack(app, `HenryVpnLambdaProxy-${stage}-${defaultRegion}`, {
  env: {
    account,
    region: defaultRegion
  }
});
