import { spawn } from "node:child_process";

const WIREGUARD_DIR = "packages/wireguard";

export async function runWgCommand(action: string, peerName?: string, value?: string): Promise<void> {
  if (process.platform === "win32") {
    throw new Error(
      "WireGuard make targets are not available on native Windows shell. Run this command in WSL/Linux, or call the scripts directly in a Unix environment."
    );
  }

  const target = mapActionToMakeTarget(action);
  const args = ["-C", WIREGUARD_DIR, target];
  const env: NodeJS.ProcessEnv = { ...process.env };

  if (["up", "down", "status"].includes(action) && value) {
    args.push(`WG_PROFILE=${value}`);
  }

  const resolvedPeerName = peerName ?? value;

  if (["add-peer", "revoke-peer"].includes(action) && resolvedPeerName) {
    args.push(`PEER_NAME=${resolvedPeerName}`);
  }

  await runProcess("make", args, env);
}

function mapActionToMakeTarget(action: string): string {
  switch (action) {
    case "up":
    case "down":
    case "status":
      return action;
    case "add-peer":
      return "add-peer";
    case "revoke-peer":
      return "revoke-peer";
    case "kill-switch-enable":
      return "kill-switch-enable";
    case "kill-switch-disable":
      return "kill-switch-disable";
    case "kill-switch-status":
      return "kill-switch-status";
    default:
      throw new Error(`Unknown wg action: ${action}`);
  }
}

function runProcess(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env });

    child.on("close", code => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
    });

    child.on("error", error => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new Error(`Required command not found: ${command}`));
        return;
      }

      reject(error);
    });
  });
}
