export interface BaseUser {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface Member extends BaseUser {
  status: string;
  credits_balance: number;
}

export interface Admin extends BaseUser {
  authorisation: string;
  last_login: string;
}

export interface Coach extends BaseUser {
  bio: string;
  specialization: string;
}

export type User = Member | Admin | Coach;
export type UserRole = 'member' | 'coach' | 'admin';