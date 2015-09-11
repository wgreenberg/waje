
var Vault = require('./vault.js');
var Promise = require('bluebird');
var request = Promise.promisifyAll(require('request'));

exports.getThing = function (url, cachePolicy) {
    if (Vault.hasDocument(url, cachePolicy)) {
        return Vault.getDocument(url);
    } else {
        return request.getAsync(url).spread(function(response, body) {
            Vault.storeDocument(url, body);
            return body;
        }.bind(this));
    }
};
