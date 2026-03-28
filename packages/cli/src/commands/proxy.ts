import chalk from "chalk";

import { fetchWithResidentialProxy } from "@henry-vpn/residential-proxy";
import { invokeRotatedRequest } from "@henry-vpn/lambda-proxy";

export async function runProxyTest(url: string): Promise<void> {
  const response = await fetchWithResidentialProxy(url, {
    method: "GET"
  });

  console.log(chalk.green(`Proxy test status: ${response.statusCode}`));
  console.log(response.body.slice(0, 600));
}

export async function runProxyRotate(
  functionBaseName: string,
  targetUrl: string,
  regions: string[]
): Promise<void> {
  const result = await invokeRotatedRequest(
    functionBaseName,
    {
      targetUrl,
      method: "GET"
    },
    regions
  );

  console.log(chalk.cyan(`Invoked function in rotated region. Status: ${result.StatusCode ?? "unknown"}`));
}
