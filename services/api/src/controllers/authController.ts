// === services/api/src/controllers/authController.ts ===
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export const register = async (req: Request, res: Response) => {
  const { email, password, role } = req.body;
  // TODO: hash password and insert into DB
  const user = { id: 1, email, role };
  const token = jwt.sign(user, process.env.JWT_SECRET!);
  res.json({ token });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  // TODO: validate credentials against DB
  const user = { id: 1, email, role: 'member' };
  const token = jwt.sign(user, process.env.JWT_SECRET!);
  res.json({ token });
};
