
var fs = require('fs');
var Promise = require('bluebird');
var request = Promise.promisifyAll(require('request'));

var MANIFEST = 'vault/manifest.json';

function Vault (dir) {
    this._manifest = loadManifest();
    this._dir = dir;
}

Vault.prototype = {
    _getPath: function (url) {
        return this._dir + '/' + url.replace(/\//g, ':');
    },
    getThing: function (url) {
        if (this._manifest.hasOwnProperty(url)) {
            var data = fs.readFileSync(this._manifest[url], { encoding: 'utf8' });
            return Promise.resolve(data);
        } else {
            return request.getAsync(url).spread(function(response, body) {
                this._manifest[url] = this._getPath(url);
                saveManifest(this._manifest);
                fs.writeFileSync(this._manifest[url], data);
                return data;
            }.bind(this));
        }
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

module.exports = Vault;
