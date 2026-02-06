#!/bin/bash
PORT=3001 API_KEY=test-key-123 node dist/http-server.js &
PID=$!
sleep 2

echo "=== Test 1: Health Check ==="
curl -s http://localhost:3001/health | python3 -m json.tool

echo -e "\n=== Test 2: Server Info ==="
curl -s http://localhost:3001/ | python3 -m json.tool

echo -e "\n=== Test 3: Nombre d'outils enregistrés ==="
curl -s http://localhost:3001/ | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"✓ {data['coda_tools_count']} outils Coda disponibles\")"

kill $PID 2>/dev/null
wait $PID 2>/dev/null
echo -e "\n✅ Tests terminés, serveur arrêté"
