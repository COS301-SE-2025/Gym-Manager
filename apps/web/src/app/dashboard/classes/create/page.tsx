'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  onClose: () => void;
}

export const AddClassModal: React.FC<Props> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    scheduledDate: '',
    scheduledTime: '',
    capacity: '',
    coachId: '',
    workoutId: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center">
      <form className="bg-white p-6 rounded-lg space-y-4 w-full max-w-md" onSubmit={handleSubmit}>
        <h2 className="text-xl font-semibold">Add New Class</h2>
        <input
          name="scheduledDate"
          placeholder="Date (YYYY-MM-DD)"
          onChange={handleChange}
          className="w-full border p-2"
        />
        <input
          name="scheduledTime"
          placeholder="Time (HH:MM)"
          onChange={handleChange}
          className="w-full border p-2"
        />
        <input
          name="capacity"
          placeholder="Capacity"
          onChange={handleChange}
          className="w-full border p-2"
        />
        <input
          name="coachId"
          placeholder="Coach ID"
          onChange={handleChange}
          className="w-full border p-2"
        />
        <input
          name="workoutId"
          placeholder="Workout ID (optional)"
          onChange={handleChange}
          className="w-full border p-2"
        />
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add</Button>
        </div>
      </form>
    </div>
  );
};
