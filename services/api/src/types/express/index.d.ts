export {};

declare global {
  namespace Express {
    interface UserPayload {
      id: number;
      email: string;
      role: string;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}
