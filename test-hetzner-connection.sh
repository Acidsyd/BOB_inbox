#!/bin/bash

echo "Testing Hetzner Server Connection"
echo "=================================="
echo ""

echo "1. Testing network connectivity..."
if ping -c 2 91.98.19.49 > /dev/null 2>&1; then
    echo "   ✅ Server is reachable"
else
    echo "   ❌ Server is NOT reachable"
    exit 1
fi

echo ""
echo "2. Testing SSH port..."
if nc -zv -w 5 91.98.19.49 22 2>&1 | grep -q "succeeded"; then
    echo "   ✅ SSH port 22 is open"
else
    echo "   ❌ SSH port 22 is NOT accessible"
    exit 1
fi

echo ""
echo "3. Attempting SSH connection..."
echo "   Server: root@91.98.19.49"
echo "   Password: Ru3cxhkMjLRC"
echo ""
echo "   Run this command manually:"
echo "   ssh root@91.98.19.49"
echo ""
echo "   Or try with verbose output to see what's failing:"
echo "   ssh -v root@91.98.19.49"
echo ""
echo "4. If password doesn't work, try accessing via Hetzner console:"
echo "   - Go to https://console.hetzner.cloud"
echo "   - Click on your server"
echo "   - Click 'Console' button"
echo "   - Login with: root / Ru3cxhkMjLRC"
echo ""
