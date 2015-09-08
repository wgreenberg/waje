var EventEmitter = require('events').EventEmitter;
var Vault = require('./vault.js');
var WikipediaCSM = require('./csm/wikipedia.js');

function Factory () {
    this._vault = new Vault('vault');
    this._q = {};
    this._currResult = 0;
    this.events = new EventEmitter();
}

Factory.prototype = {
    fetch: function (payload) {
        var result;

        this.events.emit('fetching', payload);

        switch (payload.source) {
            case 'wikipedia':
                result = WikipediaCSM.fetch(payload, this._vault);
                break;
            default:
                throw 'wtf is ' + payload.source;
        }

        var idx = this._currResult++;
        this._q[idx] = result;

        result.on('progress', function (numFinished) {
            this.events.emit('progress', payload, numFinished);
        }.bind(this));
        result.on('error', function (reason) {
            this.events.emit('error', payload, reason);
            delete this._q[idx];
        }.bind(this));
        result.on('done', function () {
            this.events.emit('done', payload);
            delete this._q[idx];
        }.bind(this));
    },
};

module.exports = Factory;
