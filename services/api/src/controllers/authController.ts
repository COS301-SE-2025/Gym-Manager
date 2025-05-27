// === services/api/src/controllers/authController.ts ===
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export const register = async (req: Request, res: Response) => {
  // TODO: hash password, insert into DB
  const { email, password, role } = req.body;
  const user = { id: 1, email, role }; // mocked
  const token = jwt.sign(user, process.env.JWT_SECRET!);
  res.json({ token });
};

export const login = async (req: Request, res: Response) => {
  // TODO: validate against DB
  const { email, password } = req.body;
  const user = { id: 1, email, role: 'member' }; // mocked
  const token = jwt.sign(user, process.env.JWT_SECRET!);
  res.json({ token });
};
export const logout = (req: Request, res: Response) => {
  // Invalidate token logic would go here, if applicable
  res.json({ message: 'Logged out successfully' });
};