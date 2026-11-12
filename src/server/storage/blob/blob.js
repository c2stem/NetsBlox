// Note: This file should only be required by 'index.js' (from the same dir).
// This will ensure that there is only a single connection and blob backend used.
//
// The only exception (and reason for not defining this class in index.js) is for
// utility scripts such as blob migrations.

// Public API:
//   - store(data): Promise<id>
//   - get(hash): Promise<data>

// Native SHA-512 that produces exactly the same ids as the legacy pure-JS
// hex_sha512 (src/common/sha512.js), which UTF-8 encodes the string twice
// (str2rstr_utf8 followed by CryptoJS Utf8.parse). Matching that keeps every
// existing blob id valid. The JS version blocked the event loop ~2.3s per 8MB.
const crypto = require('crypto');
const hash = data => crypto.createHash('sha512')
    .update(Buffer.from(Buffer.from(data, 'utf8').toString('latin1'), 'utf8'))
    .digest('hex');

// Backends
const S3Backend = require('./s3');
const FSBackend = require('./fs');

class BlobStorage {

    constructor(logger, backendType) {
        this.logger = logger;
        if (backendType === 's3') {
            this.backend = new S3Backend(logger);
        } else {
            backendType = 'fs';
            this.backend = new FSBackend(logger);
        }
        this.backendType = backendType;
    }

    get(id) {
        this.logger.trace(`Retrieving ${id}`);
        return this.backend.get(id);
    }

    async store(data) {
        const id = hash(data);
        await this.backend.store(id, data);
        return id;
    }

    // List all ids (for migrations)
    list() {
        return this.backend.list();
    }
}

BlobStorage.hash = hash;  // exposed for tests
module.exports = BlobStorage;
