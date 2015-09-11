
var fs = require('fs');
var Promise = require('bluebird');

// Checks if the given path is up to date given the cache policy.
function checkCachePolicy(path, cachePolicy) {
    if (!cachePolicy)
        return true;
    if (cachePolicy.force)
        return false;

    var stats = fs.statSync(path);
    if ((Date.now() - stats.mtime) < cachePolicy.mtimeDelta)
        return true;

    return false;
}

var MANIFEST = '_manifest.json';

function Vault (dir) {
    this._dir = dir;
    try { fs.mkdirSync(this._dir); } catch(e) { }

    this._manifestPath = this._dir + '/' + MANIFEST;
    this._loadManifest();
}

Vault.prototype = {
    _loadManifest: function () {
        if (fs.existsSync(this._manifestPath))
            this._manifest = JSON.parse(fs.readFileSync(this._manifestPath, { encoding: 'utf8' }));
        else
            this._manifest = {};
    },
    _saveManifest: function () {
        var data = JSON.stringify(this._manifest, null, 2);
        return fs.writeFileSync(this._manifestPath, data, { encoding: 'utf8' });
    },

    _getPath: function (key) {
        return this._dir + '/' + key.replace(/\//g, ':');
    },

    hasDocument: function (key, cachePolicy) {
        var path = this._manifest[key];
        return !!path && checkCachePolicy(path, cachePolicy);
    },

    getDocument: function (key) {
        var data = fs.readFileSync(this._manifest[key], { encoding: 'utf8' });
        return Promise.resolve(data);
    },

    storeDocument: function (key, value) {
        this._manifest[key] = this._getPath(key);
        this._saveManifest();
        fs.writeFileSync(this._manifest[key], value);
    },
};

module.exports = new Vault('vault');
