
var Factory = require('./src/factory.js');
var ws = require('ws');
var msg = require('./src/msg.js');

var server = new msg.Server();
var wss = new ws.Server({ port: 8080, path: '/control/' });
wss.on('connection', function(ws) { server.handleConnection(ws) });
