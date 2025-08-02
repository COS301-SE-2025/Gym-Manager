'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { UserRole, User, Member } from '@/types/types';
import { userRoleService } from '@/app/services/roles';
import { userManagementService } from '@/app/services/userManagementService';
import './styles.css';

const ALL_ROLES: UserRole[] = ['member', 'coach', 'admin', 'manager'];

export default function EditUser() {
  const [status, setStatus] = useState<string>('active');
  const [statusLoading, setStatusLoading] = useState(false);
  const params = useParams();
  const userId = parseInt(params.id as string, 10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [showAvailableRoles, setShowAvailableRoles] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const [userData, roles] = await Promise.all([
          userRoleService.getUserById(userId),
          userRoleService.RolesByUser(userId),
        ]);
        setUser(userData);
        setUserRoles(roles);
        console.log('User:', userData);
        setAvailableRoles(ALL_ROLES.filter((role) => role !== 'manager' && !roles.includes(role)));
        if (roles.includes('member')) {
          setStatus((userData as Member).status || 'active');
        }
      } catch (err) {
        setError('Failed to load user data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  const handleAssign = async (role: UserRole) => {
    try {
      setLoading(true);
      await userRoleService.assignRole(userId, role);
      setUserRoles([...userRoles, role]);
      setAvailableRoles(availableRoles.filter((r) => r !== role));
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
      await userRoleService.removeRole(userId, role);
      setUserRoles(userRoles.filter((r) => r !== role));
      setAvailableRoles([...availableRoles, role]);
    } catch (err) {
      setError('Failed to remove role');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    try {
      setStatusLoading(true);
      await userManagementService.updateStatus(userId, status, userData?.firstName || '');
      setError(null);
    } catch (err) {
      setError('Failed to update status');
      console.error(err);
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading roles...</div>;
  if (error) return <div className="form-error">{error}</div>;

  const displayName = user ? `${user.firstName} ${user.lastName} (ID: ${userId})` : `ID: ${userId}`;
  const memberUser = user as Member;

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-content">
          <h1>User Management for {displayName}</h1>
        </div>
      </header>

      <main className="content-wrapper">
      {userRoles.includes('member') && user && (
        <div className="management-card">
        <div className="card-title">
          <h2>Manage Membership</h2>
        </div>

        <div className="card-content">
          <p>Current status: {memberUser.status}</p>
          <div className="form-group">
            <label>Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="text-input"
              disabled={statusLoading}
            >
              <option value="active">pending</option>
              <option value="inactive">approved</option>
              <option value="suspended">suspended</option>
              <option value="cancelled">cancelled</option>
            </select>
            </div>
            <div className="form-actions">
              <button onClick={handleStatusUpdate} className="submit-button">Update Status</button>
            </div>
          </div>
        </div>
      )}
        <div className="management-card">
          <div className="card-title">
            <h2>Manage Roles</h2>
          </div>

          <div className="card-content">
            <h3>Current Roles:</h3>
            <div className="form-group">
              {userRoles.length > 0 ? (
                <div className="current-roles-grid">
                  {userRoles.map((role) => (
                    <div key={role} className="current-role-item">
                      <span className="role-name">{role}</span>
                      {role !== 'manager' && (
                        <button
                          onClick={() => handleRemove(role)}
                          disabled={loading}
                          className="remove-button"
                        >
                          Remove
                        </button>
                      )}
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
                <h3>Available Roles:</h3>
                {availableRoles.length > 0 ? (
                  <div className="available-roles-grid">
                    {availableRoles.map((role) => (
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
                  <button onClick={() => setShowAvailableRoles(false)} className="cancel-button">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
