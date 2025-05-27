import { db } from '../db/client';  // your Drizzle client
import { users, userroles } from '../db/schema';
import { hashPassword, verifyPassword, generateJwt } from '../middleware/auth'; // your auth utils
import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';

export const register = async (req : Request, res : Response) => {
  const { firstName, lastName, email, phone, password, roles = ['member'] } = req.body;
  // check existing email
  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser.length > 0) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  // create user
  const passwordHash = await hashPassword(password);
  const [newUser] = await db.insert(users).values({
    firstName, lastName, email, phone, passwordHash
  }).returning();
  
  // assign roles
  const roleEntries = roles.map((role: 'member' | 'coach' | 'admin' | 'manager') => ({
  userId: newUser.userId,
  userRole: role
  }));

  await db.insert(userroles).values(roleEntries);

  const token = generateJwt({ userId: newUser.userId, roles });
  res.json({ token });
}

export const login = async (req : Request, res : Response) => {
  const { email, password } = req.body;
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) return res.status(401).json({ error: 'Invalid credentials' });

  // get roles
  const userRoles = await db.select().from(userroles).where(eq(userroles.userId, user.userId));
  const roles = userRoles.map(r => r.userRole);

  const token = generateJwt({ userId: user.userId, roles });
  res.json({ token });
}
