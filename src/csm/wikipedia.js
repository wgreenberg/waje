var EventEmitter = require('events').EventEmitter;
var Url = require('url');
var request = require('request');
var Promise = require('bluebird');

function getParsedHtml (url, vault) {
    var args = {
        'action': 'parse',
        'page': url.pathname.split('/')[2],
        'prop': 'text',
        'redirects': '',
    };
    var apiUrl = getApiUrl(url, args);
    return vault.getThing(apiUrl);
}

function getArticleMetadata (url, vault) {
    var args = {
        'action': 'query',
         'titles': url.pathname.split('/')[2],
         'redirects': '',
         'prop': 'revisions|info|categories',
         'inprop': 'url|displaytitle',
         'cllimit': 'max',
         'clshow': '!hidden',
         'rvprop': 'timestamp'
    };
    var apiUrl = getApiUrl(url, args);
    return vault.getThing(apiUrl);
}

function getImageInfo (url, vault) {
    var args = {
        'action': 'query',
        'titles': url.pathname.split('/')[2],
        'redirects': '',
        'generator': 'images',
        'gimlimit': 'max',
        'iiprop': 'url|dimensions|extmetadata|user|mediatype',
        'iiurlwidth': 800,
        'prop': 'imageinfo'
    };
    var apiUrl = getApiUrl(url, args);
    return vault.getThing(apiUrl);
}

function getApiUrl (url, args) {
    var parsed = Url.parse(url);
    args.format = 'json';
    return Url.format({
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        pathname: '/w/api.php',
        query: args,
    });
}

module.exports = {
    fetch: function (payload, vault) {
        var emitter = new EventEmitter();

        var parsedUrl = Url.parse(payload.url);

        var parsedHtml = getParsedHtml(parsedUrl, vault);
        var imageInfo = getImageInfo(parsedUrl, vault);
        var articleMetadata = getArticleMetadata(parsedUrl, vault);

        Promise.all([
            parsedHtml,
            imageInfo,
            articleMetadata,
        ]).then(function (datums) {
            emitter.emit('done');
        }, function (err) {
            emitter.emit('error', err);
        });

        return emitter;
    },
};
