#!/usr/bin/env bash
set -euo pipefail

INSTALLER_URL="${INSTALLER_URL:-https://raw.githubusercontent.com/angristan/wireguard-install/master/wireguard-install.sh}"
INSTALLER_PATH="${INSTALLER_PATH:-/tmp/wireguard-install.sh}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "This script must be run as root on the VPS."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  apt-get update
  apt-get install -y curl
fi

umask 077
curl -fsSL "${INSTALLER_URL}" -o "${INSTALLER_PATH}"
chmod 700 "${INSTALLER_PATH}"

export AUTO_INSTALL_NEEDED_VARS="${AUTO_INSTALL_NEEDED_VARS:-yes}"
export APPROVE_INSTALL="${APPROVE_INSTALL:-yes}"
export APPROVE_IP="${APPROVE_IP:-yes}"
export IPV6_SUPPORT="${IPV6_SUPPORT:-yes}"
export PORT_CHOICE="${PORT_CHOICE:-1}"
export SERVER_PORT="${SERVER_PORT:-51820}"
export CLIENT_DNS_1="${CLIENT_DNS_1:-1.1.1.1}"
export CLIENT_DNS_2="${CLIENT_DNS_2:-1.0.0.1}"

bash "${INSTALLER_PATH}"
