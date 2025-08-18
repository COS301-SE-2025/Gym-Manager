<<<<<<< HEAD
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import UserRepository from '../repositories/user.repository';
import { hashPassword, verifyPassword, generateJwt } from '../middleware/auth';

const userRepo = new UserRepository();

export const register = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, password, roles = ['member'] } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check existing email via repo
    const existing = await userRepo.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user + role rows transactionally (repository helper)
    const created = await userRepo.createUserWithRoles(
      {
        firstName,
        lastName,
        email,
        phone,
        passwordHash,
      },
      roles as Array<'member' | 'coach' | 'admin' | 'manager'>,
    );

    // Optionally fetch roles from DB to be authoritative (but using `roles` is fine too)
    const assignedRoles = await userRepo.getRolesByUserId(created.userId);

    // Generate token
    const token = generateJwt({ userId: created.userId, roles: assignedRoles });

    // Return token (keeps same minimal response shape you used before)
    return res.status(201).json({ token });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Failed to register user' });
  }
};


/**
 * POST /login
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

    const user = await userRepo.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const passwordValid = await verifyPassword(password, user.passwordHash as string);
    if (!passwordValid) return res.status(401).json({ error: 'Invalid credentials' });

    // Fetch roles using repository
    const roles = await userRepo.getRolesByUserId(user.userId);

    const token = generateJwt({ userId: user.userId, roles });

    return res.json({
      token,
      user: {
        id: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * GET /status
 */
export const getStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const userId = req.user.userId as number;

    // Get roles
    const roles = await userRepo.getRolesByUserId(userId);

    // Get membership status if user has member role
    let membershipStatus = 'visitor';
    if (roles.includes('member')) {
      const status = await userRepo.getMemberStatus(userId);
      membershipStatus = status ?? 'pending';
    }

    return res.json({ userId, roles, membershipStatus });
  } catch (err: any) {
    console.error('Status fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch status' });
  }
=======
import { db } from '../db/client';
import { users, userroles, members, coaches, managers, admins } from '../db/schema';
import { hashPassword, verifyPassword, generateJwt } from '../middleware/auth';
import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';


export const register = async (req: Request, res: Response) => {
  const { firstName, lastName, email, phone, password, roles = ['member'] } = req.body;
  // check existing email
  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser.length > 0) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  // create user
  const passwordHash = await hashPassword(password);
  const [newUser] = await db
    .insert(users)
    .values({
      firstName,
      lastName,
      email,
      phone,
      passwordHash,
    })
    .returning();

  // assign roles
  const roleEntries = roles.map((role: 'member' | 'coach' | 'admin' | 'manager') => ({
    userId: newUser.userId,
    userRole: role,
  }));

  await db.insert(userroles).values(roleEntries);
  if (roles.includes('member')) {
    await db.insert(members).values({
      userId: newUser.userId,
      status: 'pending', // default status
      creditsBalance: 0, // default balance
    });
  }

  if (roles.includes('coach')) {
    await db.insert(coaches).values({
      userId: newUser.userId,
      bio: '', // default bio
    });
  }

  if (roles.includes('manager')) {
    await db.insert(managers).values({
      userId: newUser.userId, // default empty permissions
    });
  }

  if (roles.includes('admin')) {
    await db.insert(admins).values({
      userId: newUser.userId, // default empty permissions
    });
  }

  const token = generateJwt({ userId: newUser.userId, roles });
  res.json({ token });
};


export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) return res.status(401).json({ error: 'Invalid credentials' });

  // get roles
  const userRoles = await db.select().from(userroles).where(eq(userroles.userId, user.userId));
  const roles = userRoles.map((r) => r.userRole);

  const token = generateJwt({ userId: user.userId, roles });
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


export const getStatus = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = req.user.userId;

  const roleRows = await db
    .select({ role: userroles.userRole })
    .from(userroles)
    .where(eq(userroles.userId, userId));

  const roles: string[] = roleRows.map(r => r.role);

  let membershipStatus: string;
  if (roles.includes('member')) {
    const [member] = await db
      .select({ status: members.status })
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    membershipStatus = member ? member.status : 'pending';
  } else {
    membershipStatus = 'visitor';
  }

  return res.json({ userId, roles, membershipStatus });
>>>>>>> c1781474751a74e1b8038e2937c0ae609c4776a3
};