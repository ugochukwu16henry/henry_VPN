#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-status}"
WG_INTERFACE="${WG_INTERFACE:-wg0}"
WG_VPS_ENDPOINT_IP="${WG_VPS_ENDPOINT_IP:-}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "This script must be run as root."
  exit 1
fi

if ! command -v iptables >/dev/null 2>&1; then
  echo "iptables is required."
  exit 1
fi

chain_exists() {
  iptables -S HENRY_VPN_KILLSWITCH >/dev/null 2>&1
}

enable_chain() {
  if ! chain_exists; then
    iptables -N HENRY_VPN_KILLSWITCH
  else
    iptables -F HENRY_VPN_KILLSWITCH
  fi

  iptables -A HENRY_VPN_KILLSWITCH -o lo -j ACCEPT
  iptables -A HENRY_VPN_KILLSWITCH -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
  iptables -A HENRY_VPN_KILLSWITCH -o "${WG_INTERFACE}" -j ACCEPT

  if [[ -n "${WG_VPS_ENDPOINT_IP}" ]]; then
    iptables -A HENRY_VPN_KILLSWITCH -d "${WG_VPS_ENDPOINT_IP}" -j ACCEPT
  fi

  iptables -A HENRY_VPN_KILLSWITCH -j REJECT

  if ! iptables -C OUTPUT -j HENRY_VPN_KILLSWITCH >/dev/null 2>&1; then
    iptables -I OUTPUT 1 -j HENRY_VPN_KILLSWITCH
  fi
}

disable_chain() {
  if iptables -C OUTPUT -j HENRY_VPN_KILLSWITCH >/dev/null 2>&1; then
    iptables -D OUTPUT -j HENRY_VPN_KILLSWITCH
  fi

  if chain_exists; then
    iptables -F HENRY_VPN_KILLSWITCH
    iptables -X HENRY_VPN_KILLSWITCH
  fi
}

status_chain() {
  if chain_exists; then
    iptables -S HENRY_VPN_KILLSWITCH
  else
    echo "Kill-switch chain is not installed."
  fi
}

case "${ACTION}" in
  enable)
    enable_chain
    echo "Kill-switch enabled for interface ${WG_INTERFACE}."
    ;;
  disable)
    disable_chain
    echo "Kill-switch disabled."
    ;;
  status)
    status_chain
    ;;
  *)
    echo "Usage: $0 [enable|disable|status]"
    exit 1
    ;;
esac
