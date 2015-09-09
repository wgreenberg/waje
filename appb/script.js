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

    var control = newSocket('/control/');
    control.onmessage = function(event) {
        var msg = JSON.parse(event.data);
        jlog(['ws recv', msg]);
    };

    function sendmsg(msg) {
        jlog(['ws send', msg]);
        control.send(JSON.stringify(msg, null, 2));
    }
    function fetch(url) {
        jlog(['ui fetch', url]);
        sendmsg({ type: 'fetch', payload: {
            url: url,
            source:'wikipedia',
        }});
    }

    document.querySelector('#submit').onclick = function() {
        var url = document.querySelector('#article_id').value;
        fetch(url);
    };

})(window);
