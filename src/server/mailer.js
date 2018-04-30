var nodemailer = require('nodemailer'),
    markdown = require('nodemailer-markdown').markdown,
    transporter = nodemailer.createTransport();

transporter.use('compile', markdown());

const getSenderDomain = function(host) {
    return host.replace(/^\./, '');  // remove leading '.'
};

const domain = getSenderDomain(process.env.HOST || 'netsblox.org');
module.exports = {
    sendMail: function(opts) {
        opts.from = opts.from || 'no-reply';
        if (!opts.from.includes('@')) {  // add domain
            opts.from += '@' + domain;
        }
        return transporter.sendMail(opts);
    },
    getSenderDomain: getSenderDomain  // for testing
};
