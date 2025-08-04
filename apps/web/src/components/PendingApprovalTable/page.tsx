'use client';

import Link from 'next/link';
import './styles.css';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { User, UserRole, Admin, Member, Coach } from '@/types/types';
import { userRoleService } from '@/app/services/roles';

interface UserTableProps {
  role: UserRole;
}

export default function PendingApprovalTable({ role }: UserTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await userRoleService.getUsersByRole(role);
        setUsers(data);
      } catch (err) {
        setError(axios.isAxiosError(err) ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [role]);

  const renderUserRow = (user: User) => {
    switch (role) {
      case 'member':
        const member = user as Member;
        return (
          <>
            <td>{member.status}</td>
            <td>{member.credits}</td>
          </>
        );
      case 'coach':
        const coach = user as Coach;
        return (
          <>
            <td>{coach.bio}</td>
          </>
        );
      case 'admin':
        const admin = user as Admin;
        return (
          <>
            <td>{admin.authorisation}</td>
          </>
        );
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="user-table-container">
      <table className="user-table">
        <thead>
          <tr>
            <th>User ID</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Actions</th>      
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.userId}>
              <td>{user.userId}</td>
              <td>{user.firstName}</td>
              <td>{user.lastName}</td>
              <td>{user.phone}</td>
              <td>{user.email}</td>
              <td>
                <Link href={`dashboard/users/edit/${user.userId}`} className="edit-link">
                  Approve
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
