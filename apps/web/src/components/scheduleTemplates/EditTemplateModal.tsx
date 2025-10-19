'use client';

import React, { useState, useEffect } from 'react';
import { userRoleService } from '@/app/services/roles';
import { ScheduleTemplateWithItems, UpdateScheduleTemplateRequest } from '@/app/services/scheduleTemplate';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface EditTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: ScheduleTemplateWithItems;
  onSubmit: (templateId: number, data: UpdateScheduleTemplateRequest) => void;
}

export default function EditTemplateModal({ isOpen, onClose, template, onSubmit }: EditTemplateModalProps) {
  const [form, setForm] = useState({
    name: template.name,
    description: template.description || '',
    isActive: template.isActive,
  });
  const [scheduleItems, setScheduleItems] = useState<Array<{
    dayOfWeek: number;
    scheduledTime: string;
    durationMinutes: number;
    capacity: number;
    coachId?: number;
    workoutId?: number;
    classTitle: string;
  }>>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: template.name,
        description: template.description || '',
        isActive: template.isActive,
      });
      setScheduleItems(template.scheduleItems.map(item => ({
        dayOfWeek: item.dayOfWeek,
        scheduledTime: item.scheduledTime,
        durationMinutes: item.durationMinutes,
        capacity: item.capacity,
        coachId: item.coachId,
        workoutId: item.workoutId,
        classTitle: item.classTitle || '',
      })));
      fetchCoaches();
      fetchWorkouts();
    }
  }, [isOpen, template]);

  const fetchCoaches = async () => {
    try {
      const data = await userRoleService.getUsersByRole('coach');
      setCoaches(data || []);
    } catch (err) {
      console.error('Failed to load coaches:', err);
    }
  };

  const fetchWorkouts = async () => {
    try {
      // This would need to be implemented based on your workout API
      // For now, we'll use an empty array
      setWorkouts([]);
    } catch (err) {
      console.error('Failed to load workouts:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value 
    }));
  };

  const addScheduleItem = () => {
    setScheduleItems(prev => [...prev, {
      dayOfWeek: 1, // Monday
      scheduledTime: '09:00',
      durationMinutes: 60,
      capacity: 20,
      classTitle: '',
    }]);
  };

  const removeScheduleItem = (index: number) => {
    setScheduleItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateScheduleItem = (index: number, field: string, value: any) => {
    setScheduleItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!form.name.trim()) {
      setError('Template name is required');
      return;
    }

    if (scheduleItems.length === 0) {
      setError('At least one schedule item is required');
      return;
    }

    onSubmit(template.templateId, {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      isActive: form.isActive,
      scheduleItems: scheduleItems.map(item => ({
        dayOfWeek: item.dayOfWeek,
        scheduledTime: item.scheduledTime,
        durationMinutes: item.durationMinutes,
        capacity: item.capacity,
        coachId: item.coachId || undefined,
        workoutId: item.workoutId || undefined,
        classTitle: item.classTitle.trim() || undefined,
      })),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content large">
        <div className="modal-header">
          <h2>Edit Schedule Template</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Template Name *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleInputChange}
              required
              placeholder="e.g., Morning Classes Template"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleInputChange}
              placeholder="Optional description for this template"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleInputChange}
              />
              Active Template
            </label>
          </div>

          <div className="schedule-items-section">
            <div className="section-header">
              <h3>Schedule Items</h3>
              <button type="button" onClick={addScheduleItem} className="add-button">
                + Add Schedule Item
              </button>
            </div>

            {scheduleItems.map((item, index) => (
              <div key={index} className="schedule-item">
                <div className="schedule-item-header">
                  <h4>Schedule Item {index + 1}</h4>
                  <button type="button" onClick={() => removeScheduleItem(index)} className="remove-button">
                    Remove
                  </button>
                </div>

                <div className="schedule-item-fields">
                  <div className="form-group">
                    <label>Day of Week</label>
                    <select
                      value={item.dayOfWeek}
                      onChange={(e) => updateScheduleItem(index, 'dayOfWeek', parseInt(e.target.value))}
                    >
                      {DAYS_OF_WEEK.map((day, dayIndex) => (
                        <option key={dayIndex} value={dayIndex}>{day}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Time</label>
                    <input
                      type="time"
                      value={item.scheduledTime}
                      onChange={(e) => updateScheduleItem(index, 'scheduledTime', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Duration (minutes)</label>
                    <input
                      type="number"
                      value={item.durationMinutes}
                      onChange={(e) => updateScheduleItem(index, 'durationMinutes', parseInt(e.target.value))}
                      min="15"
                      max="300"
                    />
                  </div>

                  <div className="form-group">
                    <label>Capacity</label>
                    <input
                      type="number"
                      value={item.capacity}
                      onChange={(e) => updateScheduleItem(index, 'capacity', parseInt(e.target.value))}
                      min="1"
                      max="100"
                    />
                  </div>

                  <div className="form-group">
                    <label>Class Title</label>
                    <input
                      type="text"
                      value={item.classTitle}
                      onChange={(e) => updateScheduleItem(index, 'classTitle', e.target.value)}
                      placeholder="e.g., Morning HIIT"
                    />
                  </div>

                  <div className="form-group">
                    <label>Coach (optional)</label>
                    <select
                      value={item.coachId || ''}
                      onChange={(e) => updateScheduleItem(index, 'coachId', e.target.value ? parseInt(e.target.value) : undefined)}
                    >
                      <option value="">-- None --</option>
                      {coaches.map((coach) => (
                        <option key={coach.userId} value={coach.userId}>
                          {coach.firstName} {coach.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="submit-button">
              Update Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
