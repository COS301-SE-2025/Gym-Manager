'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { toast } from 'sonner';
import WeeklyCalendar from '../../components/WeeklyCalendar/WeeklyCalendar';
import PendingApprovalTable from '../../components/PendingApprovalTable/page';
import { CalendarEvent, User } from '../../types/types';
import { getDummyCalendarEvents, transformApiDataToEvents } from '../../utils/calendarHelpers';
import { userRoleService } from '../services/roles';
import ClassCreationModal from '@/components/modals/CreateClass/CreateClass';
import AssignCoachModal from '@/components/modals/AssignCoach/AssignCoach';
import { ClassResource } from '@/components/modals/AssignCoach/AssignCoach';
import Link from 'next/link';
import axios from 'axios';

export default function DashboardPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedClassInfo, setSelectedClassInfo] = useState<ClassResource | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Unread = notifications where user hasn't marked as read
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      setupRealtime();
    }
    return () => {
      supabase.removeAllChannels();
    };
  }, [currentUser]);

  const fetchData = async () => {
    try {
      const [apiData, userData] = await Promise.all([
        userRoleService.getWeeklySchedule(),
        userRoleService.getCurrentUser(),
      ]);

      setEvents(transformApiDataToEvents(apiData));
      setCurrentUser(userData);
    } catch (error) {
      console.error('Failed to load schedule or user data:', error);
      setEvents(getDummyCalendarEvents());

      try {
        const userData = await userRoleService.getCurrentUser();
        setCurrentUser(userData);
      } catch (userError) {
        console.error('Failed to load user data:', userError);
      }
    } finally {
      setLoading(false);
    }

    // Example: fetch all users (if needed for dashboard)
    try {
      const token = localStorage.getItem('authToken');
      await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users/allUsers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Failed to get all users:', err);
    }
  };

  const fetchNotifications = async () => {
    if (!currentUser) return;

    const { data: notifs, error: notifError } = await supabase
      .from('notifications')
      .select(
        `
        notification_id,
        title,
        message,
        created_at,
        notification_targets!inner(target_role)
      `
      )
      .eq('notification_targets.target_role', "admin")
      .order('created_at', { ascending: false });

    if (notifError) {
      console.error('Error fetching notifications:', notifError);
      return;
    }

    // Get read statuses for this user
    const { data: reads, error: readsError } = await supabase
      .from('notification_reads')
      .select('notification_id')
      .eq('user_id', currentUser.userId);

    if (readsError) {
      console.error('Error fetching notification reads:', readsError);
      return;
    }

    const readIds = new Set(reads.map((r) => r.notification_id));
    const merged = notifs.map((n) => ({
      ...n,
      read: readIds.has(n.notification_id),
    }));

    setNotifications(merged);
  };

  const setupRealtime = () => {
    supabase
      .channel('notifications_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const notif = payload.new;
          toast(`${notif.title}: ${notif.message}`, { duration: 5000 });
          // Only show if matches current user's role
          if (
            notif.notification_targets?.some(
              (t: any) => t.target_role === "admin"
            )
          ) {
            setNotifications((prev) => [{ ...notif, read: false }, ...prev]);
          }
        }
      )
      .subscribe();
  };

  const markNotificationAsRead = async (notificationId: number) => {
    if (!currentUser) return;

    try {
      await supabase.from('notification_reads').insert({
        notification_id: notificationId,
        user_id: currentUser.userId,
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    const classInfo = event.resource;
    if (classInfo && classInfo.classId) {
      setSelectedClassInfo(classInfo);
      setAssignModalOpen(true);
    }
  };

  const getUserDisplayName = () =>
    currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'User';

  return (
    <div
      style={{
        backgroundColor: '#1E1E1E',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px',
          paddingBottom: '10px',
          backgroundColor: '#1E1E1E',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <Link href="/dashboard/profile" style={{ textDecoration: 'none' }}>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: 'white',
                margin: 0,
                padding: 0,
              }}
            >
              Welcome, {getUserDisplayName()} 👋
            </h1>
          </Link>
          <p style={{ color: '#ffffff', fontSize: '12px', margin: 0 }}>
            View and manage the upcoming week
          </p>
        </div>

        {/* Notifications + Add Class */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                padding: '8px',
              }}
              onClick={() => setShowNotifications((prev) => !prev)}
            >
              <span style={{ fontSize: '22px', color: 'white' }}>🔔</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    backgroundColor: 'red',
                    color: 'white',
                    borderRadius: '50%',
                    fontSize: '10px',
                    padding: '2px 5px',
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                style={{
                  position: 'absolute',
                  top: '40px',
                  right: 0,
                  backgroundColor: '#2a2a2a',
                  color: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                  minWidth: '280px',
                  zIndex: 50,
                  padding: '8px 0',
                }}
              >
                {notifications.length === 0 ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#aaa' }}>
                    No notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.notification_id}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid #444',
                        cursor: 'pointer',
                        backgroundColor: n.read ? 'transparent' : '#333',
                      }}
                      onClick={() => markNotificationAsRead(n.notification_id)}
                    >
                      <strong>{n.title}</strong>
                      <p style={{ margin: 0, fontSize: '12px', color: '#ccc' }}>{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            style={{
              backgroundColor: '#D8FF3E',
              color: 'black',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
            onClick={() => setIsClassModalOpen(true)}
          >
            Add Class
          </button>
        </div>
      </div>

      {/* Calendar Section */}
      <div
        style={{
          flex: 1,
          width: '100%',
          backgroundColor: '#1e1e1e',
          padding: '0',
          minHeight: '700px',
        }}
      >
        <WeeklyCalendar events={events} onSelectEvent={handleEventClick} loading={loading} />

        <div style={{ marginTop: '32px' }}>
          <h2 style={{ color: 'white', fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
            Pending User Approvals
          </h2>
          <PendingApprovalTable role="member" />
        </div>
      </div>

      {/* Modals */}
      <ClassCreationModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        onCreated={() => {
          fetchData();
          setIsClassModalOpen(false);
        }}
      />
      <AssignCoachModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        classInfo={selectedClassInfo}
        onAssigned={() => {
          fetchData();
          setAssignModalOpen(false);
        }}
      />
    </div>
  );
}
