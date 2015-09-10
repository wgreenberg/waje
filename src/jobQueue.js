function Queue () {

}

Queue.prototype = {
    add: function (job) {
        job.start();
    },
};

module.exports = Queue;
