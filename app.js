const express = require('express');
const { createPaxfulApi } = require('./src/api');
const { getConfig } = require('./src/config');
const webhooks = require('./src/webhooks');

const config = getConfig();
const paxfulApi = createPaxfulApi(config.clientId, config.clientSecret);

const app = express();
app.use(async (req, res, next) => {
    req.context = {
        services: {
            paxfulApi: paxfulApi
        },
        config: config
    };

    next();
});
// Savings original raw body, needed for Paxful webhook signature checking
app.use(function(req, res, next) {
    req.rawBody = '';

    req.on('data', function(chunk) {
        req.rawBody += chunk;
    });

    next();
});
app.use(express.json());
app.use('/', require('./src/routes'));
app.listen(config.serverPort, async () => {
    console.debug(`App listening at http://localhost:${config.serverPort}`);
});