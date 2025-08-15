export interface User {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  passwordHash?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserWithRoles extends User {
  roles: string[];
  membershipStatus?: string;
}

export interface UserRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  roles?: string[];
}

export interface UserLoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user?: UserWithRoles;
}
