var Factory = require('./src/factory.js');

Factory.events.on('new-job', function(job) {
    console.log('Fetching', job.id);

    job.on('statechange', function(from, to) {
        console.log('state', from, to);
    });
    job.on('bulletin', function(bulletin) {
        console.log('bulletin', bulletin);
    });
});
Factory.fetch({
    url:'https://en.wikipedia.org/wiki/Cat',
    source:'wikipedia',
});
