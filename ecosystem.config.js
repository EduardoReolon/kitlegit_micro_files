module.exports = {
    apps: [{
        name: "micro",
        script: "build/index.js",// name of the startup file
        exec_mode: "cluster",  // to turn on cluster mode; defaults to 'fork' mode
        max_memory_restart: "1900M",
        kill_timeout : 30000, // 30 segundos
        // env           : { 'LD_PRELOAD': '/usr/lib/x86_64-linux-gnu/libjemalloc.so.1', 'NODE_ENV': 'production' },
        // env_production: { 'LD_PRELOAD': '/usr/lib/x86_64-linux-gnu/libjemalloc.so.1', 'NODE_ENV': 'production' },
        // wait_ready    : true,
        // watch: ["build"],
        instances: 2,          // number of workers you want to run
        // "env": {
        //     "PORT": "9090" // the port on which the app should listen
        // }
        // for more options refer : http://pm2.keymetrics.io/docs/usage/application-declaration/#process-file
    }]
}
