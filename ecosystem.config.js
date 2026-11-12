// pm2 start ecosystem.config.js
// NetsBlox keeps live WebSocket/room state in memory, so it must run as ONE
// process (fork mode). Do not use cluster mode or more instances.
// bin/netsblox-start.js also spawns the services server on PORT+1.
module.exports = {
    apps: [
        {
            name: 'netsblox',
            script: 'bin/netsblox-start.js',
            cwd: __dirname,
            exec_mode: 'fork',
            instances: 1,
            node_args: '--max-old-space-size=3072',
            max_memory_restart: '3500M',
            kill_timeout: 10000,
            env: {
                // Remaining settings (MONGO_URI, SESSION_SECRET, HOST, ...) come
                // from .env next to this file; see .env.example.
                // Keep info/warn/error, drop the very chatty trace/log output.
                DEBUG: 'netsblox:*:info,netsblox:*:warn,netsblox:*:error',
            },
        },
    ],
};
