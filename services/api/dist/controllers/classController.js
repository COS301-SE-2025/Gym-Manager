"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelBooking = exports.checkInToClass = exports.bookClass = exports.getMemberClasses = exports.getAllClasses = exports.createWorkout = exports.assignWorkoutToClass = exports.getCoachClassesWithWorkouts = exports.getCoachAssignedClasses = void 0;
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const getCoachAssignedClasses = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const coachId = req.user.userId;
    const assignedClasses = await client_1.db
        .select({
        classId: schema_1.classes.classId,
        scheduledDate: schema_1.classes.scheduledDate,
        scheduledTime: schema_1.classes.scheduledTime,
        capacity: schema_1.classes.capacity,
        workoutId: schema_1.classes.workoutId,
        coachId: schema_1.classes.coachId,
        workoutName: schema_1.workouts.workoutName,
    })
        .from(schema_1.classes)
        .leftJoin(schema_1.workouts, (0, drizzle_orm_1.eq)(schema_1.classes.workoutId, schema_1.workouts.workoutId))
        .where((0, drizzle_orm_1.eq)(schema_1.classes.coachId, coachId));
    res.json(assignedClasses);
};
exports.getCoachAssignedClasses = getCoachAssignedClasses;
const getCoachClassesWithWorkouts = async (req, res) => {
    if (!req.user) {
        console.log('Unauthorized access attempt');
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const coachId = req.user.userId;
    const classWithWorkouts = await client_1.db
        .select({
        classId: schema_1.classes.classId,
        scheduledDate: schema_1.classes.scheduledDate,
        scheduledTime: schema_1.classes.scheduledTime,
        workoutName: schema_1.workouts.workoutName,
        // workoutContent: workouts.workoutContent,
    })
        .from(schema_1.classes)
        .leftJoin(schema_1.workouts, (0, drizzle_orm_1.eq)(schema_1.classes.workoutId, schema_1.workouts.workoutId))
        .where((0, drizzle_orm_1.eq)(schema_1.classes.coachId, coachId));
    res.json(classWithWorkouts);
};
exports.getCoachClassesWithWorkouts = getCoachClassesWithWorkouts;
const assignWorkoutToClass = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const coachId = req.user.userId;
    const { classId, workoutId } = req.body;
    // check class belongs to coach
    const [cls] = await client_1.db
        .select()
        .from(schema_1.classes)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classes.classId, classId), (0, drizzle_orm_1.eq)(schema_1.classes.coachId, coachId)));
    if (!cls)
        return res.status(403).json({ error: 'Unauthorized or class not found' });
    await client_1.db.update(schema_1.classes).set({ workoutId }).where((0, drizzle_orm_1.eq)(schema_1.classes.classId, classId));
    res.json({ success: true });
};
exports.assignWorkoutToClass = assignWorkoutToClass;
const WORKOUT_TYPES = ['FOR_TIME', 'AMRAP', 'TABATA', 'EMOM'];
const QUANTITY_TYPES = ['reps', 'duration'];
const createWorkout = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { workoutName, type, metadata, rounds: roundsInput, } = req.body;
    // ----- BASIC VALIDATION -----
    if (!workoutName || !workoutName.trim()) {
        return res.status(400).json({ error: 'workoutName is required' });
    }
    if (!type || !WORKOUT_TYPES.includes(type)) {
        return res
            .status(400)
            .json({ error: `type must be one of ${WORKOUT_TYPES.join(', ')}` });
    }
    if (typeof metadata !== 'object' || metadata === null) {
        return res.status(400).json({ error: 'metadata must be an object' });
    }
    if (!Array.isArray(roundsInput) || roundsInput.length === 0) {
        return res.status(400).json({ error: 'rounds must be a non-empty array' });
    }
    for (const r of roundsInput) {
        if (typeof r.roundNumber !== 'number' || !Array.isArray(r.subrounds)) {
            return res
                .status(400)
                .json({ error: 'each round needs roundNumber & subrounds[]' });
        }
        for (const sr of r.subrounds) {
            if (typeof sr.subroundNumber !== 'number' ||
                !Array.isArray(sr.exercises) ||
                sr.exercises.length === 0) {
                return res
                    .status(400)
                    .json({
                    error: 'each subround needs subroundNumber & a non-empty exercises[]',
                });
            }
            for (const ex of sr.exercises) {
                if ((ex.exerciseId == null && !ex.exerciseName) ||
                    (ex.exerciseId != null && ex.exerciseName)) {
                    return res
                        .status(400)
                        .json({
                        error: 'each exercise must have exactly one of exerciseId or exerciseName',
                    });
                }
                if (typeof ex.position !== 'number' ||
                    !QUANTITY_TYPES.includes(ex.quantityType) ||
                    typeof ex.quantity !== 'number') {
                    return res
                        .status(400)
                        .json({
                        error: 'exercise entries need position:number, quantityType:(reps|duration), quantity:number',
                    });
                }
            }
        }
    }
    try {
        const newWorkoutId = await client_1.db.transaction(async (tx) => {
            // 1) Insert workout
            const [created] = await tx
                .insert(schema_1.workouts)
                .values({
                workoutName: workoutName.trim(),
                type: type,
                metadata,
            })
                .returning({ workoutId: schema_1.workouts.workoutId });
            const workoutId = created.workoutId;
            // 2) Gather all requested IDs & names
            const wantedIds = new Set();
            const wantedNames = new Set();
            for (const r of roundsInput) {
                for (const sr of r.subrounds) {
                    for (const ex of sr.exercises) {
                        if (ex.exerciseId != null)
                            wantedIds.add(ex.exerciseId);
                        else
                            wantedNames.add(ex.exerciseName);
                    }
                }
            }
            // 3) Verify existing IDs
            if (wantedIds.size > 0) {
                const existingIdRows = await tx
                    .select({ id: schema_1.exercises.exerciseId })
                    .from(schema_1.exercises)
                    .where((0, drizzle_orm_1.inArray)(schema_1.exercises.exerciseId, [...wantedIds]));
                const existingIds = new Set(existingIdRows.map((r) => r.id));
                const missingIds = [...wantedIds].filter((id) => !existingIds.has(id));
                if (missingIds.length) {
                    throw new Error(`These exerciseIds do not exist: ${missingIds.join(', ')}`);
                }
            }
            // 4) Resolve names → IDs (upsert missing names)
            // 4a) Fetch any that already exist by name
            const existingByNameRows = await tx
                .select({ id: schema_1.exercises.exerciseId, name: schema_1.exercises.name })
                .from(schema_1.exercises)
                .where((0, drizzle_orm_1.inArray)(schema_1.exercises.name, [...wantedNames]));
            const nameToId = new Map();
            existingByNameRows.forEach((r) => nameToId.set(r.name, r.id));
            // 4b) Insert the truly new names
            for (const name of wantedNames) {
                if (!nameToId.has(name)) {
                    const [ins] = await tx
                        .insert(schema_1.exercises)
                        .values({ name, description: null })
                        .returning({ id: schema_1.exercises.exerciseId });
                    nameToId.set(name, ins.id);
                }
            }
            // 5) Now insert rounds, subrounds & subroundExercises
            for (const r of roundsInput) {
                const [roundRec] = await tx
                    .insert(schema_1.rounds)
                    .values({ workoutId, roundNumber: r.roundNumber })
                    .returning({ roundId: schema_1.rounds.roundId });
                const roundId = roundRec.roundId;
                for (const sr of r.subrounds) {
                    const [subRec] = await tx
                        .insert(schema_1.subrounds)
                        .values({
                        roundId,
                        subroundNumber: sr.subroundNumber,
                    })
                        .returning({ subroundId: schema_1.subrounds.subroundId });
                    const subroundId = subRec.subroundId;
                    for (const ex of sr.exercises) {
                        // decide final exerciseId
                        const exId = ex.exerciseId != null
                            ? ex.exerciseId
                            : nameToId.get(ex.exerciseName);
                        await tx.insert(schema_1.subroundExercises).values({
                            subroundId,
                            exerciseId: exId,
                            position: ex.position,
                            quantityType: ex.quantityType,
                            quantity: ex.quantity,
                            notes: ex.notes ?? null,
                        });
                    }
                }
            }
            return workoutId;
        });
        return res.json({
            success: true,
            workoutId: newWorkoutId,
            message: 'Workout created with rounds, subrounds & exercises.',
        });
    }
    catch (err) {
        console.error('createWorkout error:', err);
        return res.status(400).json({ error: err.message || 'Insert failed' });
    }
};
exports.createWorkout = createWorkout;
const getAllClasses = async (req, res) => {
    if (!req.user)
        return res.status(401).json({ error: 'Unauthorized' });
    const userId = req.user.userId;
    const rolesRows = await client_1.db
        .select({ role: schema_1.userroles.userRole })
        .from(schema_1.userroles)
        .where((0, drizzle_orm_1.eq)(schema_1.userroles.userId, userId));
    if (rolesRows.length === 0)
        return res.status(403).json({ error: 'Unauthorized' });
    const roles = rolesRows.map((r) => r.role);
    const now = new Date();
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const time = now.toTimeString().slice(0, 8); // HH:MM:SS
    const notPast = (0, drizzle_orm_1.or)((0, drizzle_orm_1.gt)(schema_1.classes.scheduledDate, today), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classes.scheduledDate, today), (0, drizzle_orm_1.gte)(schema_1.classes.scheduledTime, time)));
    // -- members can see everything upcoming; coaches ignored for now -------------
    if (!roles.includes('member')) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const classesList = await client_1.db
        .select({
        classId: schema_1.classes.classId,
        scheduledDate: schema_1.classes.scheduledDate,
        scheduledTime: schema_1.classes.scheduledTime,
        capacity: schema_1.classes.capacity,
        coachId: schema_1.classes.coachId,
        workoutId: schema_1.classes.workoutId,
        workoutName: schema_1.workouts.workoutName,
    })
        .from(schema_1.classes)
        .leftJoin(schema_1.workouts, (0, drizzle_orm_1.eq)(schema_1.classes.workoutId, schema_1.workouts.workoutId))
        .where(notPast); // ← filter out old ones
    res.json(classesList);
};
exports.getAllClasses = getAllClasses;
const getMemberClasses = async (req, res) => {
    if (!req.user)
        return res.status(401).json({ error: 'Unauthorized' });
    const memberId = req.user.userId;
    // same not-in-the-past helper
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8);
    const notPast = (0, drizzle_orm_1.or)((0, drizzle_orm_1.gt)(schema_1.classes.scheduledDate, today), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classes.scheduledDate, today), (0, drizzle_orm_1.gte)((0, drizzle_orm_1.sql) `${schema_1.classes.scheduledTime}::time + (classes.duration_minutes || ' minutes')::interval`, time)));
    const bookedClasses = await client_1.db
        .select({
        bookingId: schema_1.classbookings.bookingId,
        classId: schema_1.classes.classId,
        scheduledDate: schema_1.classes.scheduledDate,
        scheduledTime: schema_1.classes.scheduledTime,
        workoutName: schema_1.workouts.workoutName,
    })
        .from(schema_1.classbookings)
        .innerJoin(schema_1.classes, (0, drizzle_orm_1.eq)(schema_1.classbookings.classId, schema_1.classes.classId))
        .leftJoin(schema_1.workouts, (0, drizzle_orm_1.eq)(schema_1.classes.workoutId, schema_1.workouts.workoutId))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classbookings.memberId, memberId), notPast));
    res.json(bookedClasses);
};
exports.getMemberClasses = getMemberClasses;
const bookClass = async (req, res) => {
    if (!req.user)
        return res.status(401).json({ error: 'Unauthorized' });
    const memberId = req.user.userId;
    const classId = Number(req.body.classId);
    if (!Number.isInteger(classId) || classId <= 0)
        return res.status(400).json({ error: 'Invalid class ID' });
    try {
        await client_1.db.transaction(async (tx) => {
            const [cls] = await tx
                .select({
                capacity: schema_1.classes.capacity,
                scheduledDate: schema_1.classes.scheduledDate,
                scheduledTime: schema_1.classes.scheduledTime,
                duration: schema_1.classes.durationMinutes,
            })
                .from(schema_1.classes)
                .where((0, drizzle_orm_1.eq)(schema_1.classes.classId, classId))
                .for('update') // row lock
                .limit(1);
            if (!cls)
                throw { code: 404, msg: 'Class not found' };
            // 2. Reject past classes
            const now = new Date();
            const classEnd = new Date(`${cls.scheduledDate}T${cls.scheduledTime}`);
            classEnd.setMinutes(classEnd.getMinutes() + cls.duration);
            if (now >= classEnd)
                throw { code: 400, msg: 'Class has already ended' };
            // 3. Already booked?
            const dup = await tx
                .select()
                .from(schema_1.classbookings)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classbookings.classId, classId), (0, drizzle_orm_1.eq)(schema_1.classbookings.memberId, memberId)))
                .limit(1);
            if (dup.length)
                throw { code: 400, msg: 'Already booked' };
            // 4. Seats left?
            const [{ count }] = await tx
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.classbookings)
                .where((0, drizzle_orm_1.eq)(schema_1.classbookings.classId, classId));
            if (count >= cls.capacity)
                throw { code: 400, msg: 'Class full' };
            // 5. Insert booking
            await tx.insert(schema_1.classbookings).values({ classId, memberId });
        });
        res.json({ success: true });
    }
    catch (err) {
        if (err?.code)
            return res.status(err.code).json({ error: err.msg });
        console.error(err);
        res.status(500).json({ error: 'Internal error' });
    }
};
exports.bookClass = bookClass;
const checkInToClass = async (req, res) => {
    const { classId, memberId } = req.body;
    if (!classId || !memberId) {
        return res.status(400).json({ error: 'classId and memberId are required' });
    }
    try {
        // Insert attendance
        const [attendance] = await client_1.db
            .insert(schema_1.classattendance)
            .values({
            classId,
            memberId,
        })
            .returning();
        return res.status(201).json({ success: true, attendance });
    }
    catch (err) {
        if (err.code === '23505') {
            // Unique violation
            return res.status(409).json({ error: 'Already checked in' });
        }
        console.error(err);
        return res.status(500).json({ error: 'Failed to check in, class not booked' });
    }
};
exports.checkInToClass = checkInToClass;
const cancelBooking = async (req, res) => {
    const { classId, memberId } = req.body;
    if (!classId || !memberId) {
        return res.status(400).json({ error: 'classId and memberId are required' });
    }
    try {
        const result = await client_1.db
            .delete(schema_1.classbookings)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.classbookings.classId, classId), (0, drizzle_orm_1.eq)(schema_1.classbookings.memberId, memberId)));
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        return res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to cancel booking' });
    }
};
exports.cancelBooking = cancelBooking;
