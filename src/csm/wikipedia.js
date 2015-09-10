
var EventEmitter = require('events').EventEmitter;
var Url = require('url');
var request = require('request');
var Promise = require('bluebird');

var Job = require('../job.js');
var Cache = require('../cache.js');

function getParsedHtml (url) {
    var args = {
        'action': 'parse',
        'page': url.pathname.split('/')[2],
        'prop': 'text',
        'redirects': '',
    };
    var apiUrl = getApiUrl(url, args);
    return Cache.getThing(apiUrl);
}

function getArticleMetadata (url) {
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
    return Cache.getThing(apiUrl);
}

function getImageInfo (url) {
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
    return Cache.getThing(apiUrl);
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

function getImages (imageMetadata) {
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
    });
}

module.exports = {
    fetch: function (payload) {
        return new Job(this._getFetcher(payload));
    },

    _getFetcher: function (payload) {
        if (payload.wikipedia_type === 'image')
            return this._getImageFetcher(payload);
        else // article
            return this._getArticleFetcher(payload);
    },

    _getImageFetcher: function (payload) {
        return function (job) {
            var imageUrl = payload.wikipedia_imageinfo[0].url;
            return Cache.getThing(imageUrl);
        };
    },

    _getArticleFetcher: function (payload) {
        return function (job) {
            var factory = payload.factory;

            var parsedUrl = Url.parse(payload.url);

            var parsedHtml = getParsedHtml(parsedUrl, Cache);
            var articleMetadata = getArticleMetadata(parsedUrl, Cache);

            var imageMetadata = getImageInfo(parsedUrl, Cache);
            var imageData = getImages (imageMetadata).then(function (images) {
                images.forEach(function(image) {
                    var payload = {
                        source: 'wikipedia',
                        wikipedia_type: 'image',
                        wikipedia_imageinfo: image.imageinfo,
                    };

                    var imageJob = factory.fetch(payload);
                    // XXX: Track dependencies somehow?
                });
            });

            return Promise.all([
                parsedHtml,
                articleMetadata,
            ]).then(function (datums) {
                job.emit('done');
            }, function (err) {
                job.emit('error', err);
            });
        };
    },
};
