module.exports = {
    apps: [
        {
            name: 'sales-service',
            script: './dist/server.js',
            watch: false,
            interpreter: 'node',
            interpreter_args: '--env-file=.env',
        },
    ],
}
