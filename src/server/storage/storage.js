'use strict';
var MongoClient = require('mongodb').MongoClient,
    Users = require('./users'),
    Q = require('q'),
    Projects = require('./projects'),
    Groups = require('./groups'),
    UserActions = require('./user-actions'),
    Messages = require('./messages');

const ServicesStorage = require('../services/storage');
const OAuthStorage = require('./oauth');
const Libraries = require('./libraries');
const ProjectActions = require('./project-actions');
const Logger = require('../logger');

var Storage = function() {
    this._logger = new Logger('netsblox:storage');
    this.users = null;
    this.projects = null;
    this._deferred = Q.defer();
    this.onConnected = this._deferred.promise;
};

Storage.prototype.getDatabaseFromURI = function(mongoURI) {
    // Supports credentials, host lists, mongodb+srv and query strings, e.g.
    // mongodb://user:pass@10.0.0.5:27017/c2stem-editor?authSource=admin
    const withoutScheme = mongoURI.replace(/^mongodb(\+srv)?:\/\//, '');
    const slash = withoutScheme.indexOf('/');
    if (slash === -1) return 'admin';
    const dbName = withoutScheme.slice(slash + 1).split('?')[0];
    return decodeURIComponent(dbName) || 'admin';
};

// hide credentials when logging the connection string
Storage.prototype.redactURI = function(mongoURI) {
    return mongoURI.replace(/\/\/[^@/]*@/, '//***@');
};

Storage.prototype.connect = function(mongoURI) {
    mongoURI = mongoURI || process.env.MONGO_URI || process.env.MONGOLAB_URI || 'mongodb://localhost:27017';
    const dbName = this.getDatabaseFromURI(mongoURI);
    const options = {
        useUnifiedTopology: true,
        poolSize: +process.env.MONGO_POOL_SIZE || 50,
    };
    return Q(MongoClient.connect(mongoURI, options))
        .then(client => {
            const db = client.db(dbName);
            this.users = Users;
            this.projects = Projects;
            Users.init(this._logger, db);
            Projects.init(this._logger, db);
            Groups.init(this._logger, db);
            UserActions.init(this._logger, db);
            Messages.init(this._logger, db);
            ProjectActions.init(this._logger, db);
            Libraries.init(this._logger, db);
            ServicesStorage.init(this._logger, db);
            OAuthStorage.init(this._logger, db);

            this._db = db;
            this._client = client;
            this._logger.info(`Connected to ${this.redactURI(mongoURI)}`);
            this._deferred.resolve();
            return db;
        })
        .catch(err => {
            /* eslint-disable no-console */
            console.error(`Could not connect to mongodb at ${this.redactURI(mongoURI)}.`);
            console.error('To connect to a different mongo instance, set MONGO_URI to the mongo uri and try again:');
            console.error('');
            console.error('    MONGO_URI=mongodb://some.ip.address:27017/ netsblox start');
            console.error('');
            console.error('or, if running from the root of the netsblox project:');
            console.error('');
            console.error('    MONGO_URI=mongodb://some.ip.address:27017/ ./bin/netsblox start');
            console.error('');
            /* eslint-enable no-console */
            this._deferred.reject(err);
            throw err;
        });
};

Storage.prototype.disconnect = function() {
    return this._client.close(true);
};

module.exports = new Storage();
