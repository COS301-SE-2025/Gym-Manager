'use client';

import Link from 'next/link';
import './styles.css';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { User, UserRole } from '@/types/types';

interface UserTableProps {
  role: UserRole;
}

export function UserTable({ role }: UserTableProps) {
const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await axios.get<User[]>(`api/roles/getUsersByRole?role=${role}`);
        setUsers(response.data);
      } catch (err) {
        setError(axios.isAxiosError(err) 
          ? err.message 
          : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [role]);

  return (
    <div className="user-table-container">
      <table className="user-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.phone}</td>
              <td>
                <Link href={`/users/edit/${user.id}`} className="edit-link">
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
