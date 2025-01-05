module.exports = {
  apps: [{
    name: 'mongodb',
    script: 'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe',
    args: '--dbpath "D:\\P6Englishassignments\\data\\db"',
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