"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestTimeout = void 0;
const requestTimeout = (ms = 10000) => (req, res, next) => {
    if (res.headersSent)
        return next();
    const timer = setTimeout(() => {
        if (res.headersSent)
            return;
        res.status(503).json({ error: 'TIMEOUT' });
        console.warn(`[TIMEOUT] ${req.method} ${req.originalUrl}`);
    }, ms);
    res.on('finish', () => clearTimeout(timer));
    next();
};
exports.requestTimeout = requestTimeout;
