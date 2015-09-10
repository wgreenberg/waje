
var EventEmitter = require('events').EventEmitter;
var WikipediaCSM = require('./csm/wikipedia.js');
var Queue = require('./jobQueue.js');

function Factory () {
    this.events = new EventEmitter();

    this._q = new Queue();
}

Factory.prototype = {
    fetch: function (payload) {
        var job;

        this.events.emit('fetching', payload);

        switch (payload.source) {
            case 'wikipedia':
                job = WikipediaCSM.fetch(payload);
                break;
            default:
                throw 'wtf is ' + payload.source;
        }

        job.on('progress', function (numFinished) {
            this.events.emit('progress', payload, numFinished);
        }.bind(this));
        job.on('error', function (reason) {
            this.events.emit('error', payload, reason);
        }.bind(this));
        job.on('done', function () {
            this.events.emit('done', payload);
        }.bind(this));

        this._q.add(job);
    },
};

module.exports = new Factory();
