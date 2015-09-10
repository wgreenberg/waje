
var Factory = require('./src/factory.js');
var ws = require('ws');

var conns = [];

function dispatch(payload) {
    conns.forEach(function(ws) {
        return ws.send(JSON.stringify(payload));
    });
}

Factory.events.on('new-job', function(job) {
    dispatch({ type: 'fetching', payload: job.payload });

    Factory.events.on('statechange', function(from, to) {
        dispatch({ type: 'state', from: from, to: to });
    });

    Factory.events.on('bulletin', function(bulletin) {
        dispatch({ type: 'bulletin', bulletin: bulletin });
    });
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
            Factory.fetch(msg.payload);
            break;
        }
    });
    ws.on('close', function() {
        conns.splice(conns.indexOf(ws), 1);
    });
});
