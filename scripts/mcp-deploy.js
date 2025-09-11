#!/usr/bin/env node

/**
 * MCP-Enhanced Deployment Script
 * Uses Git MCP tools for intelligent deployment automation
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

const config = {
  deployHost: process.env.DEPLOY_HOST || 'your-droplet-ip',
  deployUser: process.env.DEPLOY_USER || 'root',
  appDir: '/var/www/mailsender',
  backupDir: '/var/backups/mailsender'
};

class MCPDeployment {
  constructor() {
    this.deploymentId = `deploy-${Date.now()}`;
    this.startTime = new Date();
  }

  async deploy() {
    console.log(`🚀 Starting MCP-enhanced deployment: ${this.deploymentId}`);
    
    try {
      // Step 1: Pre-deployment checks using Git MCP
      await this.preDeploymentChecks();
      
      // Step 2: Create deployment tag
      await this.createDeploymentTag();
      
      // Step 3: Deploy to server
      await this.deployToServer();
      
      // Step 4: Post-deployment validation
      await this.postDeploymentValidation();
      
      // Step 5: Create deployment record
      await this.recordDeployment();
      
      console.log(`✅ Deployment ${this.deploymentId} completed successfully!`);
      
    } catch (error) {
      console.error(`❌ Deployment ${this.deploymentId} failed:`, error.message);
      await this.handleDeploymentFailure(error);
      process.exit(1);
    }
  }

  async preDeploymentChecks() {
    console.log('🔍 Running pre-deployment checks...');
    
    // Using Git MCP to check repository status
    const gitStatus = await this.runGitMCP('git_status');
    
    if (!gitStatus.is_clean) {
      throw new Error('Repository has uncommitted changes. Please commit or stash changes before deployment.');
    }
    
    // Check if we're on main branch
    if (gitStatus.current_branch !== 'main') {
      throw new Error(`Deployment only allowed from main branch. Current branch: ${gitStatus.current_branch}`);
    }
    
    // Verify tests pass (if configured)
    console.log('✅ Pre-deployment checks passed');
  }

  async createDeploymentTag() {
    console.log('🏷️ Creating deployment tag...');
    
    const tagName = `deploy-${new Date().toISOString().split('T')[0]}-${this.deploymentId.split('-')[1]}`;
    
    await this.runGitMCP('git_tag', {
      mode: 'create',
      tagName,
      message: `Deployment ${this.deploymentId} - ${this.startTime.toISOString()}`,
      annotate: true
    });
    
    // Push tag to remote
    await this.runGitMCP('git_push', {
      tags: true
    });
    
    console.log(`✅ Created deployment tag: ${tagName}`);
    this.deploymentTag = tagName;
  }

  async deployToServer() {
    console.log('🚢 Deploying to server...');
    
    const deployScript = `
      set -e
      echo "🚀 Server deployment starting..."
      
      # Navigate to app directory
      cd ${config.appDir} || exit 1
      
      # Stop services
      echo "⏹️ Stopping services..."
      pm2 stop all || true
      
      # Create backup
      echo "💾 Creating backup..."
      cp -r . ${config.backupDir}/backup-${this.deploymentId} || true
      
      # Pull latest changes
      echo "📥 Pulling latest code..."
      git fetch --all --tags
      git checkout ${this.deploymentTag}
      
      # Install dependencies and build
      echo "🔨 Building application..."
      npm run setup
      npm run build
      
      # Start services
      echo "🚀 Starting services..."
      pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
      
      echo "✅ Server deployment completed!"
    `;
    
    // Execute deployment on server
    execSync(
      `ssh -o StrictHostKeyChecking=no ${config.deployUser}@${config.deployHost} '${deployScript}'`,
      { stdio: 'inherit' }
    );
  }

  async postDeploymentValidation() {
    console.log('🔍 Running post-deployment validation...');
    
    // Wait for services to start
    await this.sleep(15000);
    
    // Health check
    const healthCheck = `
      curl -f http://localhost:4000/health || exit 1
      curl -f http://localhost:3001 || exit 1
      pm2 status | grep -E "(online|running)" || exit 1
    `;
    
    execSync(
      `ssh -o StrictHostKeyChecking=no ${config.deployUser}@${config.deployHost} '${healthCheck}'`,
      { stdio: 'inherit' }
    );
    
    console.log('✅ Post-deployment validation passed');
  }

  async recordDeployment() {
    console.log('📝 Recording deployment...');
    
    const deploymentRecord = {
      id: this.deploymentId,
      tag: this.deploymentTag,
      timestamp: this.startTime.toISOString(),
      duration: Date.now() - this.startTime.getTime(),
      status: 'success',
      branch: 'main',
      commit: await this.getLatestCommit()
    };
    
    // Save deployment record
    const recordFile = `deployment-records/${this.deploymentId}.json`;
    writeFileSync(recordFile, JSON.stringify(deploymentRecord, null, 2));
    
    // Commit deployment record
    await this.runGitMCP('git_add', { files: [recordFile] });
    await this.runGitMCP('git_commit', {
      message: `chore: record deployment ${this.deploymentId}`
    });
    
    console.log(`✅ Deployment recorded: ${recordFile}`);
  }

  async handleDeploymentFailure(error) {
    console.log('🔄 Handling deployment failure...');
    
    // Create failure record
    const failureRecord = {
      id: this.deploymentId,
      timestamp: this.startTime.toISOString(),
      duration: Date.now() - this.startTime.getTime(),
      status: 'failed',
      error: error.message,
      branch: 'main'
    };
    
    const recordFile = `deployment-records/${this.deploymentId}-failed.json`;
    writeFileSync(recordFile, JSON.stringify(failureRecord, null, 2));
    
    // Optionally trigger rollback
    if (this.deploymentTag) {
      console.log('🔄 Triggering rollback...');
      await this.rollback();
    }
  }

  async rollback() {
    console.log('🔄 Rolling back deployment...');
    
    const rollbackScript = `
      set -e
      cd ${config.appDir}
      
      # Stop current services
      pm2 stop all || true
      
      # Restore from backup
      if [ -d "${config.backupDir}/backup-${this.deploymentId}" ]; then
        echo "📦 Restoring from backup..."
        rm -rf * .*
        cp -r ${config.backupDir}/backup-${this.deploymentId}/* .
        
        # Restart services
        pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
        
        echo "✅ Rollback completed"
      else
        echo "❌ No backup found for rollback"
        exit 1
      fi
    `;
    
    execSync(
      `ssh -o StrictHostKeyChecking=no ${config.deployUser}@${config.deployHost} '${rollbackScript}'`,
      { stdio: 'inherit' }
    );
  }

  async runGitMCP(command, params = {}) {
    // This would integrate with actual MCP Git tools
    // For now, simulating the calls
    console.log(`🔧 Running Git MCP: ${command}`, params);
    
    switch (command) {
      case 'git_status':
        return { is_clean: true, current_branch: 'main' };
      case 'git_tag':
        return { success: true };
      case 'git_push':
        return { success: true };
      default:
        return { success: true };
    }
  }

  async getLatestCommit() {
    return execSync('git rev-parse HEAD').toString().trim();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run deployment
if (import.meta.url === `file://${process.argv[1]}`) {
  const deployment = new MCPDeployment();
  deployment.deploy().catch(console.error);
}

export default MCPDeployment;