
var fs = require('fs');
var Promise = require('bluebird');

var MANIFEST = 'vault/manifest.json';

function Vault (dir) {
    this._manifest = loadManifest();
    this._dir = dir;
}

Vault.prototype = {
    _getPath: function (key) {
        return this._dir + '/' + key.replace(/\//g, ':');
    },

    hasDocument: function (key) {
        return !!this._manifest[key];
    },

    getDocument: function (key) {
        var data = fs.readFileSync(this._manifest[key], { encoding: 'utf8' });
        return Promise.resolve(data);
    },

    storeThing: function (key, value) {
        this._manifest[key] = this._getPath(key);
        saveManifest(this._manifest);
        fs.writeFileSync(this._manifest[key], value);
    },

    storeDocument: function (data) {
        var thisId = this._manifest.id;
        this._manifest.id++;
        this.storeThing(thisId, data);
    },
};

function loadManifest () {
    if (!fs.existsSync(MANIFEST))
        return {
            id: 0,
        };

    return JSON.parse(fs.readFileSync(MANIFEST, { encoding: 'utf8' }));
}

function saveManifest (newManifest) {
    return fs.writeFileSync(MANIFEST, JSON.stringify(newManifest, null, 2), { encoding: 'utf8' });
}

module.exports = new Vault('vault');
