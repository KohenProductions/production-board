#!/bin/bash

BASE="http://localhost:3000"
USER="ron_test_final"
PASS="123456"

echo "---- LOGIN ----"
curl -i -c cookies.txt -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}"

echo ""
echo "---- ME ----"
curl -i -b cookies.txt "$BASE/api/auth/me"

echo ""
echo "---- LOGOUT ----"
curl -i -b cookies.txt -X POST "$BASE/api/auth/logout"

echo ""
echo "---- ME AFTER LOGOUT ----"
curl -i -b cookies.txt "$BASE/api/auth/me"