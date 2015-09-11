
var util = require('util');

var WikipediaCSM = require('./csm/wikipedia.js');
var Job = require('./job.js');
var JobStore = require('./jobStore.js');

function Factory () {
    this._jobStore = new JobStore(this);
}
Factory.prototype = {
    fetch: function (payload) {
        var job = new Job(this, payload);
        return this._jobStore.register(job).then(function () {
            this._runJob(job);
            return job;
        }.bind(this));
    },

    findJob: function(jobId) {
        return this._jobStore.findJob(jobId);
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
