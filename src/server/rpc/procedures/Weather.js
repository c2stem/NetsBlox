// This is a static rpc collection. That is, it does not maintain state and is 
// shared across groups
'use strict';

var debug = require('debug'),
    log = debug('NetsBlox:RPCManager:StaticMap:log'),
    trace = debug('NetsBlox:RPCManager:StaticMap:trace'),
    path = require('path'),
    tuc = require('temp-units-conv'),
    request = require('request');

var baseUrl = 'http://api.openweathermap.org/data/2.5/weather',
    baseIconUrl = 'http://openweathermap.org/img/w/';

module.exports = {

    // This is very important => Otherwise it will try to instantiate this
    isStateless: true,

    // These next two functions are the same from the stateful RPC's
    getPath: function() {
        return '/weather';
    },

    getActions: function() {
        return ['temp',
                'humidity',
                'icon',
                'description'];
    },

    temp: function(req, res) {
        var url = baseUrl + '?lat=' + req.query.lat + '&lon=' + req.query.lng;
        trace('Request for ' + req.query.lat + ', ' + req.query.lng);
        request(url, function(err, response, body) {
            if (err) {
                log('ERROR: ',body);
                return res.status(500).send('ERROR: '+err);
            }
            body = JSON.parse(body);
            var temp = '?';
            if (body.main) {
                temp = body.main.temp;
                trace('Kelvin temp is '+temp+' fahrenheit is '+tuc.k2f(temp));
                temp = Math.round(tuc.k2f(temp)*100, 2)/100;  // Round to 2 spots
            }
            return res.json(temp);
        });
    },

    humidity: function(req, res) {
        var url = baseUrl + '?lat=' + req.query.lat + '&lon=' + req.query.lng;
        request(url, function(err, response, body) {
            if (err) {
                return res.status(500).send('ERROR: '+err);
            }
            body = JSON.parse(body);
            var humidity = body.main.humidity;
            return res.json(humidity);
        });
    },

    description: function(req, res) {
        var url = baseUrl + '?lat=' + req.query.lat + '&lon=' + req.query.lng;
        request(url, function(err, response, body) {
            if (err) {
                return res.status(500).send('ERROR: '+err);
            }
            body = JSON.parse(body);
            var description = body.weather[0].description;
            return res.json(description);
        });
    },

    icon: function(req, res) {
        var url = baseUrl + '?lat=' + req.query.lat + '&lon=' + req.query.lng;
        request(url, function(err, response, body) {
            if (err) {
                return res.status(500).send('ERROR: '+err);
            }
            body = JSON.parse(body);
            // Return sunny if unknown
            var iconName = '01d.png';
            if (body.weather && body.weather[0]) {
                iconName = body.weather[0].icon+'.png';
            }
            request.get(baseIconUrl+iconName).pipe(res);
        });
    }
};
