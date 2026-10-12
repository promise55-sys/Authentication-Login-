'use strict';

const path = require('node:path');
require('../lib/load-env').loadEnvFile(path.join(__dirname, '..', '.env'));
const { handleApi } = require('../lib/handler');

module.exports = async function api(request, response) {
	await handleApi(request, response);
};

