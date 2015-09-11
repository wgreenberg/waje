
var Promise = require('bluebird');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var _ = require('underscore');

var Factory = require('./factory.js');

function MessageHandler () {
    this._subscriptions = [];
}
_.extend(MessageHandler.prototype, {
    _msg_emitMessage: function(msg, client) {
        var clients = client ? [client] : this._subscriptions;
        clients.forEach(function(C) {
            C.send(msg);
        });
    },
    _msg_lookupObject: function(objPath) {
        return null;
    },
    _msg_handleMessage: function(msg, client) {
        var handler = this['_msg_handleMessage_' + msg.type];
        if (!handler) return;
        handler.call(this, msg, client);
    },
    _msg_handleMessage_Subscribe: function(msg, client) {
        this._subscriptions.push(client);
        client.on('close', function() {
            this._subscriptions.splice(this._subscriptions.indexOf(client), 1);
        });
        this._msg_handleMessage({ type: 'Sync' }, client);
    },
    _msg_lookupObjectPath: function(path) {
        if (path.length == 0) return this;
        if (path[0] === '') return this._msg_lookupObjectPath(path.slice(1));

        return Promise.resolve(this._msg_lookupObject(path[0])).then(function(obj) {
            if (!obj) return null;
            return obj._msg_lookupObjectPath(path.slice(1));
        }.bind(this));
    },
    _msg_dispatch: function(msg, client) {
        var pathParts = msg.target.split('/');
        this._msg_lookupObjectPath(pathParts).then(function(obj) {
            obj._msg_handleMessage(msg, client);
        });
    },
});

function Client (root, ws) {
    EventEmitter.call(this);
    this._root = root;
    this._ws = ws;
    this._ws.on('message', function(msgS) {
        var msg = JSON.parse(msgS);
        this._root._msg_dispatch(msg, this);
    }.bind(this));
    this._ws.on('close', function() {
        this.emit('close');
    }.bind(this));
}
util.inherits(Client, EventEmitter);
_.extend(Client.prototype, {
    send: function(msg) {
        this._ws.send(JSON.stringify(msg));
    },
});

function GenericHandler (objects) {
    this._objects = objects || {};
}
util.inherits(GenericHandler, MessageHandler);
_.extend(GenericHandler.prototype, {
    _msg_lookupObject: function(path) {
        return this._objects[path];
    },

    registerObject: function(path, obj) {
        this._objects[path] = obj;
    },
});

function FactoryHandler (factory) {
    MessageHandler.call(this);
    this._factory = factory;
}
util.inherits(FactoryHandler, MessageHandler);
_.extend(FactoryHandler.prototype, {
    _msg_lookupObject: function (objPath) {
        if (objPath.slice(0, 4) == 'job_') {
            var jobId = objPath.slice(4);
            return this._factory.findJob(jobId).then(function(job) {
                // XXX: This is ugly
                if (!job._msgHandler) job._msgHandler = new JobHandler(job);
                return job._msgHandler;
            });
        } else {
            return null;
        }
    },
    _msg_handleMessage_Fetch: function (msg, client) {
        this._factory.fetch(msg.payload).then(function(job) {
            var jobPath = msg.target + '/job_' + job.id;
            this._msg_emitMessage({ type: 'NewJob', jobPath: jobPath, target: msg.target }, client);
        }.bind(this));
    }
});

function JobHandler (job) {
    MessageHandler.call(this);
    this._job = job;
    this._job.on('statechange', function(from, to) {
        this._msg_emitMessage({ type: 'StateChange', newState: to });
    }.bind(this));
    this._job.on('bulletin', function() {
        this._msg_emitMessage({ type: 'Bulletin', bulletin: bulletin });
    });
}
util.inherits(JobHandler, MessageHandler);
_.extend(JobHandler.prototype, {
    _msg_handleMessage_Sync: function(msg, client) {
        this._msg_emitMessage({ type: 'Payload', payload: this._job.payload });
        this._msg_emitMessage({ type: 'StateChange', newState: this._job.state });
    },
});

function Server () {
    this._root = new GenericHandler({
        "Factory": new FactoryHandler(Factory),
    });
    this._clients = [];
}
Server.prototype = {
    handleConnection: function(ws) {
        var client = new Client(this._root, ws);
        this._clients.push(client);
    },
};
exports.Server = Server;
