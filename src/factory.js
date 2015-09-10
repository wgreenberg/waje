
var EventEmitter = require('events').EventEmitter;
var WikipediaCSM = require('./csm/wikipedia.js');
var Job = require('./job.js');
var Queue = require('./jobQueue.js');

function Factory () {
    this.events = new EventEmitter();
    // this._q = new Queue();
}

Factory.prototype = {
    fetch: function (payload) {
        var job = new Job(this, payload);

        this.events.emit('new-job', job);

        // this._q.add(job);
        this._runJob(job);
    },

    _runNextJob: function () {
        // var job = this._q.pop();
        // this._runJob(job);
    },

    _runJob: function (job) {
        var payload = job.payload;

        job.started();

        switch (job.payload.source) {
            case 'wikipedia':
                WikipediaCSM.fetch(job);
                break;
            default:
                throw 'wtf is ' + job.payload.source;
        }
    },
};

module.exports = new Factory();
