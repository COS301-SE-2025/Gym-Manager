'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { UserRoleService } from '@/app/services/roles';
import './assign.css';

interface Coach {
  userId: number;
  firstName: string;
  lastName: string;
}

export interface ClassResource {
  classId: number;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  capacity: number;
  coachName?: string;
  workoutName?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  classInfo: ClassResource | null;
  onAssigned?: () => void;
}

export default function AssignCoachModal({ isOpen, onClose, classInfo, onAssigned }: Props) {
  const [coachId, setCoachId] = useState<number | null>(null);
  const [coaches, setCoaches] = useState<Coach[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchCoaches();
    }
  }, [isOpen]);

  async function fetchCoaches() {
    try {
      const res = await UserRoleService.getUsersByRole('coach');
      setCoaches(res);
    } catch (err) {
      console.error('Failed to fetch coaches', err);
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!coachId || !classInfo) return;

    try {
      const token = localStorage.getItem('authToken');
      await axios.post(
        'http://localhost:4000/schedule/assign-coach',
        { classId: classInfo.classId, coachId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (onAssigned) onAssigned();
      onClose();
    } catch (err) {
      console.error('Coach assignment failed', err);
    }
  }

  if (!isOpen || !classInfo) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Assign Coach</h2>

        <div style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
          <p><strong>Scheduled Date:</strong> {classInfo.scheduledDate}</p>
          <p><strong>Scheduled Time:</strong> {classInfo.scheduledTime}</p>
          <p><strong>Duration:</strong> {classInfo.durationMinutes} minutes</p>
          <p><strong>Capacity:</strong> {classInfo.capacity} people</p>
          <p><strong>Current Coach:</strong> {classInfo.coachName || 'None assigned'}</p>
        </div>

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
