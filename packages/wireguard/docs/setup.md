# WireGuard Setup

## VPS bootstrap

1. Rent a small VPS with a public IPv4 address.
2. Copy `packages/wireguard/provision/wireguard-install.sh` to the server.
3. Run it as `root`.
4. Download the generated client configuration from the installer output.

## Client kill-switch

Set the VPS endpoint IP before enabling the kill-switch.

```bash
export WG_VPS_ENDPOINT_IP=203.0.113.10
sudo ./packages/wireguard/scripts/kill-switch.sh enable
```

This blocks outbound traffic unless it goes through `wg0` or to the WireGuard VPS directly.

## Daily commands

```bash
make -C packages/wireguard up
make -C packages/wireguard status
make -C packages/wireguard kill-switch-status
make -C packages/wireguard down
```

## Validation

1. Bring the tunnel up and check `curl ifconfig.me`.
2. Run `make -C packages/wireguard kill-switch-status`.
3. Bring the tunnel down and confirm public traffic is blocked.
