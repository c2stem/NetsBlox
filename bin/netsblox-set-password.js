#!/usr/bin/env node
/* eslint-disable no-console*/

require('epipebomb')();  // Allow piping to 'head'

const Storage = require('../src/server/storage/storage'),
    Logger = require('../src/server/logger'),
    Users = require('../src/server/storage/users'),
    logger = new Logger('netsblox:cli:add-user'),
    storage = new Storage(logger),
    Command = require('commander').Command,
    program = new Command();

program.arguments('<name> <password>');
program.option('<name> <password>');
program.parse(process.argv);

if (program.args.length !== 2) {
    console.log('usage: netsblox set-password <name> <password>');
    process.exit(1);
}

const [username, password] = program.args;
storage.connect()
    .then(() => Users.get(username))
    .then(user => {
        if (!user) throw `user not found`;

        console.log('setting password to', password);
        return user.setPassword(password);
    })
    .then(() => console.log('user updated!'))
    .then(() => storage.disconnect())
    .catch(err => {
        console.error(err);
        return storage.disconnect();
    });
/* eslint-enable no-console*/
