WG_INTERFACE ?= wg0
WG_CONF ?= /etc/wireguard/$(WG_INTERFACE).conf
WG_PROFILE ?=
PEER_NAME ?=

.PHONY: up down status add-peer revoke-peer kill-switch-enable kill-switch-disable kill-switch-status

up:
	@if [ -n "$(WG_PROFILE)" ]; then \
		test -f "./configs/$(WG_PROFILE).conf" || (echo "Missing profile: ./configs/$(WG_PROFILE).conf" && exit 1); \
		wg-quick up "./configs/$(WG_PROFILE).conf"; \
	else \
		wg-quick up $(WG_INTERFACE); \
	fi

down:
	@if [ -n "$(WG_PROFILE)" ]; then \
		test -f "./configs/$(WG_PROFILE).conf" || (echo "Missing profile: ./configs/$(WG_PROFILE).conf" && exit 1); \
		wg-quick down "./configs/$(WG_PROFILE).conf"; \
	else \
		wg-quick down $(WG_INTERFACE); \
	fi

status:
	@if [ -n "$(WG_PROFILE)" ]; then \
		wg show $(WG_PROFILE); \
	else \
		wg show $(WG_INTERFACE); \
	fi

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
