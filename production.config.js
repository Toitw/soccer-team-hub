/**
 * Production configuration for Node.js application
 * This is used as a reference but not directly used in the deployment
 * since Replit handles the process management
 */
module.exports = {
  apps: [
    {
      name: 'teamkick',
      script: 'dist/index.js',
      instances: 'max', // Use maximum available CPU cores
      exec_mode: 'cluster', // Run in cluster mode for load balancing
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      // Configuration for high availability
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      wait_ready: true,
      kill_timeout: 5000,
      // Graceful shutdown
      shutdown_with_message: true,
      // Merge logs
      merge_logs: true,
      // Error file path
      error_file: './logs/error.log',
      // Log file configuration
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // HTTP server monitoring
      max_memory_restart: '1G',
      // Monitoring metrics
      metrics: {
        http: 9209 // Expose metrics on this port
      },
      // Node.js specific flags
      node_args: [
        '--max-old-space-size=768', // Memory limit (adjust based on available memory)
        '--max-http-header-size=16384', // Increase header size for larger cookies
        '--no-warnings', // Suppress Node.js warnings
        '--enable-source-maps' // Enable source maps for better error tracing
      ]
    }
  ]
};