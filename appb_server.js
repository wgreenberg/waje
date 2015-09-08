
var Factory = require('./src/factory.js');
var ws = require('ws');

var conns = [];

function dispatch(payload) {
    conns.forEach(function(ws) {
        return ws.send(JSON.stringify(payload));
    });
}

var f = new Factory();
f.events.on('fetching', function(payload) {
    dispatch({ type: 'fetching', payload: payload });
});
f.events.on('progress', function(payload, numFinished) {
    dispatch({ type: 'progress', payload: payload, numFinished: numFinished });
});
f.events.on('error', function(payload, reason) {
    dispatch({ type: 'error', payload: payload, reason: reason });
});
f.events.on('done', function(payload) {
    dispatch({ type: 'done', payload: payload });
});

var wss = new ws.Server({ port: 8080, path: '/control/' });
wss.on('connection', function(ws) {
    conns.push(ws);
    console.log("XXX got conn");
    ws.on('message', function(msgS) {
        console.log("got msgS", msgS);
        var msg = JSON.parse(msgS);
        switch (msg.type) {
        case 'fetch':
            f.fetch(msg.payload);
            break;
        }
    });
    ws.on('close', function() {
        conns.splice(conns.indexOf(ws), 1);
    });
});
