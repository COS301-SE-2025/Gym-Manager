'use client'

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ClassWithWorkout } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ClassesTable = () => {
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [classes, setClasses] = useState<ClassWithWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClass, setNewClass] = useState({
    scheduledDate: '',
    scheduledTime: '',
    capacity: 10,
    coachId: '',
    workoutId: ''
  });

  useEffect(() => {
    if (session) {
      fetchClasses();
    }
  }, [session]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/classes', {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch classes');
      }

      const data = await response.json();
      setClasses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`
        },
        body: JSON.stringify(newClass)
      });

      if (!response.ok) {
        throw new Error('Failed to add class');
      }

      await fetchClasses();
      setShowAddClass(false);
      setNewClass({
        scheduledDate: '',
        scheduledTime: '',
        capacity: 10,
        coachId: '',
        workoutId: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add class');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewClass(prev => ({
      ...prev,
      [name]: name === 'capacity' ? parseInt(value) : value
    }));
  };

  if (loading) return <div>Loading classes...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <p>classes</p>
  )};