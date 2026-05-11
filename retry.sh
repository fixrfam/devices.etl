#!/usr/bin/env bash
set -euo pipefail

DELAY_MINUTES=15

while true; do
	if bun run start; then
		echo "Done!"
		exit 0
	fi
	echo "[$(date '+%Y-%m-%d %H:%M:%S')] Failed. Retrying in ${DELAY_MINUTES}m..."
	sleep $((DELAY_MINUTES * 60))
done
