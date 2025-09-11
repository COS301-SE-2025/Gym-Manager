"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatus = exports.login = exports.register = void 0;
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const auth_1 = require("../middleware/auth");
const drizzle_orm_1 = require("drizzle-orm");
const notificationEmitter_1 = require("../events/notificationEmitter");
const register = async (req, res) => {
    const { firstName, lastName, email, phone, password, roles = ['member'] } = req.body;
    // check existing email
    const existingUser = await client_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email)).limit(1);
    if (existingUser.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
    }
    // create user
    const passwordHash = await (0, auth_1.hashPassword)(password);
    const [newUser] = await client_1.db
        .insert(schema_1.users)
        .values({
        firstName,
        lastName,
        email,
        phone,
        passwordHash,
    })
        .returning();
    // assign roles
    const roleEntries = roles.map((role) => ({
        userId: newUser.userId,
        userRole: role,
    }));
    await client_1.db.insert(schema_1.userroles).values(roleEntries);
    if (roles.includes('member')) {
        await client_1.db.insert(schema_1.members).values({
            userId: newUser.userId,
            status: 'pending', // default status
            creditsBalance: 0, // default balance
        });
        notificationEmitter_1.notificationEmitter.emit('user:signup', newUser);
    }
    if (roles.includes('coach')) {
        await client_1.db.insert(schema_1.coaches).values({
            userId: newUser.userId,
            bio: '', // default bio
        });
    }
    if (roles.includes('manager')) {
        await client_1.db.insert(schema_1.managers).values({
            userId: newUser.userId, // default empty permissions
        });
    }
    if (roles.includes('admin')) {
        await client_1.db.insert(schema_1.admins).values({
            userId: newUser.userId, // default empty permissions
        });
    }
    const token = (0, auth_1.generateJwt)({ userId: newUser.userId, roles });
    res.json({ token });
};
exports.register = register;
const login = async (req, res) => {
    const { email, password } = req.body;
    const [user] = await client_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email)).limit(1);
    if (!user)
        return res.status(401).json({ error: 'Invalid credentials' });
    const passwordValid = await (0, auth_1.verifyPassword)(password, user.passwordHash);
    if (!passwordValid)
        return res.status(401).json({ error: 'Invalid credentials' });
    // get roles
    const userRoles = await client_1.db.select().from(schema_1.userroles).where((0, drizzle_orm_1.eq)(schema_1.userroles.userId, user.userId));
    const roles = userRoles.map((r) => r.userRole);
    const token = (0, auth_1.generateJwt)({ userId: user.userId, roles });
    res.json({
        token: token,
        user: {
            id: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            roles: roles,
        },
    });
};
exports.login = login;
const getStatus = async (req, res) => {
    if (!req.user)
        return res.status(401).json({ error: 'Unauthorized' });
    const userId = req.user.userId;
    const roleRows = await client_1.db
        .select({ role: schema_1.userroles.userRole })
        .from(schema_1.userroles)
        .where((0, drizzle_orm_1.eq)(schema_1.userroles.userId, userId));
    const roles = roleRows.map(r => r.role);
    let membershipStatus;
    if (roles.includes('member')) {
        const [member] = await client_1.db
            .select({ status: schema_1.members.status })
            .from(schema_1.members)
            .where((0, drizzle_orm_1.eq)(schema_1.members.userId, userId))
            .limit(1);
        membershipStatus = member ? member.status : 'pending';
    }
    else {
        membershipStatus = 'visitor';
    }
    return res.json({ userId, roles, membershipStatus });
};
exports.getStatus = getStatus;
