
var fs = require('fs');
var Promise = require('bluebird');

var MANIFEST = 'vault/manifest.json';

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

function Vault (dir) {
    this._manifest = loadManifest();
    this._dir = dir;
    try { fs.mkdirSync(dir); } catch(e) { }
}

Vault.prototype = {
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
        saveManifest(this._manifest);
        fs.writeFileSync(this._manifest[key], value);
    },
};

function loadManifest () {
    if (!fs.existsSync(MANIFEST))
        return {};

    return JSON.parse(fs.readFileSync(MANIFEST, { encoding: 'utf8' }));
}

function saveManifest (newManifest) {
    return fs.writeFileSync(MANIFEST, JSON.stringify(newManifest, null, 2), { encoding: 'utf8' });
}

module.exports = new Vault('vault');
