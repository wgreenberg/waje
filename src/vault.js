var fs = require('fs');
var request = require('request');
var Promise = require('bluebird');

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
        return new Promise.Promise(function (resolve, reject) {
            if (this._manifest.hasOwnProperty(url)) {
                var data = fs.readFileSync(this._manifest[url], { encoding: 'utf8' })
                resolve(data);
            } else {
                var data = request.get(url, function (err, response, data) {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('fffff');
                        try {
                        this._manifest[url] = this._getPath(url);
                        saveManifest(this._manifest);
                        fs.writeFileSync(this._manifest[url], data);
                        resolve(data);
                        } catch (e) { console.log('fuck') }
                    }
                }.bind(this));
            }
        }.bind(this));
    },
};

function loadManifest () {
    if (!fs.existsSync(MANIFEST))
        return {};

    return JSON.parse(fs.readFileSync(MANIFEST, { encoding: 'utf8' }));
}

function saveManifest (newManifest) {
    console.log(JSON.stringify(newManifest, null, 2));
    return fs.writeFileSync(MANIFEST, JSON.stringify(newManifest, null, 2), { encoding: 'utf8' });
}

module.exports = Vault;
