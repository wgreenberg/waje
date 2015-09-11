
var EventEmitter = require('events').EventEmitter;
var WikipediaCSM = require('./csm/wikipedia.js');
var Job = require('./job.js');

function Factory () {
    this.events = new EventEmitter();
}

Factory.prototype = {
    fetch: function (payload) {
        var job = new Job(this, payload);

        this.events.emit('new-job', job);

        this._runJob(job);
        
        return job;
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
