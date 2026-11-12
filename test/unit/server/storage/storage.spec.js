const utils = require('../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const Storage = utils.reqSrc('storage/storage');
    const assert = require('assert');

    describe('mongoURI', function() {
        [
            ['localhost', 'admin'],
            ['mongodb://localhost/', 'admin'],
            ['127.0.0.1:2031/dbName', 'dbName'],
            ['127.0.0.1:2031/', 'admin'],
            ['someURL-mongo.org:2031/dbName', 'dbName'],
            ['someURL-mongo.org:2031/dbName-', 'dbName-'],
            ['mongodb://user:p%40ss@10.0.0.5:27017/c2stem-editor?authSource=admin', 'c2stem-editor'],
            ['mongodb://user:pass@10.0.0.5:27017/', 'admin'],
            ['mongodb://user:pass@10.0.0.5:27017', 'admin'],
            ['mongodb://h1:27017,h2:27017/db?replicaSet=rs0', 'db'],
            ['mongodb+srv://user:pass@cluster0.example.net/c2stem-editor?retryWrites=true', 'c2stem-editor'],
        ].forEach(pair => {
            const [uri, db] = pair;
            it(`should correctly parse db name from ${uri}`, () => {
                assert.equal(Storage.getDatabaseFromURI(uri), db);
            });
        });
    });
});
