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

export default function UserTable({ role }: UserTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await userRoleService.getUsersByRole(role);
        setUsers(data);
        setCurrentPage(1);
      } catch (err) {
        setError(axios.isAxiosError(err) ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [role]);

  // page calculations
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = users.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

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
      case 'manager': // not used
        return null;
      default:
        return null;
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <>
      <div className="total-count">
        {users.length} {users.length === 1 ? 'user' : 'users'} found
      </div>
      <div className="user-table-container">
      <table className="user-table">
        <thead>
          <tr>
            <th>User ID</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Email</th>
            <th>Phone</th>
            {role === 'member' && <th>Status</th>}
            {role === 'member' && <th>Credits</th>}
            {role === 'coach' && <th>Bio</th>}
            {role === 'admin' && <th>Auth Level</th>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentUsers.map((user) => (
            <tr key={user.userId}>
              <td>{user.userId}</td>
              <td>{user.firstName}</td>
              <td>{user.lastName}</td>
              <td>{user.email}</td>
              <td>{user.phone}</td>
              {renderUserRow(user)}
              <td>
                <Link href={`users/edit/${user.userId}`} className="edit-link">
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
       </table>
       
       {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button 
            onClick={handlePrevious} 
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            Previous
          </button>
          
          <div className="pagination-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`pagination-number ${currentPage === page ? 'active' : ''}`}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button 
            onClick={handleNext} 
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}
      </div>
    </>
  );
}
