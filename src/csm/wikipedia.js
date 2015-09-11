
var EventEmitter = require('events').EventEmitter;
var Url = require('url');
var request = require('request');
var Promise = require('bluebird');

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
    fetch: function (job) {
        var self = this;
        job.catchErrors(function () {
            var payload = job.payload;

            if (payload.wikipedia_type === 'image')
                self._fetchImage(job);
            else // article
                self._fetchArticle(job);
        });
    },

    _fetchImage: function (job) {
        var payload = job.payload;
        var imageUrl = payload.wikipedia_imageinfo[0].url;
        job.fromPromise(Cache.getThing(imageUrl));
    },

    _fetchArticle: function (job) {
        var payload = job.payload;
        var factory = job.factory;
        var parsedUrl = Url.parse(payload.url);

        var parsedHtml = getParsedHtml(parsedUrl, Cache);
        var articleMetadata = getArticleMetadata(parsedUrl, Cache);

        var imageMetadata = getImageInfo(parsedUrl, Cache);
        var imageData = getImages(imageMetadata).then(function (images) {
            job.debug('Going to fetch ' + images.length + ' images.');
            images.forEach(function(image) {
                var payload = {
                    source: 'wikipedia',
                    wikipedia_type: 'image',
                    wikipedia_imageinfo: image.imageinfo,
                };

                factory.fetch(payload).then(function (imageJob) {
                    job.emit('new-child', imageJob.id);
                });
            });
        });

        job.fromPromise(Promise.all([
            parsedHtml,
            articleMetadata,
        ]));
    },
};
