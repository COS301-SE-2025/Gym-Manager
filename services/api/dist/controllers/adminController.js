"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeUserPassword = exports.getAllAdmins = exports.getAllCoaches = exports.updateUserById = exports.getUserById = exports.getRolesByUserId = exports.removeManagerRole = exports.removeAdminRole = exports.removeMemberRole = exports.removeCoachRole = exports.getAllUsers = exports.getUsersByRole = exports.getAllMembers = exports.assignUserToRole = exports.assignCoach = exports.createClass = exports.getWeeklySchedule = exports.createWeeklySchedule = void 0;
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middleware/auth");
const date_fns_1 = require("date-fns");
const date_fns_2 = require("date-fns");
const dayToOffset = {
    Monday: 0,
    Tuesday: 1,
    Wednesday: 2,
    Thursday: 3,
    Friday: 4,
    Saturday: 5,
    Sunday: 6,
};
const createWeeklySchedule = async (req, res) => {
    try {
        const { startDate, createdBy, weeklySchedule } = req.body;
        const baseDate = (0, date_fns_2.parseISO)(startDate);
        const insertedClasses = [];
        for (const dayBlock of weeklySchedule) {
            const offset = dayToOffset[dayBlock.day];
            if (offset === undefined)
                continue;
            const scheduledDate = addDays(baseDate, offset);
            for (const cls of dayBlock.classes) {
                const newClass = {
                    scheduledDate: (0, date_fns_1.format)(scheduledDate, 'yyyy-MM-dd'),
                    scheduledTime: cls.time,
                    durationMinutes: cls.durationMinutes,
                    capacity: cls.capacity,
                    coachId: cls.coachId,
                    workoutId: cls.workoutId,
                    createdBy,
                };
                const [inserted] = await client_1.db.insert(schema_1.classes).values(newClass).returning();
                insertedClasses.push(inserted);
            }
        }
        res.status(201).json({ success: true, insertedClasses });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create weekly schedule' });
    }
};
exports.createWeeklySchedule = createWeeklySchedule;
const getWeeklySchedule = async (req, res) => {
    try {
        const today = new Date();
        // Define Monday–Sunday range
        const weekStart = (0, date_fns_1.format)(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const weekEnd = (0, date_fns_1.format)(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const results = await client_1.db
            .select({
            classId: schema_1.classes.classId,
            scheduledDate: schema_1.classes.scheduledDate,
            scheduledTime: schema_1.classes.scheduledTime,
            durationMinutes: schema_1.classes.durationMinutes,
            capacity: schema_1.classes.capacity,
            workoutName: schema_1.workouts.workoutName,
            coachName: schema_1.users.firstName,
        })
            .from(schema_1.classes)
            .leftJoin(schema_1.workouts, (0, drizzle_orm_1.eq)(schema_1.classes.workoutId, schema_1.workouts.workoutId))
            .leftJoin(schema_1.coaches, (0, drizzle_orm_1.eq)(schema_1.classes.coachId, schema_1.coaches.userId))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.coaches.userId, schema_1.users.userId))
            .where((0, drizzle_orm_1.between)(schema_1.classes.scheduledDate, weekStart, weekEnd))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.classes.scheduledDate), (0, drizzle_orm_1.asc)(schema_1.classes.scheduledTime));
        // Group by date
        const grouped = results.reduce((acc, cls) => {
            const day = cls.scheduledDate;
            if (!acc[day])
                acc[day] = [];
            acc[day].push(cls);
            return acc;
        }, {});
        res.json(grouped);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch weekly schedule' });
    }
};
exports.getWeeklySchedule = getWeeklySchedule;
const createClass = async (req, res) => {
    const { capacity, scheduledDate, scheduledTime, durationMinutes, coachId, workoutId, createdBy } = req.body;
    const [created] = await client_1.db
        .insert(schema_1.classes)
        .values({
        capacity,
        scheduledDate,
        scheduledTime,
        durationMinutes,
        coachId,
        workoutId,
        createdBy,
    })
        .returning();
    res.json(created);
};
exports.createClass = createClass;
const assignCoach = async (req, res) => {
    const { classId, coachId } = req.body;
    if (!classId || !coachId) {
        return res.status(400).json({ error: 'classId and coachId are required' });
    }
    console.log('Assigning coach:', coachId, 'to class:', classId);
    const [coach] = await client_1.db.select().from(schema_1.coaches).where((0, drizzle_orm_1.eq)(schema_1.coaches.userId, coachId));
    if (!coach) {
        console.error('Coach not found for ID:', coachId);
        return res.status(400).json({ error: 'Invalid coach' });
    }
    await client_1.db.update(schema_1.classes).set({ coachId }).where((0, drizzle_orm_1.eq)(schema_1.classes.classId, classId));
    res.json({ success: true });
};
exports.assignCoach = assignCoach;
//Assign users to roles
// POST /roles/assign
const assignUserToRole = async (req, res) => {
    const { userId, role } = req.body;
    if (!userId || !role) {
        return res.status(400).json({ error: 'Missing userId or role' });
    }
    const roleExists = await client_1.db
        .select()
        .from(schema_1.userroles)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userroles.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userroles.userRole, role)));
    if (roleExists.length > 0) {
        return res.status(409).json({ error: 'User already has this role' });
    }
    await client_1.db.insert(schema_1.userroles).values({ userId, userRole: role });
    // Optionally insert into specialized table
    switch (role) {
        case 'coach':
            await client_1.db.insert(schema_1.coaches).values({ userId });
            break;
        case 'member':
            await client_1.db.insert(schema_1.members).values({ userId });
            break;
        case 'admin':
            await client_1.db.insert(schema_1.admins).values({ userId });
            break;
        case 'manager':
            await client_1.db.insert(schema_1.managers).values({ userId });
            break;
    }
    res.json({ success: true });
};
exports.assignUserToRole = assignUserToRole;
// GET /users/members
const getAllMembers = async (req, res) => {
    const result = await client_1.db
        .select({
        userId: schema_1.users.userId,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
        email: schema_1.users.email,
        phone: schema_1.users.phone,
        status: schema_1.members.status,
        credits: schema_1.members.creditsBalance,
    })
        .from(schema_1.users)
        .innerJoin(schema_1.members, (0, drizzle_orm_1.eq)(schema_1.users.userId, schema_1.members.userId));
    res.json(result);
};
exports.getAllMembers = getAllMembers;
// GET /roles/getUsersByRole/
const getUsersByRole = async (req, res) => {
    const role = req.params.role;
    const allowedRoles = ['coach', 'member', 'admin', 'manager'];
    if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }
    if (role === 'member') {
        return (0, exports.getAllMembers)(req, res);
    }
    if (role === 'coach') {
        return (0, exports.getAllCoaches)(req, res);
    }
    if (role === 'admin') {
        return (0, exports.getAllAdmins)(req, res);
    }
};
exports.getUsersByRole = getUsersByRole;
// GET /users/allUsers
const getAllUsers = async (req, res) => {
    try {
        const result = await client_1.db
            .select({
            userId: schema_1.users.userId,
            firstName: schema_1.users.firstName,
            lastName: schema_1.users.lastName,
            email: schema_1.users.email,
            phone: schema_1.users.phone,
            role: schema_1.userroles.userRole,
            bio: schema_1.coaches.bio,
            authorisation: schema_1.admins.authorisation,
            status: schema_1.members.status,
            creditsBalance: schema_1.members.creditsBalance,
        })
            .from(schema_1.users)
            .leftJoin(schema_1.userroles, (0, drizzle_orm_1.eq)(schema_1.users.userId, schema_1.userroles.userId)) // Join role first to match field order
            .leftJoin(schema_1.coaches, (0, drizzle_orm_1.eq)(schema_1.users.userId, schema_1.coaches.userId))
            .leftJoin(schema_1.admins, (0, drizzle_orm_1.eq)(schema_1.users.userId, schema_1.admins.userId))
            .leftJoin(schema_1.members, (0, drizzle_orm_1.eq)(schema_1.users.userId, schema_1.members.userId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.users.lastName), (0, drizzle_orm_1.asc)(schema_1.users.firstName));
        res.json(result);
    }
    catch (err) {
        console.error('Failed to get all users:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};
exports.getAllUsers = getAllUsers;
// POST /users/removeCoachRole
const removeCoachRole = async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }
    await client_1.db.delete(schema_1.coaches).where((0, drizzle_orm_1.eq)(schema_1.coaches.userId, userId));
    await client_1.db
        .delete(schema_1.userroles)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userroles.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userroles.userRole, 'coach')));
    res.json({ success: true });
};
exports.removeCoachRole = removeCoachRole;
// POST /users/removeMemberRole
const removeMemberRole = async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }
    await client_1.db.delete(schema_1.members).where((0, drizzle_orm_1.eq)(schema_1.members.userId, userId));
    await client_1.db
        .delete(schema_1.userroles)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userroles.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userroles.userRole, 'member')));
    res.json({ success: true });
};
exports.removeMemberRole = removeMemberRole;
// POST /users/removeAdminRole
const removeAdminRole = async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }
    await client_1.db.delete(schema_1.admins).where((0, drizzle_orm_1.eq)(schema_1.admins.userId, userId));
    await client_1.db
        .delete(schema_1.userroles)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userroles.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userroles.userRole, 'admin')));
    res.json({ success: true });
};
exports.removeAdminRole = removeAdminRole;
// POST /users/removeManagerRole
const removeManagerRole = async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }
    await client_1.db.delete(schema_1.managers).where((0, drizzle_orm_1.eq)(schema_1.managers.userId, userId));
    await client_1.db
        .delete(schema_1.userroles)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userroles.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userroles.userRole, 'manager')));
    res.json({ success: true });
};
exports.removeManagerRole = removeManagerRole;
function addDays(baseDate, offset) {
    const result = new Date(baseDate);
    result.setDate(result.getDate() + offset);
    return result;
}
function startOfWeek(date, options) {
    const day = date.getDay();
    const diff = (day < options.weekStartsOn ? 7 : 0) + day - options.weekStartsOn;
    const start = new Date(date);
    start.setDate(date.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
}
function endOfWeek(date, options) {
    const start = startOfWeek(date, options);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
}
//Get roles by userId
const getRolesByUserId = async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid userId' });
    }
    const roles = await client_1.db
        .select({ role: schema_1.userroles.userRole })
        .from(schema_1.userroles)
        .where((0, drizzle_orm_1.eq)(schema_1.userroles.userId, userId));
    if (roles.length === 0) {
        return res.status(404).json({ error: 'No roles found for this user' });
    }
    res.json(roles.map((r) => r.role));
};
exports.getRolesByUserId = getRolesByUserId;
//Get user by userId
const getUserById = async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid userId' });
    }
    try {
        const result = await client_1.db
            .select({
            userId: schema_1.users.userId,
            firstName: schema_1.users.firstName,
            lastName: schema_1.users.lastName,
            email: schema_1.users.email,
            phone: schema_1.users.phone,
            roles: schema_1.userroles.userRole,
            bio: schema_1.coaches.bio,
            status: schema_1.members.status,
            creditsBalance: schema_1.members.creditsBalance,
            authorisation: schema_1.admins.authorisation,
        })
            .from(schema_1.users)
            .leftJoin(schema_1.userroles, (0, drizzle_orm_1.eq)(schema_1.users.userId, schema_1.userroles.userId))
            .leftJoin(schema_1.coaches, (0, drizzle_orm_1.eq)(schema_1.users.userId, schema_1.coaches.userId))
            .leftJoin(schema_1.members, (0, drizzle_orm_1.eq)(schema_1.users.userId, schema_1.members.userId))
            .leftJoin(schema_1.admins, (0, drizzle_orm_1.eq)(schema_1.users.userId, schema_1.admins.userId))
            .where((0, drizzle_orm_1.eq)(schema_1.users.userId, userId));
        if (result.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Consolidate roles and details
        const base = {
            userId: result[0].userId,
            firstName: result[0].firstName,
            lastName: result[0].lastName,
            email: result[0].email,
            phone: result[0].phone,
            roles: result.map((r) => r.roles).filter(Boolean),
        };
        for (const row of result) {
            if (row.roles === 'coach') {
                Object.assign(base, { bio: row.bio });
            }
            else if (row.roles === 'member') {
                Object.assign(base, {
                    status: row.status,
                    creditsBalance: row.creditsBalance,
                });
            }
            else if (row.roles === 'admin') {
                Object.assign(base, { authorisation: row.authorisation });
            }
        }
        return res.json(base);
    }
    catch (err) {
        console.error('Error fetching user by ID:', err);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};
exports.getUserById = getUserById;
//EDIT USER DETAILS 
const updateUserById = async (req, res) => {
    const { userId } = req.params;
    const updates = req.body;
    try {
        // Step 1: Get user role
        const [userRoleRow] = await client_1.db
            .select({ role: schema_1.userroles.userRole })
            .from(schema_1.userroles)
            .where((0, drizzle_orm_1.eq)(schema_1.userroles.userId, Number(userId)));
        if (!userRoleRow) {
            return res.status(404).json({ error: 'User role not found' });
        }
        const role = userRoleRow.role;
        // Step 2: Update shared user fields
        const userFieldsToUpdate = {
            firstName: updates.firstName,
            lastName: updates.lastName,
            email: updates.email,
            phone: updates.phone,
        };
        const filteredUserFields = Object.fromEntries(Object.entries(userFieldsToUpdate).filter(([_, value]) => value !== undefined));
        if (Object.keys(filteredUserFields).length > 0) {
            await client_1.db
                .update(schema_1.users)
                .set(filteredUserFields)
                .where((0, drizzle_orm_1.eq)(schema_1.users.userId, Number(userId)));
        }
        // Step 3: Role-specific updates
        if (role === 'coach') {
            const coachFields = {
                bio: updates.bio,
            };
            const filteredCoachFields = Object.fromEntries(Object.entries(coachFields).filter(([_, value]) => value !== undefined));
            if (Object.keys(filteredCoachFields).length > 0) {
                await client_1.db
                    .update(schema_1.coaches)
                    .set(filteredCoachFields)
                    .where((0, drizzle_orm_1.eq)(schema_1.coaches.userId, Number(userId)));
            }
        }
        if (role === 'admin') {
            const adminFields = {
                authorisation: updates.authorisation,
            };
            const filteredAdminFields = Object.fromEntries(Object.entries(adminFields).filter(([_, value]) => value !== undefined));
            if (Object.keys(filteredAdminFields).length > 0) {
                await client_1.db
                    .update(schema_1.admins)
                    .set(filteredAdminFields)
                    .where((0, drizzle_orm_1.eq)(schema_1.admins.userId, Number(userId)));
            }
        }
        if (role === 'member') {
            const memberFields = {
                status: updates.status,
                creditsBalance: updates.creditsBalance,
            };
            const filteredMemberFields = Object.fromEntries(Object.entries(memberFields).filter(([_, value]) => value !== undefined));
            if (Object.keys(filteredMemberFields).length > 0) {
                await client_1.db
                    .update(schema_1.members)
                    .set(filteredMemberFields)
                    .where((0, drizzle_orm_1.eq)(schema_1.members.userId, Number(userId)));
            }
        }
        res.status(200).json({ message: 'User updated successfully' });
    }
    catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
};
exports.updateUserById = updateUserById;
const getAllCoaches = async (req, res) => {
    return client_1.db
        .select({
        userId: schema_1.users.userId,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
        email: schema_1.users.email,
        phone: schema_1.users.phone,
        bio: schema_1.coaches.bio,
    })
        .from(schema_1.users)
        .innerJoin(schema_1.coaches, (0, drizzle_orm_1.eq)(schema_1.users.userId, schema_1.coaches.userId))
        .then((result) => res.json(result))
        .catch((err) => {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch coaches' });
    });
};
exports.getAllCoaches = getAllCoaches;
const getAllAdmins = async (req, res) => {
    return client_1.db
        .select({
        userId: schema_1.users.userId,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
        email: schema_1.users.email,
        phone: schema_1.users.phone,
        role: schema_1.userroles.userRole, // must come after the join!
        authorisation: schema_1.admins.authorisation,
    })
        .from(schema_1.users)
        .innerJoin(schema_1.admins, (0, drizzle_orm_1.eq)(schema_1.users.userId, schema_1.admins.userId))
        .innerJoin(schema_1.userroles, (0, drizzle_orm_1.eq)(schema_1.users.userId, schema_1.userroles.userId)) // <- REQUIRED
        .then((result) => res.json(result))
        .catch((err) => {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch admins' });
    });
};
exports.getAllAdmins = getAllAdmins;
// PATCH /users/:userId/password
const changeUserPassword = async (req, res) => {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;
    const requestingUserId = req.user?.userId;
    const requesterRole = req.user?.roles;
    //console.log(`Requesting user ID: ${requestingUserId}, Role: ${requesterRole}`);
    if (!newPassword) {
        return res.status(400).json({ error: 'New password is required' });
    }
    try {
        // Step 1: Fetch target user by ID
        const [user] = await client_1.db
            .select({ userId: schema_1.users.userId, password: schema_1.users.passwordHash })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.userId, Number(userId)));
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isSelf = Number(requestingUserId) === Number(userId);
        const isAdmin = Array.isArray(requesterRole)
            ? requesterRole.includes('admin')
            : requesterRole === 'admin' || requesterRole?.includes('admin');
        //console.log(`isSelf: ${isSelf}, isAdmin: ${isAdmin}`);
        // Step 2: Require current password if not admin
        if (!isAdmin && isSelf) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Current password is required' });
            }
            const isValid = await (0, auth_1.verifyPassword)(currentPassword, user.password);
            if (!isValid) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
        }
        // Step 3: Only admin or self can change
        if (!isAdmin && !isSelf) {
            return res.status(403).json({ error: 'You are not authorized to change this password' });
        }
        // Step 4: Hash and update new password
        const hashedNewPassword = await (0, auth_1.hashPassword)(newPassword);
        await client_1.db
            .update(schema_1.users)
            .set({ passwordHash: hashedNewPassword })
            .where((0, drizzle_orm_1.eq)(schema_1.users.userId, Number(userId)));
        // Step 5: Log password change
        console.log(`Password changed for user ID ${userId} by user ID ${requestingUserId} at ${new Date().toISOString()}`);
        return res.status(200).json({ message: 'Password updated successfully' });
    }
    catch (err) {
        console.error('Error changing password:', err);
        return res.status(500).json({ error: 'Failed to update password' });
    }
};
exports.changeUserPassword = changeUserPassword;
