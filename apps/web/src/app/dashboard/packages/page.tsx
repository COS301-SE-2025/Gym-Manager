'use client';
import { useState, useEffect } from 'react';
import { PlusIcon, EditIcon, TrashIcon, EyeIcon, EyeOffIcon } from 'lucide-react';
import './packages.css';

interface PaymentPackage {
  packageId: number;
  name: string;
  description?: string;
  creditsAmount: number;
  priceCents: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  transactionCount?: number; // Number of transactions using this package
}

interface CreatePackageData {
  name: string;
  description: string;
  creditsAmount: number;
  priceRands: number;
  currency: string;
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<PaymentPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PaymentPackage | null>(null);
  const [formData, setFormData] = useState<CreatePackageData>({
    name: '',
    description: '',
    creditsAmount: 0,
    priceRands: 0,
    currency: 'ZAR'
  });

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/payments/packages/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPackages(data);
      } else {
        console.error('Failed to fetch packages');
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const packageData = {
        ...formData,
        priceCents: Math.round(formData.priceRands * 100) // Convert Rands to cents
      };
      const response = await fetch(`${API_BASE_URL}/payments/packages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(packageData)
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({ name: '', description: '', creditsAmount: 0, priceRands: 0, currency: 'ZAR' });
        fetchPackages();
      } else {
        const error = await response.json();
        alert(`Failed to create package: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating package:', error);
      alert('Failed to create package');
    }
  };

  const handleEditPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage) return;

    try {
      const token = localStorage.getItem('authToken');
      const packageData = {
        ...formData,
        priceCents: Math.round(formData.priceRands * 100) // Convert Rands to cents
      };
      const response = await fetch(`${API_BASE_URL}/payments/packages/${editingPackage.packageId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(packageData)
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingPackage(null);
        setFormData({ name: '', description: '', creditsAmount: 0, priceRands: 0, currency: 'ZAR' });
        fetchPackages();
      } else {
        const error = await response.json();
        alert(`Failed to update package: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating package:', error);
      alert('Failed to update package');
    }
  };

  const handleDeletePackage = async (packageId: number) => {
    if (!confirm('Are you sure you want to delete this package?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/payments/packages/${packageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchPackages();
      } else {
        const error = await response.json();
        if (error.error && error.error.includes('existing transactions')) {
          alert('Cannot delete this package because it has been purchased by users. Please deactivate it instead by clicking the eye icon.');
        } else {
          alert(`Failed to delete package: ${error.error}`);
        }
      }
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Failed to delete package');
    }
  };

  const handleToggleActive = async (packageId: number, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/payments/packages/${packageId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (response.ok) {
        fetchPackages();
      } else {
        const error = await response.json();
        alert(`Failed to update package status: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating package status:', error);
      alert('Failed to update package status');
    }
  };

  const openEditModal = (pkg: PaymentPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      creditsAmount: pkg.creditsAmount,
      priceRands: pkg.priceCents / 100, // Convert cents to Rands
      currency: pkg.currency
    });
    setShowEditModal(true);
  };

  const formatPrice = (cents: number) => {
    return `R${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="packages-container">
        <div className="loading">Loading packages...</div>
      </div>
    );
  }

  return (
    <div className="packages-container">
      <div className="packages-header">
        <h1>Payment Packages Management</h1>
        <button 
          className="create-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <PlusIcon size={20} />
          Create Package
        </button>
      </div>

      <div className="packages-grid">
        {packages.map((pkg) => (
          <div key={pkg.packageId} className={`package-card ${!pkg.isActive ? 'inactive' : ''}`}>
            <div className="package-header">
              <h3>{pkg.name}</h3>
              <div className="package-actions">
                <button
                  className="action-btn toggle-btn"
                  onClick={() => handleToggleActive(pkg.packageId, pkg.isActive)}
                  title={pkg.isActive ? 'Deactivate' : 'Activate'}
                >
                  {pkg.isActive ? <EyeIcon size={16} /> : <EyeOffIcon size={16} />}
                </button>
                <button
                  className="action-btn edit-btn"
                  onClick={() => openEditModal(pkg)}
                  title="Edit"
                >
                  <EditIcon size={16} />
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => handleDeletePackage(pkg.packageId)}
                  title={pkg.transactionCount && pkg.transactionCount > 0 ? "Cannot delete - has transactions" : "Delete"}
                  disabled={pkg.transactionCount && pkg.transactionCount > 0}
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            </div>
            
            <div className="package-details">
              <p className="package-description">{pkg.description || 'No description'}</p>
              <div className="package-pricing">
                <div className="price-info">
                  <span className="price">{formatPrice(pkg.priceCents)}</span>
                  <span className="credits">{pkg.creditsAmount} credits</span>
                </div>
                <div className="package-meta">
                  <span className={`status ${pkg.isActive ? 'active' : 'inactive'}`}>
                    {pkg.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="currency">{pkg.currency}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Package Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Create New Package</h2>
              <button 
                className="close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreatePackage} className="package-form">
              <div className="form-group">
                <label htmlFor="name">Package Name *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="creditsAmount">Credits Amount *</label>
                  <input
                    type="number"
                    id="creditsAmount"
                    value={formData.creditsAmount}
                    onChange={(e) => setFormData({ ...formData, creditsAmount: parseInt(e.target.value) || 0 })}
                    min="1"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="priceRands">Price (Rands) *</label>
                  <input
                    type="number"
                    id="priceRands"
                    value={formData.priceRands}
                    onChange={(e) => setFormData({ ...formData, priceRands: parseFloat(e.target.value) || 0 })}
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="currency">Currency</label>
                <select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                >
                  <option value="ZAR">ZAR (South African Rand)</option>
                </select>
              </div>
              
              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit">Create Package</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Package Modal */}
      {showEditModal && editingPackage && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Package</h2>
              <button 
                className="close-btn"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditPackage} className="package-form">
              <div className="form-group">
                <label htmlFor="edit-name">Package Name *</label>
                <input
                  type="text"
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="edit-description">Description</label>
                <textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-creditsAmount">Credits Amount *</label>
                  <input
                    type="number"
                    id="edit-creditsAmount"
                    value={formData.creditsAmount}
                    onChange={(e) => setFormData({ ...formData, creditsAmount: parseInt(e.target.value) || 0 })}
                    min="1"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="edit-priceRands">Price (Rands) *</label>
                  <input
                    type="number"
                    id="edit-priceRands"
                    value={formData.priceRands}
                    onChange={(e) => setFormData({ ...formData, priceRands: parseFloat(e.target.value) || 0 })}
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="edit-currency">Currency</label>
                <select
                  id="edit-currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                >
                  <option value="ZAR">ZAR (South African Rand)</option>
                </select>
              </div>
              
              <div className="form-actions">
                <button type="button" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit">Update Package</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
