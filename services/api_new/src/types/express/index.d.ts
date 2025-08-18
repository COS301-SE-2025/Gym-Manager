export {};

declare global {
  namespace Express {
    interface UserPayload {
      userId: number;
      email: string;
      role: string;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}
