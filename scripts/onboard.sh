#!/bin/bash
set -euo pipefail
echo "=== chittychain Onboarding ==="
curl -s -X POST "${GETCHITTY_ENDPOINT:-https://get.chitty.cc/api/onboard}" \
  -H "Content-Type: application/json" \
  -d '{"service_name":"chittychain","organization":"CHITTYFOUNDATION","type":"foundation","tier":0,"domains":["chain.chitty.cc"]}' | jq .
