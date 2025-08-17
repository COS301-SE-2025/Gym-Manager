'use client';
import { User, Coach } from '@/types/types';
import { userRoleService } from '@/app/services/roles';
import './profile.css';
import React, { useState } from 'react';
import axios from 'axios';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [coach, setCoach] = useState<Coach | null>(null);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users/${user!.userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(user),
      });
    } catch (err) {
      console.error(err);
    }
  };

  return null;
}
