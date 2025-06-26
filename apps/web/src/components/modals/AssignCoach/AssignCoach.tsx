'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Coach {
  userId: number;
  firstName: string;
  lastName: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  classId: number;
  onAssigned?: () => void;
}

export default function AssignCoachModal({ isOpen, onClose, classId, onAssigned }: Props) {
  const [coachId, setCoachId] = useState<number | null>(null);
  const [coaches, setCoaches] = useState<Coach[]>([]);

  useEffect(() => {
    if (isOpen) fetchCoaches();
  }, [isOpen]);

  async function fetchCoaches() {
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get('http://localhost:4000/roles/getUsersByRole/coach', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCoaches(res.data);
    } catch (err) {
      console.error('Failed to fetch coaches', err);
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!coachId) return;
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(
        'http://localhost:4000/schedule/assign-coach',
        { classId, coachId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (onAssigned) onAssigned();
      onClose();
    } catch (err) {
      console.error('Coach assignment failed', err);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Assign Coach</h2>
        <form onSubmit={handleAssign}>
          <label>Select Coach:
            <select value={coachId ?? ''} onChange={(e) => setCoachId(Number(e.target.value))} required>
              <option value="">-- Select Coach --</option>
              {coaches.map((coach) => (
                <option key={coach.userId} value={coach.userId}>
                  {coach.firstName} {coach.lastName}
                </option>
              ))}
            </select>
          </label>
          <div className="modal-actions">
            <button type="submit">Assign</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
