/*
 * This is a socket for NetsBlox that wraps a standard WebSocket
 */
'use strict';
var counter = 0,
    CONSTANTS = require(__dirname + '/../../common/Constants'),
    PROJECT_FIELDS = ['ProjectName', 'SourceCode', 'Media', 'SourceSize', 'MediaSize', 'RoomUuid'],
    R = require('ramda'),
    parseXml = require('xml2js').parseString;

var createSaveableProject = function(json, callback) {
    var project = R.pick(PROJECT_FIELDS, json);
    // Set defaults
    project.Public = false;
    project.Updated = new Date();

    // Add the thumbnail,notes from the project content
    var inProjectSource = ['Thumbnail', 'Notes'];

    parseXml(project.SourceCode, (err, jsonSrc) => {
        if (err) {
            return callback(err);
        }
        inProjectSource.forEach(field => {
            project[field] = jsonSrc[field.toLowerCase()];
        });
        callback(null, project);
    });
};

class NetsBloxSocket {
    constructor (logger, socket) {
        var id = ++counter;
        this.id = id;
        this.uuid = '_client_'+id;
        this._logger = logger.fork(this.uuid);

        this.roleId = null;
        this._room = null;
        this.loggedIn = false;

        this.username = this.uuid;
        this._socket = socket;
        this._projectRequests = {};  // saving
        this._initialize();

        // Provide a uuid
        this.send({type: 'uuid', body: this.uuid});
        this._logger.trace('created');
    }


    hasRoom () {
        if (!this._room) {
            this._logger.error('user has no room!');
        }
        return !!this._room;
    }

    isOwner () {
        return this._room && this._room.owner.username === this.username;
    }

    _initialize () {
        this._socket.on('message', data => {
            var msg = JSON.parse(data),
                type = msg.type;

            this._logger.trace(`received "${type === 'project-response' ? type : data}" message`);
            if (NetsBloxSocket.MessageHandlers[type]) {
                NetsBloxSocket.MessageHandlers[type].call(this, msg);
            } else {
                this._logger.warn('message "' + data + '" not recognized');
            }
        });

        this._socket.on('close', () => {
            this._logger.trace('closed!');
            if (this._room) {
                this.leave();
            }
            this.onClose(this.uuid);
        });
    }

    onLogin (username) {
        this._logger.log('logged in as ' + username);
        this.username = username;
        this.loggedIn = true;

        // Update the user's room name
        if (this._room) {
            this._room.update();
            if (this._room.roles[this.roleId] === this) {
                this._room.updateRole(this.roleId);
            }
        }
    }

    join (room, role) {
        role = role || this.roleId;
        this._logger.log(`joining ${room.uuid}/${role} from ${this.roleId}`);
        if (this._room === room && role !== this.roleId) {
            return this.changeSeats(role);
        }

        this._logger.log(`joining ${room.uuid}/${role} from ${this.roleId}`);
        if (this._room && this._room.uuid !== room.uuid) {
            this.leave();
        }

        this._room = room;
        this._room.add(this, role);
        this.roleId = role;
    }

    // This should only be called internally *EXCEPT* when the socket is going to close
    leave () {
        this._room.roles[this.roleId] = null;

        if (this.isOwner() && this._room.ownerCount() === 0) {  // last owner socket closing
            this._room.close();
        } else {
            this._room.onRolesChanged();
            this.checkRoom(this._room);
        }
    }

    changeSeats (role) {
        this._logger.log(`changing to role ${this._room.uuid}/${role} from ${this.roleId}`);
        this._room.move({socket: this, dst: role});
    }

    sendToEveryone (msg) {
        this._room.sendFrom(this, msg);
    }

    send (msg) {
        msg = JSON.stringify(msg);
        this._logger.trace(`Sending message to ${this.uuid} "${msg}"`);
        if (this._socket.readyState === this.OPEN) {
            this._socket.send(msg);
        } else {
            this._logger.log('could not send msg - socket no longer open');
        }
    }

    getState () {
        return this._socket.readyState;
    }

    isVirtualUser () {
        return this.username === CONSTANTS.GHOST.USER;
    }

    getProjectJson (callback) {
        var id = ++counter;
        this.send({
            type: 'project-request',
            id: id
        });
        this._projectRequests[id] = callback;
    }
}

// From the WebSocket spec
NetsBloxSocket.prototype.CONNECTING = 0;
NetsBloxSocket.prototype.OPEN = 1;
NetsBloxSocket.prototype.CLOSING = 2;
NetsBloxSocket.prototype.CLOSED = 3;

NetsBloxSocket.MessageHandlers = {
    'message': function(msg) {
        this.sendToEveryone(msg);
    },

    'project-response': function(msg) {
        var id = msg.id,
            json = msg.project;

        createSaveableProject(json, (err, project) => {
            if (err) {
                return this._projectRequests[id].call(null, err);
            }
            this._logger.log('created saveable project for request ' + id);
            this._projectRequests[id].call(null, null, project);
            delete this._projectRequests[id];
        });
    },

    'rename-room': function(msg) {
        if (this.isOwner()) {
            this._room.update(msg.name);
        }
    },

    'rename-role': function(msg) {
        var socket;
        if (this.isOwner() && msg.roleId !== msg.name) {
            this._room.renameRole(msg.roleId, msg.name);

            socket = this._room.roles[msg.name];
            if (socket) {
                socket.send(msg);
            }
        }
    },

    'request-room-state': function() {
        if (this.hasRoom()) {
            var msg = this._room.getStateMsg();
            this.send(msg);
        }
    },

    'create-room': function(msg) {
        var room = this.createRoom(this, msg.room);
        room.createRole(msg.role);
        this.join(room, msg.role);
    },

    'join-room': function(msg) {
        var owner = msg.owner,
            name = msg.room,
            role = msg.role;

        this.getRoom(owner, name, (room) => {
            if (!room) {
                this._logger.error(`Could not join room ${name}`);
                return;
            }
            // create the role if need be (and if we are the owner)
            if (!room.roles.hasOwnProperty(role) && room.owner === this) {
                this._logger.info(`creating role ${role} at ${room.uuid}`);
                room.createRole(role);
            }
            return this.join(room, role);
        });
        
    },

    'add-role': function(msg) {
        // TODO: make sure this is the room owner
        if (this.hasRoom()) {
            this._room.createRole(msg.name);
        }
    }
};

module.exports = NetsBloxSocket;