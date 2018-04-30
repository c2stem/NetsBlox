describe('RPC Input Types', function() {
    const typesParser = require('../../../../src/server/rpc/input-types').parse,
        assert = require('assert');

    describe('parsing', () => {
        it('should parse structured data to json', () => {
            let rawInput = [['a', 234],['name', 'Hamid'], ['connections', ['b','c','d']], ['children']];
            let parsedInput = typesParser['Object'](rawInput);
            assert.deepEqual(parsedInput.name, 'Hamid');
        });

        it('should parse numbers', () => {
            let rawInput = '4.253';
            let parsedInput = typesParser['Number'](rawInput);
            assert.deepEqual(parsedInput, 4.253);
        });
    });

    describe('validation', () => {

        describe('Array', function() {
            it('should throw error w/ numeric input', () => {
                let rawInput = '181',
                    type = 'Array';

                assert.throws(() => typesParser[type](rawInput));
            });

            it('should throw error w/ string input', () => {
                let rawInput = 'cat',
                    type = 'Array';

                assert.throws(() => typesParser[type](rawInput));
            });
        });

        describe('Structured Data', function() {
            it('should throw error if input has a pair of size 0', () => {
                let rawInput = [[], ['a', 234],['name', 'Hamid'], ['connections', ['b','c','d']]];
                let type = 'Object';
                assert.throws(() => typesParser[type](rawInput), /It should be a list of/);
            });

            it('should throw error if input has a pair of length more than 2', () => {
                let rawInput = [['a', 234],['name', 'Hamid', 'Z'], ['connections', ['b','c','d']]];
                let type = 'Object';
                assert.throws(() => typesParser[type](rawInput), /It should be a list of/);
            });

            it('should not throw if input has a pair of length 1', () => {
                let rawInput = [['a', 234],['name', 'Hamid'], ['connections', ['b','c','d']], ['children']];
                let type = 'Object';
                assert(typesParser[type](rawInput));
            });
        });

        describe('Latitude', function() {
            const type = 'Latitude';

            it('should throw on latitudes less than -90', () => {
                let rawInput = '-91';
                assert.throws(() => typesParser[type](rawInput), /Latitude/);
            });

            it('should throw on latitudes more than 90', () => {
                let rawInput = '91';
                assert.throws(() => typesParser[type](rawInput), /Latitude/);
            });

        });

        describe('Longitude', function() {
            const type = 'Longitude';

            it('should throw on longitude less than -180', () => {
                let rawInput = '-181';
                assert.throws(() => typesParser[type](rawInput), /Longitude/);
            });

            it('should throw on longitude more than 180', () => {
                let rawInput = '181';
                assert.throws(() => typesParser[type](rawInput), /Longitude/);
            });

        });

        describe('BoundedNumber', function() {
            const type = 'BoundedNumber';

            it('should include minimum value', () => {
                let rawInput = '10';
                typesParser[type](rawInput, 10, 180);
            });

            it('should not throw if within range', () => {
                let rawInput = '-151';
                typesParser[type](rawInput, -180, 180);
            });

            it('should return Number (not string)', () => {
                const input = '10';
                const value = typesParser[type](input, 0, 21);
                assert.equal(typeof value, 'number');
            });

            it('should throw if less than min', () => {
                let rawInput = '-181';
                assert.throws(() => typesParser[type](rawInput, -180, 180), /-180/);
            });

            it('should throw if more than max', () => {
                let rawInput = '181';
                assert.throws(() => typesParser[type](rawInput, '-180', '180'), /180/);
            });
        });

    });

});
