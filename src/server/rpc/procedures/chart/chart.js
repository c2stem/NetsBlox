/**
 * Charting service powered by Gnuplot
 *
 * @service
 */

const ApiConsumer = require('../utils/api-consumer'),
    rpcUtils = require('../utils'),
    gnuPlot = require('./node-gnuplot.js'),
    _ = require('lodash');

let chart = new ApiConsumer('chart');

const defaults = {
    title: undefined,
    labels: [],
    types: [],
    xRange: [],
    yRange: [],
    xLabel: undefined,
    yLabel: undefined,
    xTicks: undefined,
    isCategorical: false,
    smooth: false,
    grid: 'line',
    isTimeSeries: false,
    timeInputFormat: '%s',
    timeDisplayFormat: '%H:%M'
};

// calculates data stats
// TODO refactor so it process one axis (one array) at a time. con: lose some performance
function calcRanges(lines, isCategorical){
    let stats = {
        y: {
            min: Number.MAX_VALUE, max: -1 * Number.MAX_VALUE
        }
    };
    if (!isCategorical){
        stats.x = {
            min: Number.MAX_VALUE, max: -1 * Number.MAX_VALUE
        }; 
    }
    lines.forEach(line => {

        if (!isCategorical){
            // min max of x
            let xs = line.map(pt => pt[0]);
            let xmin = Math.min.apply(null, xs);
            let xmax = Math.max.apply(null, xs);
            if( xmin < stats.x.min ) stats.x.min = xmin;
            if( xmax > stats.x.max ) stats.x.max = xmax;
        }

        // min max of y
        let ys = line.map(pt => pt[1]);
        let ymin = Math.min.apply(null, ys);
        let ymax = Math.max.apply(null, ys);
        if( ymin < stats.y.min ) stats.y.min = ymin;
        if( ymax > stats.y.max ) stats.y.max = ymax;
    });
    Object.keys(stats).forEach( key => {
        stats[key].range = stats[key].max - stats[key].min;
    });
    return stats;
}

function prepareData(input, options) {
    // if the input is one line convert it to appropriate format
    const xShouldBeNumeric = !options.isCategorical && !options.isTimeSeries;

    if (! Array.isArray(input[0][0])){
        chart._logger.trace('one line input detected');
        input = [input];
    }
    input = input.map( line => {
        if (!Array.isArray(line)) {
            chart._logger.warn('input is not an array!', line);
            throw 'chart input is not an array';
        }
        line.map(pt => {
            let [x,y] = pt;
            if (!Array.isArray(pt)) {
                chart._logger.warn('input is not an array!', pt);
                throw 'all input points should be in [x,y] form';
            }
            if (xShouldBeNumeric) pt[0] = parseFloat(pt[0]);
            pt[1] = parseFloat(pt[1]);

            if ((xShouldBeNumeric && isNaN(x)) || isNaN(y) ) {
                let invalidValue = (xShouldBeNumeric && isNaN(x)) ? x : y;
                invalidValue = truncate(invalidValue.toString(), 7);
                throw `all [x,y] pairs should be numbers: ${invalidValue}`;
            }
            return pt;
        });
        return line;
    });
    return input;
}

function truncate(word, len) {
    if (word.length > len) {
        return word.substring(0, len) + '...';
    }
    return word;
}


// generate gnuplot friendly line objects
function genGnuData(lines, lineTitles, lineTypes, smoothing){
    return lines.map((pts, idx) => {
        let lineObj = {points: pts};
        if (lineTypes) lineObj.type = lineTypes[idx];
        if (lineTitles) lineObj.title = lineTitles[idx];
        if (smoothing) lineObj.smoothing = 'csplines';
        return lineObj;
    });
}

/**
 * Create charts and histograms from data
 *
 * @param {Array} lines a single line or list of lines. Each line should be in form of [[x1,y1], [x2,y2]]
 * @param {Object=} options Configuration for graph title, axes, and more
 */
