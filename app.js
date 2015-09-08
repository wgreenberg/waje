var Factory = require('./src/factory.js');

var f = new Factory();
f.fetch({
    url:'https://en.wikipedia.org/wiki/Cat',
    source:'wikipedia',
});
