"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, _req, res) {
    const status = err.statusCode ?? 500;
    const payload = process.env.NODE_ENV === 'production'
        ? { error: err.message ?? 'Internal error' }
        : { error: err.message, stack: err.stack };
    console.error('[ERROR]', err);
    res.status(status).json(payload);
}
