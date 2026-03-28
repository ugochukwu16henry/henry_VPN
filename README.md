# henry_VPN

Developer privacy and proxy toolkit with:

- Self-hosted WireGuard tooling
- Lambda proxy with region hopping
- Residential proxy transport with TLS impersonation behavior
- Stealth browser checks and verification scripts
- Unified CLI and CI/CD workflows

## Requirements

- Node.js 22+
- PNPM 10.8.1+
- GitHub repository with Actions enabled
- AWS account for Lambda deployment

## Local Setup

1. Install dependencies:

   pnpm install

2. Build all packages:

   pnpm build

3. Typecheck all packages:

   pnpm check

## Verification Commands

Run individual checks:

- TLS JA3 check:

  pnpm verify:tls

- WebRTC leak check:

  pnpm verify:webrtc

- Kill-switch check:

  KILLSWITCH_DISRUPTIVE=1 pnpm verify:killswitch

Run all checks in sequence:

- pnpm verify:all

Notes:

- Kill-switch check is intentionally skip-by-default unless KILLSWITCH_DISRUPTIVE=1.
- TLS check warns if HTTP_PROXY / HTTPS_PROXY is not configured.

## GitHub Actions

### CI workflow

Workflow file: .github/workflows/ci.yml

Runs on push and pull request:

- install
- build
- typecheck
- verification suite

### Lambda deployment workflow

Workflow file: .github/workflows/deploy-lambda-proxy.yml

Trigger manually via workflow_dispatch with inputs:

- stage
- regions
- aws_role_to_assume
- aws_region

The workflow:

1. Configures AWS credentials via GitHub OIDC
2. Installs dependencies
3. Runs regional deploy script for lambda-proxy

## AWS OIDC Role Setup

Create an IAM OIDC identity provider for GitHub (if not already created):

- Provider URL: https://token.actions.githubusercontent.com
- Audience: sts.amazonaws.com

Create an IAM role trusted by GitHub OIDC using docs/aws/github-oidc-trust-policy.json.

Attach deployment permissions policy from docs/aws/lambda-proxy-deploy-policy.json.

Replace placeholders in both files:

- ACCOUNT_ID
- GITHUB_ORG
- GITHUB_REPO

## Local Deploy Examples

Single region synth:

- pnpm --filter @henry-vpn/lambda-proxy cdk:synth

Single region deploy:

- pnpm --filter @henry-vpn/lambda-proxy cdk:deploy

Multi-region deploy:

- DEPLOY_REGIONS=us-east-1,eu-west-1,ap-southeast-1 pnpm --filter @henry-vpn/lambda-proxy deploy:regions

On Windows PowerShell:

- $env:DEPLOY_REGIONS='us-east-1,eu-west-1,ap-southeast-1'; pnpm --filter @henry-vpn/lambda-proxy deploy:regions

## Troubleshooting

- Missing AWS account resolution:
  - Ensure AWS credentials are configured, or set CDK_DEFAULT_ACCOUNT / AWS_ACCOUNT_ID.
- WebRTC verification issues in CI:
  - Keep STEALTH_BROWSER_CHANNEL=default for Chromium in CI.
- TLS verification timeout:
  - Set JA3_TARGET_URLS to reachable endpoints in your environment.
