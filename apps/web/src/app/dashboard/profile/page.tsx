'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { UserRole } from '@/types/types';
import { User, Coach } from '@/types/types';
import { userRoleService } from '@/app/services/roles';
import './profile.css';

export default function AdminProfile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [showAvailableRoles, setShowAvailableRoles] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userData = await userRoleService.getCurrentUser();
        setUser(userData);
        setFormData({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          phone: userData.phone || '',
          bio: 'bio' in userData ? (userData as Coach).bio || '' : '',
        });
        const roles = await userRoleService.RolesByUser(userData.userId);
        setUserRoles(roles);
        const allRoles: UserRole[] = ['member', 'coach', 'admin', 'manager'];
        setAvailableRoles(allRoles.filter((role) => role !== 'manager' && !roles.includes(role)));
      } catch (err) {
        setError('Failed to load user data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setLoading(true);
      // Save user details (excluding status, credits, authorisation)
      let role: UserRole = userRoles.includes('admin')
        ? 'admin'
        : userRoles.includes('coach')
          ? 'coach'
          : 'member';
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        role,
      };
      if (role === 'coach') payload.bio = formData.bio;
      // authorisation, credits, status excluded - admin should not edit own membership and permissions
      const token = localStorage.getItem('authToken');
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/users/${user.userId}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      setError(null);
    } catch (err) {
      setError('Failed to update profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (role: UserRole) => {
    if (!user) return;
    try {
      setLoading(true);
      await userRoleService.assignRole(user.userId, role);
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
    if (!user) return;
    try {
      setLoading(true);
      await userRoleService.removeRole(user.userId, role);
      setUserRoles(userRoles.filter((r) => r !== role));
      setAvailableRoles([...availableRoles, role]);
    } catch (err) {
      setError('Failed to remove role');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading profile...</div>;
  if (error) return <div className="form-error">{error}</div>;

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-content">
          <h1>Admin Profile: {user ? `${user.firstName} ${user.lastName}` : ''}</h1>
        </div>
      </header>
      <main className="content-wrapper">
        <div className="profile-cards-row">
          <div className="management-card">
            <div className="card-title">
              <h2>Edit Personal Details</h2>
            </div>
            <div className="card-content">
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label>First Name:</label>
                  <input name="firstName" value={formData.firstName} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Last Name:</label>
                  <input name="lastName" value={formData.lastName} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input name="email" value={formData.email} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Phone:</label>
                  <input name="phone" value={formData.phone} onChange={handleChange} />
                </div>
                {userRoles.includes('coach') && (
                  <div className="form-group">
                    <label>Bio:</label>
                    <textarea name="bio" value={formData.bio} onChange={handleChange} />
                  </div>
                )}
                <div className="form-actions">
                  <button type="submit" className="submit-button" disabled={loading}>
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>

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
        </div>
      </main>
    </div>
  );
}
