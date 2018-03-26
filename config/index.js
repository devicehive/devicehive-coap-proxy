const configurator = require('json-evn-configurator');

module.exports = {
    proxy: configurator(require('./config'), 'PROXY')
};