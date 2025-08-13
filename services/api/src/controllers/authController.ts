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