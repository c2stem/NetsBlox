const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const assert = require('assert');
    const crypto = require('crypto');
    const BlobStorage = require('../../../../../src/server/storage/blob/blob');
    const legacy = require('../../../../../src/common/sha512').hex_sha512;

    // Blob ids must not change: existing blob files are named by these hashes.
    const samples = [
        '',
        'hello world',
        '<project name="é ü ß 中文 😀">x</project>',
        'data:image/png;base64,' + crypto.randomBytes(3000).toString('base64'),
        '<snapdata>' + 'ä€𝄞'.repeat(500) + '</snapdata>',
    ];

    samples.forEach((s, i) => {
        it(`should match the legacy JS sha512 (sample ${i})`, () => {
            assert.equal(BlobStorage.hash(s), legacy(s));
        });
    });

    it('should hash an 8MB project quickly', () => {
        const big = '<project>' + crypto.randomBytes(6e6).toString('base64');
        const start = Date.now();
        BlobStorage.hash(big);
        assert(Date.now() - start < 500, 'native hash should take well under 500ms');
    });
});
