"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editSettings = exports.getUserSettings = void 0;
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
// GET /user/settings
const getUserSettings = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.userId;
    try {
        const [member] = await client_1.db
            .select({ publicVisibility: schema_1.members.publicVisibility })
            .from(schema_1.members)
            .where((0, drizzle_orm_1.eq)(schema_1.members.userId, userId))
            .limit(1);
        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }
        return res.json({
            success: true,
            settings: {
                publicVisibility: member.publicVisibility,
            },
        });
    }
    catch (err) {
        console.error('getUserSettings error:', err);
        return res.status(500).json({ error: 'Failed to fetch user settings' });
    }
};
exports.getUserSettings = getUserSettings;
// POST /user/settings/visibility
const editSettings = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.userId;
    const { publicVisibility } = req.body;
    // Validate inputs
    if (typeof publicVisibility !== 'boolean') {
        return res.status(400).json({ error: "'publicVisibility' must be a boolean" });
    }
    try {
        const [updated] = await client_1.db
            .update(schema_1.members)
            .set({ publicVisibility })
            .where((0, drizzle_orm_1.eq)(schema_1.members.userId, userId))
            .returning({ userId: schema_1.members.userId });
        if (!updated) {
            return res.status(404).json({ error: 'Member not found' });
        }
        return res.json({ success: true, userId, publicVisibility });
    }
    catch (err) {
        console.error('editSettings error:', err);
        return res.status(500).json({ error: 'Failed to update visibility setting' });
    }
};
exports.editSettings = editSettings;
