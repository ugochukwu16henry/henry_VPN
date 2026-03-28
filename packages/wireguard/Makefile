WG_INTERFACE ?= wg0
WG_CONF ?= /etc/wireguard/$(WG_INTERFACE).conf
PEER_NAME ?=

.PHONY: up down status add-peer revoke-peer kill-switch-enable kill-switch-disable kill-switch-status

up:
	wg-quick up $(WG_INTERFACE)

down:
	wg-quick down $(WG_INTERFACE)

status:
	wg show $(WG_INTERFACE)

add-peer:
	@test -n "$(PEER_NAME)" || (echo "PEER_NAME is required" && exit 1)
	@echo "Use the installer menu on the server to add peer: $(PEER_NAME)"

revoke-peer:
	@test -n "$(PEER_NAME)" || (echo "PEER_NAME is required" && exit 1)
	@echo "Use the installer menu on the server to revoke peer: $(PEER_NAME)"

kill-switch-enable:
	./scripts/kill-switch.sh enable

kill-switch-disable:
	./scripts/kill-switch.sh disable

kill-switch-status:
	./scripts/kill-switch.sh status
