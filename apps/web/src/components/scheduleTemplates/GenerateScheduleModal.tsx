'use client';

import React, { useState } from 'react';
import { ScheduleTemplateWithItems } from '@/app/services/scheduleTemplate';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface GenerateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: ScheduleTemplateWithItems;
  onSubmit: (templateId: number, startDate: string) => void;
}

export default function GenerateScheduleModal({ isOpen, onClose, template, onSubmit }: GenerateScheduleModalProps) {
  const [startDate, setStartDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!startDate) {
      setError('Please select a start date');
      return;
    }

    onSubmit(template.templateId, startDate);
  };

  const getDayName = (dayOfWeek: number) => DAYS_OF_WEEK[dayOfWeek];

  const getTimeDisplay = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Generate Schedule from Template</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="template-preview">
          <h3>Template: {template.name}</h3>
          {template.description && <p className="template-description">{template.description}</p>}
          
          <div className="schedule-preview">
            <h4>Schedule Items:</h4>
            {template.scheduleItems.length === 0 ? (
              <p className="no-items">No schedule items configured</p>
            ) : (
              <div className="schedule-items-list">
                {template.scheduleItems.map((item, index) => (
                  <div key={index} className="schedule-item-preview">
                    <div className="item-day">{getDayName(item.dayOfWeek)}</div>
                    <div className="item-time">{getTimeDisplay(item.scheduledTime)}</div>
                    <div className="item-details">
                      {item.classTitle && <span className="item-title">{item.classTitle}</span>}
                      <span className="item-duration">{item.durationMinutes} min</span>
                      <span className="item-capacity">Capacity: {item.capacity}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Start Date *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="help-text">
              Classes will be generated for the week starting from this date.
            </p>
          </div>

          <div className="generation-info">
            <h4>What will be created:</h4>
            <ul>
              <li>{template.scheduleItems.length} classes will be created</li>
              <li>Classes will be scheduled for the week starting {startDate || 'selected date'}</li>
              <li>Each class will follow the template configuration</li>
              <li>You can modify individual classes after generation</li>
            </ul>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="submit-button">
              Generate Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
