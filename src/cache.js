
var Vault = require('./vault.js');
var Promise = require('bluebird');
var request = Promise.promisifyAll(require('request'));

exports.getThing = function (url) {
    if (Vault.hasDocument(url)) {
        return Vault.getDocument(url);
    } else {
        return request.getAsync(url).spread(function(response, body) {
            Vault.storeThing(url, body);
            return body;
        }.bind(this));
    }
};
