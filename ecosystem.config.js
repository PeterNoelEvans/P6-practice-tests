module.exports = {
  apps: [{
    name: 'mongodb',
    script: 'C:\\Program Files\\MongoDB\\Server\\{version}\\bin\\mongod.exe',
    args: '--dbpath C:\\data\\db',
    interpreter: 'none',
    autorestart: true
  }, {
    name: 'your-app',
    script: 'server.js',
    watch: true,
    env: {
      NODE_ENV: 'development'
    }
  }]
}; 