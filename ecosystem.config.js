module.exports = {
  apps: [
    {
      name: "backend-setup",
      script: "./server.js",

    //   instances: "max", // all CPU cores
      instances: 6,
      exec_mode: "cluster",

      watch: false,

      max_memory_restart: "500M",

      env: {
        NODE_ENV: "development"
      },

      env_production: {
        NODE_ENV: "production"
      }
    }
  ]
}