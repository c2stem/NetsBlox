describe('jsdoc-extractor', () => {

    const assert = require('assert'),
        utils = require('../../../assets/utils.js'),
        jp = utils.reqSrc('rpc/jsdoc-extractor.js');


    let comment = `
    /**
     * this is the description
     * next line of description
     * @param {String} address target address
     * @param {Number} limit the results limit
     * @param {Object} options
     * @name doStuff
     * @returns {String}
     * @name associatedFnName
     */
    `;

    describe('fnFinder', () => {
        let testText = `let doStuff = a => a*2;
    function doStuff(){}
    GoogleMap.doStuff = function
    GoogleMap.doStuff = (asdf) =>`;
        let testLines = testText.split('\n');

        it('should support multiline', () => {
            assert.deepEqual(jp._findFn(testLines[2]), 'doStuff');
        });

        it('should find let fn = ()', () => {
            let line = 'let reverseGeocode = (lat, lon, response, query)=>{';
            assert.deepEqual(jp._findFn(line), 'reverseGeocode');
        });

        it('should find let fn = arg => ', () => {
            let line = 'let reverseGeocode = arg=>{';
            assert.deepEqual(jp._findFn(line), 'reverseGeocode');
        });

        it('should find obj.obj = function', () => {
            let line = '    GeoLocationRPC.geolocate = function (address) {';
            assert.deepEqual(jp._findFn(line), 'geolocate');
        });

        it('should know prototype is not the fn name', () => {
            let line = 'Googlemap.prototype.doStuff = function';
            assert.deepEqual(jp._findFn(line), 'doStuff');
        });
    });


    describe('parsing', () => {

        let metadata = jp._parseSource(comment).rpcs[0];

        it('should parse jsdoc comments', () => {
            assert.deepEqual(metadata.parsed.tags[1].name, 'limit');
        }); 

        it('should simplify the metadata', () => {
            let simpleMetadata = jp._simplify(metadata.parsed);
            assert.deepEqual(simpleMetadata, {
                name: 'doStuff',
                description: metadata.parsed.description,
                deprecated: false,
                args: [
                    {
                        name: 'address',
                        optional: false,
                        type: {
                            name: 'String',
                            params: []
                        },
                        description: 'target address'
                    },
                    {
                        name: 'limit',
                        optional: false,
                        type: {
                            name: 'Number',
                            params: []
                        },
                        description: 'the results limit'
                    },
                    {
                        name: 'options',
                        optional: false,
                        type: {
                            name: 'Object',
                            params: []
                        },
                        description: null
                    }
                ],
                returns: {type: {name: 'String', params: []}, description: null}
            });
        });

        it('should detect deprecated methods', () => {
            const oldComment = `
            /**
             * this is the description
             * next line of description
             * @deprecated
             * @param {Number} limit the results limit
             * @name doStuff
             */
            `;
            let metadata = jp._parseSource(oldComment).rpcs[0];
            let simpleMetadata = jp._simplify(metadata.parsed);
            assert(simpleMetadata.deprecated);
        });

        describe('parameterized types', function() {
            let parsed = null;
            before(function() {
                const parameterized = `
                /**
                 * this is the description
                 * @param {BoundedNumber<10, 20>} number number (between 10-20)
                 * @param {BoundedNumber<-10, 20>} negnumber number (between -10,20)
                 * @param {BoundedNumber<10.334, 20>} decnumber number (between 10.334,20)
                 * @param {BoundedNumber<String, 20>} mixed
                 * @name doSomething
                 */
                `;
                const metadata = jp._parseSource(parameterized).rpcs[0];
                parsed = jp._simplify(metadata.parsed);
            });

            it('should parse name', () => {
                const argType = parsed.args[0].type;
                assert.equal(argType.name, 'BoundedNumber');
            });

            it('should parse parameters', () => {
                const argType = parsed.args[0].type;
                assert.deepEqual(argType.params, [10, 20]);
            });

            it('should parse negative numbers for params', () => {
                const argType = parsed.args[1].type;
                assert.deepEqual(argType.params, [-10, 20]);
            });

            it('should parse decimal params', () => {
                const argType = parsed.args[2].type;
                assert.deepEqual(argType.params, [10.334, 20]);
            });
        });

    });

    describe('Docs', () => {

        describe('getDocFor', () => {
            it('should return a copy', () => {
                let Docs = jp.Docs;
                let sampleDocs = {rpcs: [{name: 'rpcName', description: 'original description'}]};
                let targetDoc = Docs.prototype.getDocFor.call(sampleDocs, 'rpcName');
                targetDoc.description = 'mutated description';
                let secondGet = Docs.prototype.getDocFor.call(sampleDocs, 'rpcName');
                assert.deepEqual(secondGet.description, 'original description');
            });
        });
    });

});
