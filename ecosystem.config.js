// PM2 process config for the Toko Online Sample app.
// Start: pnpm build && pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "toko-online",
      cwd: __dirname,
      // Run Next's binary directly (avoids pnpm's pre-run dependency check).
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
