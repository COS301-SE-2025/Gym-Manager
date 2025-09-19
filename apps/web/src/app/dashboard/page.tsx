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
import { Bell } from 'lucide-react';

export default function DashboardPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedClassInfo, setSelectedClassInfo] = useState<ClassResource | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [allNotifications, setAllNotifications] = useState<any[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (res) => res,
      async (error) => {
        const originalRequest = error.config || {};
        if (
          (error.response?.status === 401 || error.response?.status === 403) &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const r = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/refresh`,
                { refreshToken },
                {
                  headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` },
                },
              );
              const newToken = r.data.token;
              const newRefresh = r.data.refreshToken || refreshToken;
              localStorage.setItem('authToken', newToken);
              localStorage.setItem('refreshToken', newRefresh);
              document.cookie = `authToken=${newToken}; path=/; max-age=3600; secure; samesite=strict`;
              document.cookie = `refreshToken=${newRefresh}; path=/; max-age=${60 * 60 * 24 * 30}; secure; samesite=strict`;
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return axios(originalRequest);
            } catch (e) {
              localStorage.removeItem('authToken');
              localStorage.removeItem('refreshToken');
            }
          }
        }
        return Promise.reject(error);
      },
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchUnreadNotifications();
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

    try {
      const token = localStorage.getItem('authToken');
      await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Failed to get all users:', err);
    }
  };

  const fetchUnreadNotifications = async () => {
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
      `,
      )
      .eq('notification_targets.target_role', 'admin')
      .order('created_at', { ascending: false })
      .limit(5);

    if (notifError) {
      console.error('Error fetching notifications:', notifError);
      return;
    }

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

  const fetchAllNotifications = async () => {
    if (!currentUser) return;

    const { data: notifs, error } = await supabase
      .from('notifications')
      .select(
        `
        notification_id,
        title,
        message,
        created_at
      `,
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all notifications:', error);
      return;
    }

    setAllNotifications(notifs);
  };

  const deleteNotification = async (notificationId: number) => {
    if (!currentUser) return;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('notification_id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      return;
    }

    setAllNotifications((prev) => prev.filter((n) => n.notification_id !== notificationId));
    toast('Notification deleted', { duration: 2000 });
    await fetchAllNotifications(); // for overlay
    await fetchUnreadNotifications(); // for small dropdown
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

          if (notif.notification_targets?.some((t: any) => t.target_role === 'admin')) {
            setNotifications((prev) => [{ ...notif, read: false }, ...prev].slice(0, 5));
          }
        },
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
        prev.map((n) => (n.notification_id === notificationId ? { ...n, read: true } : n)),
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
    toast('Notification marked as read', { duration: 2000 });
    await fetchAllNotifications(); // for overlay
    await fetchUnreadNotifications(); // for small dropdown
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
      className="dashboard-page"
      style={{
        backgroundColor: '#1E1E1E',
        minHeight: '100vh',
        width: 'calc(100% - 280px)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        marginLeft: '280px',
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
          flexShrink: 0, // Prevent header from shrinking
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
              <Bell size={22} color="#aaa" />
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
                  <>
                    {notifications.map((n) => (
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
                    ))}
                    <div
                      style={{
                        padding: '10px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        color: '#D8FF3E',
                        fontSize: '13px',
                      }}
                      onClick={() => {
                        setShowNotifications(false);
                        setShowOverlay(true);
                        fetchAllNotifications();
                      }}
                    >
                      View all notifications
                    </div>
                  </>
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

      {/* Overlay for All Notifications */}
      {showOverlay && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onClick={() => setShowOverlay(false)}
        >
          <div
            style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              padding: '20px',
              width: '500px',
              maxHeight: '80%',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: 'white', marginBottom: '10px' }}>All Notifications</h2>
            <div
              style={{
                overflowY: 'auto',
                flex: 1,
                paddingRight: '8px',
              }}
            >
              {allNotifications.length === 0 ? (
                <p style={{ color: '#aaa' }}>No notifications found.</p>
              ) : (
                allNotifications.map((n) => (
                  <div
                    key={n.notification_id}
                    style={{
                      backgroundColor: '#333',
                      padding: '10px',
                      marginBottom: '8px',
                      borderRadius: '4px',
                    }}
                  >
                    <strong>{n.title}</strong>
                    <p style={{ fontSize: '12px', color: '#ccc' }}>{n.message}</p>
                    <button
                      onClick={() => deleteNotification(n.notification_id)}
                      style={{
                        backgroundColor: 'red',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        marginTop: '6px',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calendar and Table Section - FIXED */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#1e1e1e',
          padding: '0 20px 20px',
          overflow: 'auto',
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <WeeklyCalendar events={events} onSelectEvent={handleEventClick} loading={loading} />
        </div>

        <div style={{ marginTop: '16px', flexShrink: 0 }}>
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
