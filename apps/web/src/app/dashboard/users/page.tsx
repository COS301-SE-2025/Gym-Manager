'use client';
import { useState } from 'react';
import { UserTable } from './table/page';
import AddCoachModal from '@/components/modals/AddCoach/AddCoach';
export default function MembersList() {
  const [showAddCoachModal, setShowAddCoachModal] = useState(false);
  return (
    <main className="users-page">
      <section className="user-section">
        <h2>Members</h2>
        <UserTable role="member" />
      </section>

      <section className="user-section">
        <h2>Coaches</h2>
        <UserTable role="coach" />
        <button
          onClick={() => setShowAddCoachModal(true)}
          style={{
            padding: '8px 16px',
            background: '#d8ff3e',
            color: '#1e1e1e',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
          }}
        >
          Add Coach
        </button>
      </section>

      <section className="user-section">
        <h2>Administrators</h2>
        <UserTable role="admin" />
      </section>

      <section className="user-section">
        <h2>Managers</h2>
        <UserTable role="manager" />
      </section>

      {showAddCoachModal && (
        <AddCoachModal
          onClose={() => {
            setShowAddCoachModal(false);
          }}
        />
      )}
    </main>
  );
}
