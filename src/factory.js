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

        var idx = this._currResult++;
        this._q[idx] = result;
        result.on('error', function (reason) {
            console.error('Error: ', reason);
            delete this._q[idx];
        }.bind(this));
        result.on('done', function () {
            console.log('Finished: ');
            delete this._q[idx];
        }.bind(this));
    },
};

module.exports = Factory;
