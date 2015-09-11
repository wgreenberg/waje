var Sequelize = require('sequelize');
var Promise = require('bluebird');
var Job = require('./job');

function JobStore (factory) {
    this.factory = factory;

    this._db = new Sequelize('database', 'foo', 'bar', {
        dialect: 'sqlite',
        storage: ':memory:', // FIXME store on disk
        logging: null,
    });

    var jobReady = this._setupJobTable();
    var bulletinReady = this._setupBulletinTable();

    this._inited = Promise.all([jobReady, bulletinReady]);
    this._inited.then(function () { console.log('JobStore ready') });
}

JobStore.prototype = {
    _setupJobTable: function () {
        this.Job = this._db.define('job', {
            id: {
                type: Sequelize.STRING,
                primaryKey: true,
            },
            state: {
                type: Sequelize.STRING,
            },
            payload: {
                type: Sequelize.STRING,
            },
        });
        return this.Job.sync();
    },

    _setupBulletinTable: function () {
        this.Bulletin = this._db.define('bulletin', {
            type: {
                type: Sequelize.STRING,
            },
            message: {
                type: Sequelize.STRING,
            },
        });
        this.Bulletin.belongsTo(this.Job);
        return this.Bulletin.sync();
    },

    register: function (job) {
        var self = this;
        return self._inited.then(function () {
            job.on('bulletin', function (bulletin) {
                self._addBulletin(job, bulletin);
            });
            return self.Job.create({
                id: job.id,
                state: job.state,
                payload: JSON.stringify(job.payload) || '',
            })
            .then(function(dbJob) {
                dbJob.state = job.state;
                dbJob.save();

                job.on('statechange', function (from, to) {
                    dbJob.state = to;
                    dbJob.save();
                });
            });
        });
    },

    findJob: function (jobId) {
        return this.Job.findById(jobId).then(function(dbJob) {
            return Job.fromDBJob(this.factory, dbJob);
        }.bind(this));
    },

    _addBulletin: function (job, bulletin) {
        var self = this;
        return self._inited.then(function () {
            return self.Bulletin.create({
                jobId: job.id,
                type: bulletin.type,
                message: bulletin.message,
            });
        });
    },
};

/*
var store = new JobStore();
var job = new Job();
store.register(job).then(function () {;
    job.emit('bulletin', {
        type: 'ERR',
        message: 'This is a major error!!!!',
    });
});
*/

module.exports = JobStore;
