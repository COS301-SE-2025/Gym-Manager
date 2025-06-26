'use client'

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ClassWithWorkout } from '@/types/types';

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
          'Authorization': `Bearer ${(session as any)?.accessToken || ''}`
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
          'Authorization': `Bearer ${(session as any)?.accessToken || ''}`
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Class Schedule</h1>
        <button
          onClick={() => setShowAddClass(!showAddClass)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {showAddClass ? 'Cancel' : 'Add New Class'}
        </button>
      </div>

      {showAddClass && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Add New Class</h2>
          <form onSubmit={handleAddClass}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="scheduledDate">
                  Date
                </label>
                <input
                  type="date"
                  id="scheduledDate"
                  name="scheduledDate"
                  value={newClass.scheduledDate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="scheduledTime">
                  Time
                </label>
                <input
                  type="time"
                  id="scheduledTime"
                  name="scheduledTime"
                  value={newClass.scheduledTime}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="capacity">
                  Capacity
                </label>
                <input
                  type="number"
                  id="capacity"
                  name="capacity"
                  min="1"
                  value={newClass.capacity}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="coachId">
                  Coach ID
                </label>
                <input
                  type="text"
                  id="coachId"
                  name="coachId"
                  value={newClass.coachId}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="workoutId">
                  Workout ID
                </label>
                <input
                  type="text"
                  id="workoutId"
                  name="workoutId"
                  value={newClass.workoutId}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Add Class
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Class ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Capacity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Coach
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Workout
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {classes.length > 0 ? (
              classes.map((cls) => (
                <tr key={cls.classId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cls.classId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(cls.scheduledDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cls.scheduledTime}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cls.capacity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cls.coachId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cls.workoutId}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No classes scheduled
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClassesTable;