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
};