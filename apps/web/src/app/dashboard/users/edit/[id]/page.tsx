'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { UserRole } from '@/types/types';
import { UserRoleService } from '@/app/services/roles';
import './styles.css';

const ALL_ROLES: UserRole[] = ['member', 'coach', 'admin', 'manager'];

export default function EditUser() {
  const params = useParams();
  const userId = parseInt(params.id as string, 10);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [showAvailableRoles, setShowAvailableRoles] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoading(true);
        const roles = await UserRoleService.RolesByUser(userId);
        setUserRoles(roles);
        setAvailableRoles(ALL_ROLES.filter(role => !roles.includes(role)));
      } catch (err) {
        setError('Failed to load roles');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [userId]);

  const handleAssign = async (role: UserRole) => {
    try {
      setLoading(true);
      await UserRoleService.assignRole(userId, role);
      setUserRoles([...userRoles, role]);
      setAvailableRoles(availableRoles.filter(r => r !== role));
      setShowAvailableRoles(false);
    } catch (err) {
      setError('Failed to assign role');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (role: UserRole) => {
    try {
      setLoading(true);
      await UserRoleService.removeRole(userId, role);
      setUserRoles(userRoles.filter(r => r !== role));
      setAvailableRoles([...availableRoles, role]);
    } catch (err) {
      setError('Failed to remove role');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading roles...</div>;
  if (error) return <div className="form-error">{error}</div>;

  return (
    <div className="edit-user-container">
      <header className="page-header">
        <h1>User Management for ID: {userId} </h1>
      </header>

      <div className="management-card-container">
        <div className="management-card">
          <div className="card-title">
            <h2>Manage Roles</h2>
          </div>
          
          <div className="card-content">
            <div className="form-group">
              {userRoles.length > 0 ? (
                <div className="current-roles-grid">
                  {userRoles.map(role => (
                    <div key={role} className="current-role-item">
                      <span className="role-name">{role}</span>
                      <button 
                        onClick={() => handleRemove(role)}
                        disabled={loading}
                        className="remove-button"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-roles-message">No roles assigned</p>
              )}
            </div>

            {!showAvailableRoles ? (
              <div className="form-actions">
                <button
                  onClick={() => setShowAvailableRoles(true)}
                  className="submit-button"
                  disabled={loading || availableRoles.length === 0}
                >
                  Add Roles
                </button>
              </div>
            ) : (
              <div className="form-group">
                <h3>Available Roles</h3>
                {availableRoles.length > 0 ? (
                  <div className="available-roles-grid">
                    {availableRoles.map(role => (
                      <button
                        key={role}
                        onClick={() => handleAssign(role)}
                        disabled={loading}
                        className="add-button"
                      >
                        Add {role}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="no-roles-message">All roles assigned</p>
                )}
                <div className="form-actions">
                  <button
                    onClick={() => setShowAvailableRoles(false)}
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}