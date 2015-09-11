(function(exports) {
    "use strict";

    function newSocket(path) {
        var ws = new WebSocket("ws://localhost:8080" + path, "waje");
        ws.binaryType = 'arraybuffer';
        return ws;
    }

    var dlog_ = document.querySelector('#log');
    function dlog(S) {
        dlog_.textContent += S + '\n\n';
    }
    function jlog(j) {
        dlog(JSON.stringify(j, null, 2));
    }

    function Client(ws) {
        this._ws = ws;
        this._objects = {};

        this._ws.onmessage = function(event) {
            var msgS = event.data;
            var msg = JSON.parse(msgS);
            this._handleMessage(msg);
        }.bind(this);
    }
    Client.prototype.registerObject = function(path, obj) {
        this._objects[path] = obj;
    };
    Client.prototype._handleMessage = function(msg) {
        jlog(['ws recv', msg]);

        var obj = this._objects[msg.target];
        if (!obj) return;

        obj._msg_handleMessage(msg);
    };
    Client.prototype.sendMessage = function(msg) {
        jlog(['ws send', msg]);

        this._ws.send(JSON.stringify(msg));
    };

    function MessageHandler(client, path) {
        this._client = client;
        this.path = path;
        this._client.registerObject(this.path, this);
    }
    MessageHandler.prototype._msg_emitMessage = function(msg) {
        msg.target = this.path;
        this._client.sendMessage(msg);
    };
    MessageHandler.prototype.subscribe = function() {
        this._msg_emitMessage({ type: 'Subscribe' });
    };
    MessageHandler.prototype._msg_handleMessage = function(msg) {
        var handler = this['_msg_handleMessage_' + msg.type];
        if (!handler) return;
        handler(msg);
    };

    function Job(client, path) {
        MessageHandler.call(this, client, path);
    }
    Job.prototype = Object.create(MessageHandler.prototype);
    Job.prototype._msg_handleMessage_Payload = function(msg) {
        jlog(['pl', msg]);
    };

    function Factory(client, path) {
        MessageHandler.call(this, client, path);
    }
    Factory.prototype = Object.create(MessageHandler.prototype);
    Factory.prototype._msg_handleMessage_NewJob = function(msg) {
        var job = new Job(client, msg.jobPath);
        job.subscribe();
    };
    Factory.prototype.fetch = function(payload) {
        this._msg_emitMessage({ type: 'Fetch', payload: payload });
    };

    var control = newSocket('/control/');
    var client = new Client(control);

    var factory = new Factory(client, '/Factory');

    document.querySelector('#submit').onclick = function() {
        var url = document.querySelector('#article_id').value;
        factory.fetch({
            source: 'wikipedia',
            url: url,
        });
    };

})(window);
