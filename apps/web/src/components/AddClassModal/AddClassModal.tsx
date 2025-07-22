import React, { useState } from 'react';
import styles from './AddClassModal.module.css';

interface AddClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClass: (classData: {
    scheduledDate: string;
    scheduledTime: string;
    capacity: number;
  }) => void;
}

const AddClassModal: React.FC<AddClassModalProps> = ({ isOpen, onClose, onAddClass }) => {
  const [formData, setFormData] = useState({
    scheduledDate: '',
    scheduledTime: '',
    capacity: 10,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'capacity' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddClass(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h2>Add New Class</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="scheduledDate">Date:</label>
            <input
              type="date"
              id="scheduledDate"
              name="scheduledDate"
              value={formData.scheduledDate}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="scheduledTime">Time:</label>
            <input
              type="time"
              id="scheduledTime"
              name="scheduledTime"
              value={formData.scheduledTime}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="capacity">Capacity:</label>
            <input
              type="number"
              id="capacity"
              name="capacity"
              min="1"
              max="50"
              value={formData.capacity}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.buttonGroup}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submitButton}>
              Add Class
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddClassModal;
