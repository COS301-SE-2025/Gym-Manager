// components/ClassCard/ClassCard.jsx
import React from 'react';
import './ClassCard.css';

const ClassCard = ({ classItem }) => {
  return (
    <div className="class-card">
      <h3 className="class-card-title">{classItem.workoutName || 'No Workout Assigned'}</h3>
      <div className="class-card-content">
        <p>
          <strong>Date:</strong> {new Date(classItem.scheduledDate).toLocaleDateString()}
        </p>
        <p>
          <strong>Time:</strong> {classItem.scheduledTime}
        </p>
        <p>
          <strong>Capacity:</strong> {classItem.capacity}
        </p>
        {classItem.coachId && (
          <p>
            <strong>Coach ID:</strong> {classItem.coachId}
          </p>
        )}
      </div>
    </div>
  );
};

export default ClassCard;
