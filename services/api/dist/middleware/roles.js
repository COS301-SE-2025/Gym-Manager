"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roles = void 0;
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const roles = (allowed) => {
    return async (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ error: 'UNAUTHORIZED' });
        let userRoles = req.user.roles;
        if (!userRoles || userRoles.length === 0) {
            const rows = await client_1.db
                .select({ role: schema_1.userroles.userRole })
                .from(schema_1.userroles)
                .where((0, drizzle_orm_1.eq)(schema_1.userroles.userId, req.user.userId));
            userRoles = rows.map(r => String(r.role));
            req.user.roles = userRoles;
        }
        if (!allowed.some(r => userRoles?.includes(r))) {
            return res.status(403).json({ error: 'FORBIDDEN' });
        }
        next();
    };
};
exports.roles = roles;
