var Factory = require('./src/factory.js');

Factory.events.on('fetching', function(payload) {
    console.log('Fetching', payload);
});
Factory.events.on('progress', function(payload, numFinished) {
    console.log('Progress', payload, numFinished);
});
Factory.events.on('done', function(payload) {
    console.log('Finished', payload);
});
Factory.events.on('error', function(payload, reason) {
    console.error('Error', payload, reason);
});
Factory.fetch({
    url:'https://en.wikipedia.org/wiki/Cat',
    source:'wikipedia',
});
