'use client';
import { useState } from 'react';
import { User } from '@/types/types';
import { userRoleService } from '@/app/services/roles';

export default function AdminProfile() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const fetchData = async () => {
    try {
      try {
        const userData = await userRoleService.getCurrentUser();
        setCurrentUser(userData);
      } catch (userError) {
        console.error('Failed to load user data:', userError);
      }
    } finally {
      setLoading(false);
    }
  };

  const getUserDisplayName = () => {
    if (currentUser) {
      return `${currentUser.firstName} ${currentUser.lastName}`;
    }
    return 'User';
  };
  return (
    <div className="page-container">
      <div className="header">
        <h2>{getUserDisplayName()}</h2>
      </div>
      <div className="page-cards">
        <div className="personal-details"></div>
        <div className="admin-and-auth"></div>
      </div>
    </div>
  );
}
