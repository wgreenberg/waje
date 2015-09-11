
var Promise = require('bluebird');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var uuid = require('node-uuid');

var JobState = {
    QUEUED: "queued",
    RUNNING: "running",
    COMPLETED: "completed",
    ERROR: "error",
};

var BulletinLevel = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug',
};

function Job (factory, payload) {
    EventEmitter.call(this);

    this.factory = factory;
    this.payload = payload;

    this.state = JobState.QUEUED;

    this.id = uuid.v1();
}
util.inherits(Job, EventEmitter);

Job.fromDBJob = function (factory, dbJob) {
    var job = Object.create(Job.prototype);
    EventEmitter.call(job);
    job.factory = factory;
    job.id = dbJob.id;
    job.payload = dbJob.payload;
    job.state = dbJob.state;
    return job;
};

Job.JobState = JobState;

Job.prototype._transition = function (from, to) {
    if (this.state !== from)
        throw new Error("Invalid state transition");

    this.state = to;
    this.emit('statechange', from, to);
};

Job.prototype.postBulletin = function (bulletin) {
    this.emit('bulletin', bulletin);
};
Job.prototype.started = function () {
    this._transition(JobState.QUEUED, JobState.RUNNING);
};
Job.prototype.done = function () {
    this._transition(JobState.RUNNING, JobState.COMPLETED);
};
Job.prototype.fatalError = function (err) {
    this._transition(JobState.RUNNING, JobState.ERROR);
    this.postBulletin({ type: BulletinLevel.ERROR, message: err.message, stack: err.stack });
};
Job.prototype.catchErrors = function (f) {
    try {
        f();
    } catch (e) {
        this.fatalError(e);
    }
};
Job.prototype.info = function (message) {
    this.postBulletin({
        type: BulletinLevel.INFO,
        message: message,
    });
}
Job.prototype.warn = function (message) {
    this.postBulletin({
        type: BulletinLevel.WARN,
        message: message,
    });
}
Job.prototype.debug = function (message) {
    this.postBulletin({
        type: BulletinLevel.DEBUG,
        message: message,
    });
}

Job.prototype.clone = function () {
    return new Job(this.factory, this.payload);
};

Job.prototype.fromPromise = function (p) {
    var self = this;

    p.then(function() {
        self.done();
    }, function(err) {
        self.fatalError(err);
    });
};

module.exports = Job;
