'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { userRoleService } from '@/app/services/roles';
import './style.css';
export default function ClassCreationModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [coaches, setCoaches] = useState([]);
  const [form, setForm] = useState({
    scheduledDate: '',
    scheduledTime: '',
    durationMinutes: '',
    capacity: '',
    coachId: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchCoaches();
    }
  }, [isOpen]);

  const fetchCoaches = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await userRoleService.getUsersByRole('coach');
      setCoaches(res || []);
    } catch (err) {
      console.error('Failed to load coaches:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  interface JwtPayload {
    userId: number;
  }

  const handleSubmit = async () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Missing token');
      const userJWT = jwtDecode<JwtPayload>(token);
      const adminID = userJWT.userId;
      await axios.post(
        `${API_URL}/class`,
        { ...form, createdBy: adminID },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create class:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modalBackdrop">
      <div className="modalContent">
        <h2>Create New Class</h2>

        <label>Date:</label>
        <input
          type="date"
          name="scheduledDate"
          value={form.scheduledDate}
          onChange={handleChange}
        />

        <label>Time:</label>
        <input
          type="time"
          name="scheduledTime"
          value={form.scheduledTime}
          onChange={handleChange}
        />

        <label>Duration (minutes):</label>
        <input
          type="number"
          name="durationMinutes"
          value={form.durationMinutes}
          onChange={handleChange}
          min={0}
        />

        <label>Capacity:</label>
        <input
          type="number"
          name="capacity"
          value={form.capacity}
          onChange={handleChange}
          min={1}
        />

        <label>Coach (optional):</label>
        <select name="coachId" value={form.coachId} onChange={handleChange}>
          <option value="">-- None --</option>
          {coaches.map((coach: any) => (
            <option key={coach.userId} value={coach.userId}>
              {coach.firstName} {coach.lastName}
            </option>
          ))}
        </select>

        <div className="buttonRow">
          <button className="modalButton primary" onClick={handleSubmit}>
            Create
          </button>
          <button className="modalButton cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modal: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 8,
    width: 400,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 16,
  },
};
