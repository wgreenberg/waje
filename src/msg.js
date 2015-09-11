
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
        msg.target = this.path;
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
        console.log(this.constructor.name, '_msg_handleMessage_' + msg.type);
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
    this.factory = factory;
    this.path = '/Factory';

    this._jobsRegistry = new JobsRegistry(this);
}
util.inherits(FactoryHandler, MessageHandler);
_.extend(FactoryHandler.prototype, {
    _msg_lookupObject: function (objPath) {
        if (objPath == 'Job') return this._jobsRegistry;
        return null;
    },
    _msg_handleMessage_Fetch: function (msg, client) {
        this.factory.fetch(msg.payload).then(function(job) {
            var jobPath = this._jobsRegistry.getJobPath(job);
            this._msg_emitMessage({ type: 'NewJob', jobPath: jobPath }, client);
        }.bind(this));
    }
});

function JobsRegistry (factoryHandler) {
    MessageHandler.call(this);
    this._factoryHandler = factoryHandler;
    this.path = this._factoryHandler.path + '/Job';
}
util.inherits(JobsRegistry, MessageHandler);
_.extend(JobsRegistry.prototype, {
    getJobPath: function(job) {
        return this.path + '/' + job.id;
    },

    _msg_lookupObject: function (objPath) {
        var jobId = objPath;
        return this._factoryHandler.factory.findJob(jobId).then(function(job) {
            if (!job._msgHandler) job._msgHandler = new JobHandler(job, this);
            return job._msgHandler;
        }.bind(this));
    },
});

function JobHandler (job, jobRegistry) {
    MessageHandler.call(this);
    this._job = job;
    this._jobRegistry = jobRegistry;
    this.path = this._jobRegistry.getJobPath(this._job);
    this._job.on('statechange', function(from, to) {
        this._msg_emitMessage({ type: 'StateChange', newState: to });
    }.bind(this));
    this._job.on('bulletin', function(bulletin) {
        this._msg_emitBulletin(bulletin);
    }.bind(this));
    this._job.on('new-child', function(job) {
        var jobPath = this._jobRegistry.getJobPath(this._job);
        this._msg_emitMessage({ type: 'NewJob', jobPath: jobPath }, client);
    }.bind(this));
}
util.inherits(JobHandler, MessageHandler);
_.extend(JobHandler.prototype, {
    _msg_emitBulletin: function(bulletin) {
        this._msg_emitMessage({ type: 'Bulletin', bulletin: bulletin });
    },
    _msg_handleMessage_Sync: function(msg, client) {
        this._msg_emitMessage({ type: 'Payload', payload: this._job.payload });
        this._msg_emitMessage({ type: 'StateChange', newState: this._job.state });
    },
    _msg_handleMessage_GetBulletins: function(msg, client) {
        // XXX
        this._job.factory._jobStore.Bulletin.findAll({
            where: {
                jobId: this._job.jobId,
            },
        }).then(function(bulletins) {
            bulletins.forEach(function(bulletin) {
                this._msg_emitBulletin(bulletin);
            }.bind(this));
        }.bind(this));
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
