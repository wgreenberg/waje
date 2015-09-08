(function(exports) {
    "use strict";

    function newSocket(path) {
        var ws = new WebSocket("ws://localhost:8080" + path, "waje");
        ws.binaryType = 'arraybuffer';
        return ws;
    }

    var control = newSocket('/control/');
    control.onmessage = function(event) {
        var msg = JSON.parse(event.data);
        console.log(JSON.stringify(msg, null, 2));
    };

    function sendmsg(msg) {
        control.send(JSON.stringify(msg, null, 2));
    }
    setTimeout(function() {
        console.log("XXX");
        sendmsg({ type: 'fetch', payload: {
            url:'https://en.wikipedia.org/wiki/Cat',
            source:'wikipedia',
        }});
    }, 1000);

})(window);
