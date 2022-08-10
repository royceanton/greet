const express = require('express');
const { isValidSignature, dispatchWebhook } = require('../webhooks');
const router = express.Router();

const sleep = async (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const handlers = {
    'trade.started': async (tradeHash, paxfulApi, config) => {
        await sleep(config.messageDelay);

        await paxfulApi.sendMessage(tradeHash, config.messageText);
    }
}

// No problem keeping to have it in-memory. Even if process is restarted we can easily rebuild it
const tradeToOfferMap = {};
router.post('/paxful/webhook', async (req, res) => {
    res.set("X-Paxful-Request-Challenge", req.headers['x-paxful-request-challenge'])

    const isValidationRequest = req.body.type === undefined;
    if (isValidationRequest) {
        console.debug("Validation request arrived");

        res.json({"status": "ok"});
        return
    }

    const signature = req.get('x-paxful-signature');
    if (!signature) {
        console.warn("No signature");

        res.json({"status": "error", "message": "No signature header"});
        res.status(403);
        return;
    }

    if (!isValidSignature(signature, req.get('host'), req.originalUrl, req.rawBody)) {
        console.warn("Invalid signature");

        res.json({"status": "error", "message": "Invalid signature"});
        res.status(403);
        return;
    }

    console.debug("\n---------------------")
    console.debug("New incoming webhook:")
    console.debug(req.body)
    console.debug("---------------------")

    try {
        await dispatchWebhook(tradeToOfferMap, handlers, req);
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

module.exports = router;