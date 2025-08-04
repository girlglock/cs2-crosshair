module.exports = {
  apps: [{
    name: 'cs2-crosshair',
    script: 'crosshair-server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_file: './logs/crosshair.log',
    out_file: './logs/crosshair-out.log',
    error_file: './logs/crosshair-error.log',
    time: true
  }]
};