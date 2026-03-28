import chalk from "chalk";

import { fetchWithResidentialProxy } from "@henry-vpn/residential-proxy";
import { invokeRotatedRequest } from "@henry-vpn/lambda-proxy";

export async function runProxyTest(url: string): Promise<void> {
  try {
    const response = await fetchWithResidentialProxy(url, {
      method: "GET"
    });

    console.log(chalk.green(`Proxy test status: ${response.statusCode}`));
    console.log(response.body.slice(0, 600));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Proxy test failed for ${url}. ${message}. If this is a timeout, verify network egress and proxy credentials.`
    );
  }
}

export async function runProxyRotate(
  functionBaseName: string,
  targetUrl: string,
  regions: string[]
): Promise<void> {
  try {
    const result = await invokeRotatedRequest(
      functionBaseName,
      {
        targetUrl,
        method: "GET"
      },
      regions
    );

    console.log(chalk.cyan(`Invoked function in rotated region. Status: ${result.StatusCode ?? "unknown"}`));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Proxy rotate failed for function base '${functionBaseName}'. ${message}. Check AWS credentials, function names, and region list.`
    );
  }
}
