/**
 * The Traffic Service provides access to real-time traffic data using the Bing Traffic API.
 * For more information, check out https://msdn.microsoft.com/en-us/library/hh441725.aspx
 * @service
 */

'use strict';

const logger = require('../utils/logger')('traffic');
const API_KEY = process.env.BING_TRAFFIC_KEY;
const request = require('request');
const baseUrl = 'http://dev.virtualearth.net/REST/v1/Traffic/Incidents/';
let pendingEventsFor = {};

// Helper function to send the messages to the client
var sendNext = function(socket) {
    const events = pendingEventsFor[socket.uuid] || [];
    let event = events.shift();  // retrieve the first message

    while (events.length && event.roleId !== socket.roleId) {
        event = events.shift();
    }

    // check the roleId
    if (event && event.roleId === socket.roleId) {
        socket.sendMessage('Traffic', event.data);
    }

    if (events.length) {
        setTimeout(sendNext, 250, socket);
    } else {
        delete pendingEventsFor[socket.uuid];
    }
};

if (!process.env.BING_TRAFFIC_KEY) {
    logger.trace('Env variable BING_TRAFFIC_KEY is not set thus the traffic service is disabled.');
}else{
    module.exports = {

        search: function(westLongitude, northLatitude, eastLongitude, southLatitude) {

            // for bounding box
            var response = this.response,
                socket = this.socket,
                url = baseUrl + southLatitude + ',' + westLongitude + ',' + northLatitude +
                    ',' + eastLongitude + '?key=' + API_KEY;

            logger.trace(`Requesting traffic accidents in ${westLongitude},${northLatitude},${eastLongitude},${southLatitude}`);
            request(url, (err, res, body) => {

                if (err) {
                    logger.trace('Error:' + err);
                    return response.send('Could not access 3rd party API');
                }

                try {
                    body = JSON.parse(body);
                } catch(e) {
                    logger.trace('Non-JSON data...');
                    return response.send('Bad API Result: ' + body);
                }

                if (body.statusCode == 400) {
                    logger.trace('Invalid parameters...');
                    return response.send('The area is too big! Try zooming in more.');
                }

                var type = ['Accident', 'Congestion', 'Disabled Vehicle', 'Mass Transit', 'Miscellaneous',
                    'Other', 'Planned Event', 'Road Hazard', 'Construction', 'Alert', 'Weather'];

                // build the list of traffic incidents
                if (body.resourceSets[0].estimatedTotal != 0) {
                    const results = body.resourceSets[0].resources.map(resource => {
                        return {
                            roleId: this.caller.roleId,
                            data: {
                                latitude: resource.point.coordinates[0],
                                longitude: resource.point.coordinates[1],
                                type: type[resource.type-1]
                            }
                        };
                    });

                    pendingEventsFor[this.caller.clientId] = results;
                }
                sendNext(socket);
                response.sendStatus(200);
            });
            return null;
        },

        stop: function() {
            delete pendingEventsFor[this.socket.uuid];
            return 'stopped';
        },
        COMPATIBILITY: {
            search: {
                southLatitude: 'southLat',
                northLatitude: 'northLat',
                eastLongitude: 'eastLng',
                westLongitude: 'westLng'
            }
        }
    };
}
