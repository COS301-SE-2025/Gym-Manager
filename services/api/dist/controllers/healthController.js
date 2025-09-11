"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = void 0;
const client_1 = require("../db/client");
const drizzle_orm_1 = require("drizzle-orm");
const STARTED_AT = Number(process.env.APP_STARTED_AT ?? Date.now());
const healthCheck = async (_req, res) => {
    const uptimeSec = Math.round((Date.now() - STARTED_AT) / 1000);
    const memBytes = process.memoryUsage().rss;
    const ping = Promise.race([
        client_1.db.execute((0, drizzle_orm_1.sql) `SELECT 1`),
        // 10 second timeout
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000)),
    ]);
    try {
        await ping;
        return res.json({
            ok: true,
            uptime: uptimeSec,
            memory: memBytes,
            version: process.env.npm_package_version,
            db: 'UP',
        });
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('Health-check DB ping failed:', errorMessage);
        return res.status(503).json({
            ok: false,
            uptime: uptimeSec,
            db: 'DOWN',
            error: errorMessage,
        });
    }
};
exports.healthCheck = healthCheck;
