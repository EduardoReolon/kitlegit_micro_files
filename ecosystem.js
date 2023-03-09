{
    apps: [{
        "name": "micro",
        "script": "build/index.js",// name of the startup file
        "exec_mode": "fork",  // to turn on cluster mode; defaults to 'fork' mode
        // "instances": 4,          // number of workers you want to run
        // "env": {
        //     "PORT": "9090" // the port on which the app should listen
        // }
        // for more options refer : http://pm2.keymetrics.io/docs/usage/application-declaration/#process-file
    }]
}
