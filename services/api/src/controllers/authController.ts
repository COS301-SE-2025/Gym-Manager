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
};