export interface User {
    id: string;
    email: string;
    name: string;
    role: 'member' | 'admin' | 'coach';
}

export interface GymClass {
    id: string;
    name: string;
    instructor: string;
    startTime: Date;
    duration: number;
    capacity: number;
    enrolled: number;
}

