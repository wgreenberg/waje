var Vault = require('./vault.js');
var WikipediaCSM = require('./csm/wikipedia.js');

function Factory () {
    this._vault = new Vault('vault');
    this._q = {};

    this._currResult = 0;
}

Factory.prototype = {
    fetch: function (payload) {
        var result;
        switch (payload.source) {
            case 'wikipedia':
                result = WikipediaCSM.fetch(payload, this._vault);
                break;
            default:
                throw 'wtf is ' + payload.source;
        }
        result.on('progress', function (numFinished) {
            console.log('Progress:', numFinished);
        });
        result.on('error', function (reason) {
            console.error('Error: ', result.url, reason);
            delete this._q[this._currResult];
        }.bind(this));
        result.on('done', function () {
            console.log('Finished: ', result.url, this._q, this._currResult);
            delete this._q[this._currResult];
        }.bind(this));
        this._q[this._currResult++] = result;
    },
};

module.exports = Factory;
