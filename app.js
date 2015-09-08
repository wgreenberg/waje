var Factory = require('./src/factory.js');

var f = new Factory();
f.events.on('fetching', function(payload) {
    console.log('Fetching', payload);
});
f.events.on('progress', function(payload, numFinished) {
    console.log('Progress', payload, numFinished);
});
f.events.on('done', function(payload) {
    console.log('Finished', payload);
});
f.events.on('error', function(payload, reason) {
    console.error('Error', payload, reason);
});
f.fetch({
    url:'https://en.wikipedia.org/wiki/Cat',
    source:'wikipedia',
});
