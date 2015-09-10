var EventEmitter = require('events').EventEmitter;
var Url = require('url');
var request = require('request');
var Promise = require('bluebird');
var Job = require('../job.js');

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

function getImageUrls (imageMetadata) {
    return imageMetadata
    .then(JSON.parse)
    .then(function (imageData) {
        return imageData['query']['pages'];
    })
    .then(function (images) {
        return Object.keys(images).map(function (key) {
            return images[key];
        });
    })
    .then(function (images) {
        return images.filter(function (image) {
            return image.hasOwnProperty('imageinfo')
        });
    })
    .then(function (images) {
        return images.filter(function (image) {
            var imageinfo = image.imageinfo[0];
            return imageinfo.mediatype !== 'AUDIO' && imageinfo.mediatype !== 'VIDEO';
        });
    })
    .then(function (images) {
        return images.map(function (image) {
            return image.imageinfo[0].url;
        });
    });
}

module.exports = {
    fetch: function (payload, vault) {
        return new Job(this._getFetcher(payload, vault));
    },

    _getFetcher: function (payload, vault) {
        return function (job) {
            var parsedUrl = Url.parse(payload.url);

            var parsedHtml = getParsedHtml(parsedUrl, vault);
            var imageMetadata = getImageInfo(parsedUrl, vault);
            var articleMetadata = getArticleMetadata(parsedUrl, vault);

            var imageData = getImageUrls(imageMetadata)
            .then(function (imageUrls) {
                var numFinished = 0;
                return Promise.all(imageUrls.map(function (imageUrl) {
                    return vault.getThing(imageUrl)
                    .then(function () {
                        job.emit('progress', numFinished);
                        numFinished++;
                    });
                }));
            });

            return Promise.all([
                parsedHtml,
                imageMetadata,
                articleMetadata,
                imageData,
            ]).then(function (datums) {
                job.emit('done');
            }, function (err) {
                job.emit('error', err);
            });
        };
    },
};
