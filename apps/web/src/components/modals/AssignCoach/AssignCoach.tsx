'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { userRoleService } from '@/app/services/roles';
import { Coach } from '@/types/types';
import './assign.css';

export interface ClassResource {
  classId: number;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  capacity: number;
  coachName?: string;
  coachId?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  classInfo: ClassResource | null;
  onAssigned?: () => void;
}

export default function ClassDetailsModal({ isOpen, onClose, classInfo, onAssigned }: Props) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [isEditMode, setIsEditMode] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [currentCoach, setCurrentCoach] = useState<Coach | null>(null);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    scheduledDate: '',
    scheduledTime: '',
    durationMinutes: 0,
    capacity: 0,
    coachId: 0
  });

  useEffect(() => {
    if (isOpen && classInfo) {
      fetchCoaches();
      if (classInfo.coachId) {
        fetchCurrentCoach(classInfo.coachId);
      }
      // Initialize edit form with current values
      setEditForm({
        scheduledDate: classInfo.scheduledDate,
        scheduledTime: classInfo.scheduledTime,
        durationMinutes: classInfo.durationMinutes,
        capacity: classInfo.capacity,
        coachId: classInfo.coachId || 0
      });
    }
  }, [isOpen, classInfo]);

  async function fetchCoaches() {
    try {
      const res = await userRoleService.getUsersByRole('coach');
      setCoaches(res);
    } catch (err) {
      console.error('Failed to fetch coaches', err);
    }
  }

  async function fetchCurrentCoach(coachId: number) {
    try {
      const coach = await userRoleService.getUserById(coachId);
      setCurrentCoach(coach as Coach);
    } catch (err) {
      console.error('Failed to fetch current coach', err);
    }
  }

  function handleEdit() {
    setIsEditMode(true);
  }

  function handleCancelEdit() {
    setIsEditMode(false);
    if (classInfo) {
      setEditForm({
        scheduledDate: classInfo.scheduledDate,
        scheduledTime: classInfo.scheduledTime,
        durationMinutes: classInfo.durationMinutes,
        capacity: classInfo.capacity,
        coachId: classInfo.coachId || 0
      });
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!classInfo) return;

    try {
      const token = localStorage.getItem('authToken');
      await axios.put(
        `${API_URL}/classes/${classInfo.classId}`,
        editForm,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (onAssigned) onAssigned();
      setIsEditMode(false);
    } catch (err) {
      console.error('Class update failed', err);
    }
  }

  async function handleDelete() {
    if (!classInfo) return;
    
    if (window.confirm('Are you sure you want to delete this class?')) {
      try {
        const token = localStorage.getItem('authToken');
        await axios.delete(
          `${API_URL}/classes/${classInfo.classId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (onAssigned) onAssigned();
        onClose();
      } catch (err) {
        console.error('Class deletion failed', err);
      }
    }
  }

  if (!isOpen || !classInfo) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Class Details</h2>

        {!isEditMode ? (
          <>
            <div className="class-details">
              <div className="detail-group">
                <p><strong>Scheduled Date:</strong> {classInfo.scheduledDate}</p>
                <p><strong>Scheduled Time:</strong> {classInfo.scheduledTime}</p>
                <p><strong>Duration:</strong> {classInfo.durationMinutes} minutes</p>
              </div>

              <div className="detail-group">
                <p><strong>Capacity:</strong> {classInfo.capacity} people</p>
                <p>
                  <strong>Coach:</strong>{' '}
                  {currentCoach
                    ? `${currentCoach.firstName} ${currentCoach.lastName}`
                    : (classInfo.coachName || 'None assigned')}
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" onClick={handleEdit} className="edit-btn">
                Edit
              </button>
              <button type="button" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          // Edit Mode
          <form onSubmit={handleSave}>
            <div className="edit-form">
              <div className="form-group">
                <label>
                  Scheduled Date:
                  <input
                    type="date"
                    value={editForm.scheduledDate}
                    onChange={(e) => setEditForm({...editForm, scheduledDate: e.target.value})}
                    required
                  />
                </label>
                <label>
                  Scheduled Time:
                  <input
                    type="time"
                    value={editForm.scheduledTime}
                    onChange={(e) => setEditForm({...editForm, scheduledTime: e.target.value})}
                    required
                  />
                </label>
                <label>
                  Duration (minutes):
                  <input
                    type="number"
                    value={editForm.durationMinutes}
                    onChange={(e) => setEditForm({...editForm, durationMinutes: parseInt(e.target.value)})}
                    required
                    min="1"
                  />
                </label>
              </div>

              <div className="form-group">
                <label>
                  Capacity:
                  <input
                    type="number"
                    value={editForm.capacity}
                    onChange={(e) => setEditForm({...editForm, capacity: parseInt(e.target.value)})}
                    required
                    min="1"
                  />
                </label>
                <label>
                  Coach:
                  <select
                    value={editForm.coachId}
                    onChange={(e) => setEditForm({...editForm, coachId: parseInt(e.target.value)})}
                  >
                    <option value={0}>-- Select Coach --</option>
                    {coaches.map((coach) => (
                      <option key={coach.userId} value={coach.userId}>
                        {coach.firstName} {coach.lastName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="modal-actions edit-actions">
              <button type="button" onClick={handleDelete} className="delete-btn">Delete</button>
              <div className="right-actions">
                <button type="button" onClick={handleCancelEdit}>Cancel</button>
                <button type="submit" className="save-btn">Save</button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}