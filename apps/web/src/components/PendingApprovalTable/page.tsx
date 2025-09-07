'use client';

import Link from 'next/link';
import './styles.css';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { User, UserRole } from '@/types/types';
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

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  const pendingMembers = users.filter((user) => (user as any).status === 'pending');

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
          {pendingMembers.map((user) => (
            <tr key={user.userId}>
              <td>{user.userId}</td>
              <td>{user.firstName}</td>
              <td>{user.lastName}</td>
              <td>{user.email}</td>
              <td>{user.phone}</td>
              <td>
                <button
                  className="approve-btn"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      await axios.patch(
                        `${process.env.NEXT_PUBLIC_API_URL}/users/${user.userId}`,
                        { status: 'approved' },
                        {
                          headers: {
                            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
                          },
                        },
                      );
                      //refresh users list
                      const data = await userRoleService.getUsersByRole(role);
                      setUsers(data);
                    } catch (err) {
                      setError(axios.isAxiosError(err) ? err.message : 'Failed to approve user');
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Approve
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