chart.draw = function(lines, options){
    // process the options
    Object.keys(options).forEach(key => {
        if (options[key] === 'null' || options[key] === ''){
            delete options[key];
        }
        if (options[key] === 'true') options[key] = true;
        if (options[key] === 'false') options[key] = false;
    });
    options = _.merge({}, defaults, options || {});

    // prepare and check for errors in data
    try {
        lines = prepareData(lines, options);
    } catch (e) {
        this._logger.error(e);
        this.response.status(500).send(e);
        return null;
    }
    let stats = calcRanges(lines, options.isCategorical);
    this._logger.info('data stats:', stats);
    const relativePadding = {
        y: stats.y.range !== 0 ? stats.y.range * 0.05 : 1
    };

    //TODO auto set to boxes if categorical? 

    let opts = {title: options.title, xLabel: options.xLabel, yLabel: options.yLabel, isCategorical: options.isCategorical};
    opts.yRange = {min: stats.y.min - relativePadding.y, max: stats.y.max + relativePadding.y};
    if (options.yRange.length === 2) opts.yRange = {min: options.yRange[0], max: options.yRange[1]};

    if (!options.isCategorical){
        relativePadding.x = stats.x.range !== 0 ? stats.x.range * 0.05 : 1;
        opts.xRange = {min: stats.x.min - relativePadding.x, max: stats.x.max + relativePadding.x};
        if (options.xRange.length === 2) opts.xRange = {min: options.xRange[0], max: options.xRange[1]};
    }

    if (options.isTimeSeries) {
        opts.timeSeries = {
            axis: 'x',
            inputFormat: options.timeInputFormat,
            outputFormat: options.timeDisplayFormat
        };
    }
    // setup grid
    if (options.grid === 'line'){
        opts.grid = {
            lineType: 1,
            lineWidth: 1
        };
    }else if (options.grid === 'dot'){
        opts.grid = {
            lineType: 0,
            lineWidth: 2
        };
    }
    
    // if a specific number of ticks are requested
    if (options.xTicks) {
        if (options.isCategorical) throw 'can\'t change the number of xTicks in categorical charting';
        let tickStep = (stats.x.max - stats.x.min)/options.xTicks;
        opts.xTicks = [stats.x.min, tickStep, stats.x.max];
    }
    
    let data = genGnuData(lines, options.labels, options.types, options.smooth);
    this._logger.trace('charting with options', opts);
    try {
        var chartStream =  gnuPlot.draw(data, opts);
    } catch (e) {
        this.response.status(500).send('error in drawing the plot. bad input.');
        return null;
    }

    return rpcUtils.collectStream(chartStream).then( buffer => {
        rpcUtils.sendImageBuffer(this.response, buffer, this._logger);
    }).catch(this._logger.error);
};

chart.drawLineChart = function(dataset, xAxisTag, yAxisTag, datasetTag, title){
    let lines = [];

    // testMultipleDataset credit to Dung
    let isMultipleDataset = rawArray => {
        let numLayers = (rawArray) => {
            if (typeof rawArray !== 'object') {
                return 0;
            }
            return numLayers(rawArray[0]) + 1;
        };

        return numLayers(rawArray) === 4;
    };

    if (!isMultipleDataset(dataset)){
        this._logger.trace('single line input detected');
        dataset = [dataset];
    }

    dataset.forEach(line => {
        line = line
            .map(pt => {
                let newPt = [];
                newPt.push(pt[0][1]);
                newPt.push(pt[1][1]);
                return newPt;
            })
            .sort((p1, p2) => parseFloat(p1[0]) < parseFloat(p2[0]) ? -1 : 1);
        lines.push(line);
    });

    // account for list or string datasettag
    if (!Array.isArray(datasetTag)){
        datasetTag = [datasetTag];
    }

    let opts = {
        xLabel: xAxisTag,
        yLabel: yAxisTag,
        title: title,
        isCategorical: true,
        smooth: true,
        labels: datasetTag
    };

    return chart.draw.call(this, lines, _.toPairs(opts));
};

chart.drawBarChart = function(dataset, xAxisTag, yAxisTag, datasetTag, title){
    return chart.drawLineChart.apply(this, arguments);
};

chart.defaultOptions = function(){
    return rpcUtils.jsonToSnapList(defaults);
};

chart.COMPATIBILITY = {
    deprecatedMethods: ['drawBarChart', 'drawLineChart']
};

module.exports = chart;
