module.exports = {
  apps: [
    {
      name: 'mailsender-backend',
      script: './backend/src/index.js',
      cwd: '/var/www/mailsender',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: '/var/log/mailsender/backend-error.log',
      out_file: '/var/log/mailsender/backend-out.log',
      log_file: '/var/log/mailsender/backend-combined.log',
      time: true
    },
    {
      name: 'mailsender-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/mailsender/frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/mailsender/frontend-error.log',
      out_file: '/var/log/mailsender/frontend-out.log',
      log_file: '/var/log/mailsender/frontend-combined.log',
      time: true
    },
    {
      name: 'mailsender-cron',
      script: './backend/src/cron.js',
      cwd: '/var/www/mailsender',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      cron_restart: '0 0 * * *', // Restart daily at midnight
      env: {
        NODE_ENV: 'production'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/mailsender/cron-error.log',
      out_file: '/var/log/mailsender/cron-out.log',
      log_file: '/var/log/mailsender/cron-combined.log',
      time: true
    }
  ]
};
