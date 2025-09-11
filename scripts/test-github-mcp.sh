#!/bin/bash

# Test GitHub MCP Server Integration
# This script tests various GitHub MCP server capabilities

set -e

echo "🧪 Testing GitHub MCP Server Integration"
echo "========================================"

# Check if MCP server is configured
echo "📋 Checking MCP server configuration..."
claude mcp list

echo ""
echo "🔍 Getting GitHub MCP server details..."
claude mcp get github

echo ""
echo "✅ GitHub MCP Server Integration Test Complete!"
echo ""
echo "🚀 You can now use GitHub MCP tools for:"
echo "   - Repository management and code analysis"
echo "   - Issue and PR automation" 
echo "   - CI/CD workflow monitoring"
echo "   - Deployment automation"
echo "   - Code review and collaboration"
echo ""
echo "📚 Example usage:"
echo "   /mcp github list_repositories"
echo "   /mcp github create_issue"
echo "   /mcp github get_pull_request"
echo "   /mcp github list_workflow_runs"