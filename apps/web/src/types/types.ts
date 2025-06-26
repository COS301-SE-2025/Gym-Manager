export interface BaseUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface Member extends BaseUser {
  status: string;
  credits_balance: number;
}

export interface Admin extends BaseUser {
  authorisation: string;
}

export interface Coach extends BaseUser {
  bio: string;
}

export type User = Member | Admin | Coach;
export type UserRole = 'member' | 'coach' | 'admin';