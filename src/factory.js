
var EventEmitter = require('events').EventEmitter;
var WikipediaCSM = require('./csm/wikipedia.js');
var Job = require('./job.js');
var JobStore = require('./jobStore.js');

function Factory () {
    this.events = new EventEmitter();
    this._jobStore = new JobStore(this);
}

Factory.prototype = {
    fetch: function (payload) {
        var job = new Job(this, payload);
        return this._jobStore.register(job).then(function () {
            this.events.emit('new-job', job);
            this._runJob(job);
            return job;
        }.bind(this));
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
