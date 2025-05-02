/**
 * Production configuration for Node.js application
 * This is used as a reference but not directly used in the deployment
 * since Replit handles the process management
 */
module.exports = {
  apps: [
    {
      name: "teamkick-app",
      script: "dist/index.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      },
      max_memory_restart: "512M",
      node_args: "--max-old-space-size=512",
      exp_backoff_restart_delay: 100,
      // Health check settings
      wait_ready: true,
      listen_timeout: 10000,
      // Error handling
      max_restarts: 10,
      restart_delay: 1000,
      // Logging
      error_file: "logs/error.log",
      out_file: "logs/output.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true
    }
  ]
};