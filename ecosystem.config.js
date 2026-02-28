module.exports = {
  apps: [
    {
      name: "fifty-tech-pos",
      script: "server/server.js",
      cwd: "./",
      env: {
        NODE_ENV: "production",
      },
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      restart_delay: 3000,
      max_restarts: 10,
      watch: false,
    },
  ],
};
