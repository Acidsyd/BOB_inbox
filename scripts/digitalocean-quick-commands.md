# DigitalOcean MCP Quick Commands

## 🚀 Connect GitHub Repository to DigitalOcean App Platform

### Step 1: Check Existing Apps
```bash
/mcp digitalocean list_apps
```

### Step 2: Create New App (if needed)
```bash
/mcp digitalocean create_app spec:'{
  "name": "mailsender",
  "services": [
    {
      "name": "backend",
      "source_dir": "backend", 
      "github": {
        "repo": "Acidsyd/BOB_inbox",
        "branch": "main",
        "deploy_on_push": true
      },
      "run_command": "npm start",
      "build_command": "npm ci && npm run build",
      "environment_slug": "node-js",
      "instance_size_slug": "basic-xxs",
      "http_port": 4000,
      "health_check": {"http_path": "/health"}
    },
    {
      "name": "frontend",
      "source_dir": "frontend",
      "github": {
        "repo": "Acidsyd/BOB_inbox", 
        "branch": "main",
        "deploy_on_push": true
      },
      "run_command": "npm start",
      "build_command": "npm ci && npm run build", 
      "environment_slug": "node-js",
      "instance_size_slug": "basic-xxs",
      "http_port": 3001,
      "routes": [{"path": "/"}]
    }
  ]
}'
```

### Step 3: Check App Status
```bash
/mcp digitalocean get_app name:mailsender
```

### Step 4: Monitor Deployment
```bash
/mcp digitalocean list_deployments app:mailsender
```

### Step 5: Check Logs
```bash
/mcp digitalocean get_logs app:mailsender service:backend
/mcp digitalocean get_logs app:mailsender service:frontend
```

## 🔧 Environment Variables Setup

### Add Environment Variables
```bash
/mcp digitalocean update_app name:mailsender envs:backend:SUPABASE_URL=your_supabase_url
/mcp digitalocean update_app name:mailsender envs:backend:SUPABASE_SERVICE_KEY=your_service_key
/mcp digitalocean update_app name:mailsender envs:backend:JWT_SECRET=your_jwt_secret
/mcp digitalocean update_app name:mailsender envs:backend:GOOGLE_OAUTH2_CLIENT_ID=your_client_id
```

## 📊 Monitoring Commands

### App Status
```bash
/mcp digitalocean get_app name:mailsender
```

### Deployment History
```bash
/mcp digitalocean list_deployments app:mailsender
```

### Real-time Logs
```bash
/mcp digitalocean get_logs app:mailsender service:backend tail:true
```

### App Metrics
```bash
/mcp digitalocean get_metrics app:mailsender
```

## 🔄 Deployment Commands

### Trigger Manual Deployment
```bash
/mcp digitalocean create_deployment app:mailsender
```

### Rollback Deployment
```bash
/mcp digitalocean rollback app:mailsender deployment:previous
```

## 🌐 Domain Configuration

### Add Custom Domain
```bash
/mcp digitalocean add_domain app:mailsender domain:yourdomain.com
```

### List Domains
```bash
/mcp digitalocean list_domains app:mailsender
```

## 📋 Infrastructure Commands

### List Available Regions
```bash
/mcp digitalocean list_regions
```

### List Instance Sizes
```bash
/mcp digitalocean list_sizes
```

### List Databases
```bash
/mcp digitalocean list_databases
```

## 🚨 Troubleshooting

### Check Build Logs
```bash
/mcp digitalocean get_logs app:mailsender service:backend type:build
```

### Check Runtime Logs  
```bash
/mcp digitalocean get_logs app:mailsender service:backend type:run
```

### Restart Service
```bash
/mcp digitalocean restart_service app:mailsender service:backend
```