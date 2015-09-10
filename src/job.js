var Promise = require('bluebird');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

// runner :: Job -> Promise(Completed Job)
function Job (runner) {
    this._signals = ['done', 'progress'];
    EventEmitter.call(this);
    this._runner = runner || Promise.resolve;
    this._started = false;
}

util.inherits(Job, EventEmitter);

Job.prototype.start = function () {
    var self = this;
    if (self._started) {
        return Promise.reject();
    }

    self._started = true;
    return self._runner(self)
    .then(function (val) {
        self.emit('done', val);
        return val;
    })
    .catch(function (reason) {
        self.emit('fail', reason);
        throw reason;
    });
}

Job.prototype.clone = function () {
    return new Job(this._runner);
}

module.exports = Job;

/*
function timer (j) {
    return new Promise.Promise(function (resolve, reject) {
        setTimeout(function () {
            j.emit('progress', 0);
        }, 0);
        setTimeout(function () {
            j.emit('progress', .25);
        }, 10);
        setTimeout(function () {
            j.emit('progress', .5);
        }, 20);
        setTimeout(function () {
            j.emit('progress', .7);
        }, 30);
        setTimeout(function () {
            resolve();
        }, 40);
    });
}

var a = new Job(timer);
a.on('progress', function (amt) { console.log(amt) });
a.on('done', function (amt) { console.log('done signal') });
a.start().then(function () { console.log('its really done') });
*/
