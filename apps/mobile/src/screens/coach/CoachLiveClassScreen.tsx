// apps/mobile/src/screens/coach/CoachLiveClassScreen.tsx
import React, { useMemo, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar,
  TouchableOpacity, TextInput, Modal, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSession } from '../../hooks/useSession';
import { LbFilter, useLeaderboardRealtime } from '../../hooks/useLeaderboardRealtime';
import axios from 'axios';
import { getToken } from '../../utils/authStorage';
import config from '../../config';

type R = RouteProp<AuthStackParamList, 'CoachLive'>;

async function call(path: string, body?: any) {
  const token = await getToken();
  return axios.post(`${config.BASE_URL}${path}`, body ?? {}, { headers: { Authorization: `Bearer ${token}` }});
}

function fmt(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export default function CoachLiveClassScreen() {
  const { params } = useRoute<R>();
  const classId = params.classId as number;
  const nav = useNavigation<any>();

  const session = useSession(classId);
  const type = (session?.workout_type ?? '').toUpperCase();
  const isEnded = (session?.status ?? '') === 'ended';

  const [scope, setScope] = useState<LbFilter>('ALL');
  const lb = useLeaderboardRealtime(classId, scope);

  // --- Notes ---
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const token = await getToken();
        const r = await axios.get(`${config.BASE_URL}/coach/live/${classId}/note`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!stop) setNote(r.data?.note ?? '');
      } catch {}
    })();
    return () => { stop = true; };
  }, [classId]);

  const saveNote = async () => {
    setSaving(true);
    try { await call(`/coach/live/${classId}/note`, { note }); }
    finally { setSaving(false); }
  };

  // =========================
  // Edit modal (ended only)
  // =========================
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);

  // EMOM planned minutes (sum of emom_repeats)
  const plannedMinutes = useMemo(() => {
    const reps = (session as any)?.workout_metadata?.emom_repeats;
    if (Array.isArray(reps)) return reps.map((n: any) => Number(n) || 0).reduce((a: number, b: number) => a + b, 0);
    return 0;
  }, [session]);

  // Form state
  const [form, setForm] = useState<{
    // FOR TIME
    ftMode?: 'time' | 'reps';
    mm?: string;
    ss?: string;
    ftReps?: string;
    // AMRAP
    amrapReps?: string;
    // INTERVAL/TABATA
    intervalReps?: string;
    // EMOM
    emomMinute?: number;
    emomFinished?: boolean;
    emomSec?: string; // 0..59
  }>({ ftMode: 'time' });

  const openEdit = (row: any) => {
    if (!isEnded) return;
    setEditUser(row);

    if (type === 'EMOM') {
      setForm({
        emomMinute: 0,
        emomFinished: true,
        emomSec: '0',
      });
    } else if (type === 'FOR_TIME') {
      setForm({ ftMode: 'time', mm: '', ss: '' });
    } else if (type === 'AMRAP') {
      setForm({ amrapReps: '' });
    } else {
      setForm({ intervalReps: '' });
    }

    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editUser || !isEnded) return;

    try {
      if (type === 'FOR_TIME') {
        if (form.ftMode === 'time') {
          const mm = Math.max(0, Number(form.mm || 0));
          const ss = Math.max(0, Math.min(59, Number(form.ss || 0)));
          const finishSeconds = (mm * 60) + ss;
          await call(`/coach/live/${classId}/ft/set-finish`, { userId: editUser.user_id, finishSeconds });
        } else {
          const totalReps = Math.max(0, Number(form.ftReps || 0));
          await call(`/coach/live/${classId}/ft/set-reps`, { userId: editUser.user_id, totalReps });
        }
      } else if (type === 'AMRAP') {
        const totalReps = Math.max(0, Number(form.amrapReps || 0));
        await call(`/coach/live/${classId}/amrap/set-total`, { userId: editUser.user_id, totalReps });
      } else if (type === 'INTERVAL' || type === 'TABATA') {
        const totalReps = Math.max(0, Number(form.intervalReps || 0));
        await call(`/coach/live/${classId}/interval/set-total`, { userId: editUser.user_id, totalReps });
      } else if (type === 'EMOM') {
        const minuteIndex = Math.max(0, Math.min((plannedMinutes || 1) - 1, Number(form.emomMinute || 0)));
        const finished = !!form.emomFinished;
        const finishSeconds = Math.max(0, Math.min(59, Number(form.emomSec || 0)));
        // Coach endpoint (make sure route exists server-side):
        // POST /coach/live/:classId/emom/mark { userId, minuteIndex, finished, finishSeconds }
        await call(`/coach/live/${classId}/emom/mark`, {
          userId: editUser.user_id,
          minuteIndex,
          finished,
          finishSeconds,
        });
      }

      setEditOpen(false);
    } catch {
      setEditOpen(false);
    }
  };

  // All finished? (meaningful for FT)
  const allFinished = useMemo(() => {
    if (type === 'FOR_TIME') return lb.length > 0 && lb.every((r: any) => !!r.finished);
    return false;
  }, [lb, type]);

  const goBackSmart = () => {
    try {
      if (typeof nav.canGoBack === 'function' && nav.canGoBack()) {
        nav.goBack();
        return;
      }
    } catch {}
    // Fallback: attempt a home-like route, otherwise reset stack
    try { nav.navigate('Home'); return; } catch {}
    try { nav.navigate('Root'); return; } catch {}
    nav.popToTop();
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      <ScrollView contentContainerStyle={s.pad}>
        {/* Back button */}
        <TouchableOpacity style={s.backBtn} onPress={goBackSmart} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color="#d8ff3e" />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={s.title}>Coach Controls</Text>
        <Text style={s.meta}>Class #{classId}</Text>
        <Text style={s.meta}>Status: {session?.status ?? '—'}</Text>
        <Text style={s.meta}>Type: {type || '—'}</Text>

        {/* Notes */}
        <Text style={s.section}>Coach Notes</Text>
        <View style={s.noteCard}>
          <TextInput
            multiline
            value={note}
            onChangeText={setNote}
            placeholder="Jot quick notes for this class…"
            placeholderTextColor="#777"
            style={s.noteInput}
          />
          <TouchableOpacity style={[s.btnPrimary, { opacity: saving ? 0.6 : 1 }]} onPress={saveNote} disabled={saving}>
            <Ionicons name="save-outline" size={18} color="#111" />
            <Text style={[s.btnPrimaryText, { marginLeft: 8 }]}>{saving ? 'Saving…' : 'Save Notes'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 12 }} />
        {session?.status !== 'live' && session?.status !== 'paused' ? (
          <TouchableOpacity style={s.btnPrimary} onPress={() => call(`/coach/live/${classId}/start`)}>
            <Ionicons name="play-circle-outline" size={20} color="#111" />
            <Text style={[s.btnPrimaryText, { marginLeft: 8 }]}>Start Workout</Text>
          </TouchableOpacity>
        ) : null}

        {session?.status === 'live' && !allFinished ? (
          <View style={s.row}>
            <TouchableOpacity style={s.btn} onPress={() => call(`/coach/live/${classId}/pause`)}>
              <Ionicons name="pause-circle-outline" size={20} color="#fff" />
              <Text style={[s.btnText, { marginLeft: 6 }]}>Pause</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnDanger]} onPress={() => call(`/coach/live/${classId}/stop`)}>
              <Ionicons name="stop-circle-outline" size={20} color="#fff" />
              <Text style={[s.btnTextAlt, { marginLeft: 6 }]}>Stop</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {(session?.status === 'paused' || (session?.status === 'live' && allFinished)) ? (
          <View style={{ gap: 10, marginTop: 8 }}>
            {session?.status === 'paused' && (
              <TouchableOpacity style={s.btnPrimary} onPress={() => call(`/coach/live/${classId}/resume`)}>
                <Ionicons name="play-forward-outline" size={20} color="#111" />
                <Text style={[s.btnPrimaryText, { marginLeft: 8 }]}>Resume</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.btnPrimary, { backgroundColor: '#ff5c5c' }]} onPress={() => call(`/coach/live/${classId}/stop`)}>
              <Ionicons name="flag-outline" size={20} color="#fff" />
              <Text style={[s.btnPrimaryText, { color: '#fff', marginLeft: 8 }]}>Finish Workout</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ height: 18 }} />
        <Text style={s.section}>Leaderboard</Text>

        {/* RX/SC filter */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', gap: 6, marginBottom: 8 }}>
          {(['ALL', 'RX', 'SC'] as const).map(opt => (
            <TouchableOpacity
              key={opt}
              onPress={() => setScope(opt)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: scope === opt ? '#2e3500' : '#1f1f1f',
                borderWidth: 1,
                borderColor: scope === opt ? '#d8ff3e' : '#2a2a2a',
              }}
            >
              <Ionicons name={opt === 'ALL' ? 'people-outline' : opt === 'RX' ? 'flash-outline' : 'barbell-outline'} size={16} color={scope === opt ? '#d8ff3e' : '#9aa'} />
              <Text style={{ color: scope === opt ? '#d8ff3e' : '#9aa', fontWeight: '800', marginLeft: 6 }}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.lb}>
          {lb.map((r: any, i: number) => {
            const name =
              (r.first_name || r.last_name)
                ? `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim()
                : (r.name ?? `User ${r.user_id}`);
            const right =
              (type === 'FOR_TIME' || type === 'EMOM')
                ? (r.finished ? fmt(Number(r.elapsed_seconds ?? 0)) : '—')
                : `${Number(r.total_reps ?? 0)} reps`;

            return (
              <View key={`${r.user_id}-${i}`} style={s.lbRow}>
                <Text style={s.pos}>{i + 1}</Text>
                <Text style={s.user}>
                  {name} <Text style={{ color: '#9aa' }}>({r.scaling ?? 'RX'})</Text>
                </Text>
                <Text style={s.score}>{right}</Text>

                {/* Clear edit icon (ended only) */}
                {isEnded && (
                  <TouchableOpacity style={s.editIconBtn} onPress={() => openEdit(r)} accessibilityLabel="Edit score">
                    <Ionicons name={type === 'EMOM' ? 'timer-outline' : 'pencil'} size={18} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Edit — {type}</Text>

            {type === 'FOR_TIME' && (
              <>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TouchableOpacity
                    style={[s.toggle, (form.ftMode === 'time') && s.toggleOn]}
                    onPress={() => setForm(f => ({ ...f, ftMode: 'time' }))}
                  >
                    <Ionicons name="time-outline" size={16} color="#fff" />
                    <Text style={[s.toggleText, { marginLeft: 6 }]}>Score by Time</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.toggle, (form.ftMode === 'reps') && s.toggleOn]}
                    onPress={() => setForm(f => ({ ...f, ftMode: 'reps' }))}
                  >
                    <Ionicons name="repeat-outline" size={16} color="#fff" />
                    <Text style={[s.toggleText, { marginLeft: 6 }]}>Score by Reps</Text>
                  </TouchableOpacity>
                </View>

                {form.ftMode === 'time' ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={s.modalInput}
                      placeholder="mm"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                      value={form.mm ?? ''}
                      onChangeText={v => setForm(f => ({ ...f, mm: v.replace(/[^0-9]/g, '') }))}
                    />
                    <TextInput
                      style={s.modalInput}
                      placeholder="ss"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                      value={form.ss ?? ''}
                      onChangeText={v => setForm(f => ({ ...f, ss: v.replace(/[^0-9]/g, '') }))}
                    />
                  </View>
                ) : (
                  <>
                    <Text style={s.modalLabel}>Total reps</Text>
                    <TextInput
                      style={s.modalInput}
                      placeholder="0"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                      value={form.ftReps ?? ''}
                      onChangeText={v => setForm(f => ({ ...f, ftReps: v.replace(/[^0-9]/g, '') }))}
                    />
                  </>
                )}
              </>
            )}

            {type === 'AMRAP' && (
              <>
                <Text style={s.modalLabel}>Total reps</Text>
                <TextInput
                  style={s.modalInput}
                  placeholder="0"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={form.amrapReps ?? ''}
                  onChangeText={v => setForm(f => ({ ...f, amrapReps: v.replace(/[^0-9]/g, '') }))}
                />
              </>
            )}

            {(type === 'INTERVAL' || type === 'TABATA') && (
              <>
                <Text style={s.modalLabel}>Total reps</Text>
                <TextInput
                  style={s.modalInput}
                  placeholder="0"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={form.intervalReps ?? ''}
                  onChangeText={v => setForm(f => ({ ...f, intervalReps: v.replace(/[^0-9]/g, '') }))}
                />
              </>
            )}

            {type === 'EMOM' && (
              <>
                <Text style={s.modalLabel}>Minute</Text>
                <View style={s.pagerRow}>
                  <TouchableOpacity
                    style={s.pagerBtn}
                    onPress={() => setForm(f => ({ ...f, emomMinute: Math.max(0, Number(f.emomMinute ?? 0) - 1) }))}
                  >
                    <Ionicons name="chevron-back" size={20} color="#fff" />
                  </TouchableOpacity>
                  <Text style={s.pagerText}>
                    {(Number(form.emomMinute ?? 0) + 1)} / {Math.max(plannedMinutes, 1)}
                  </Text>
                  <TouchableOpacity
                    style={s.pagerBtn}
                    onPress={() => setForm(f => ({ ...f, emomMinute: Math.min(Math.max(plannedMinutes, 1) - 1, Number(f.emomMinute ?? 0) + 1) }))}
                  >
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 8 }}>
                  <TouchableOpacity
                    style={[s.toggle, form.emomFinished ? s.toggleOn : null]}
                    onPress={() => setForm(f => ({ ...f, emomFinished: !f.emomFinished }))}
                  >
                    <Ionicons name={form.emomFinished ? 'checkmark-circle-outline' : 'close-circle-outline'} size={18} color="#fff" />
                    <Text style={[s.toggleText, { marginLeft: 6 }]}>{form.emomFinished ? 'Finished' : 'Not finished'}</Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="time-outline" size={18} color="#bbb" />
                    <TextInput
                      style={[s.modalInput, { width: 90 }]}
                      placeholder="sec (0-59)"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                      value={form.emomSec ?? ''}
                      onChangeText={(v) => {
                        const cv = v.replace(/[^0-9]/g, '');
                        let n = Number(cv || 0);
                        if (n > 59) n = 59;
                        setForm(f => ({ ...f, emomSec: String(n) }));
                      }}
                    />
                  </View>
                </View>

                <Text style={{ color: '#888', marginTop: 6 }}>
                  Tip: Set “Not finished” to penalize this minute as 60s.
                </Text>
              </>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={[s.btnPrimary, { flex: 1 }]} onPress={submitEdit}>
                <Ionicons name="save-outline" size={18} color="#111" />
                <Text style={[s.btnPrimaryText, { marginLeft: 8 }]}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={() => setEditOpen(false)}>
                <Ionicons name="close-outline" size={20} color="#fff" />
                <Text style={[s.btnText, { marginLeft: 6 }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#101010' },
  pad: { padding: 18, paddingTop: 8 },

  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  backText: { color: '#d8ff3e', fontWeight: '900' },

  title: { color: '#d8ff3e', fontSize: 24, fontWeight: '900' },
  meta: { color: '#9aa', marginTop: 4 },
  section: { color: '#fff', marginTop: 16, fontWeight: '800' },

  btnPrimary: {
    backgroundColor: '#d8ff3e',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  btnPrimaryText: { color: '#111', fontWeight: '900' },

  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  btnDanger: { backgroundColor: '#ff5c5c' },
  btnText: { color: '#fff', fontWeight: '900' },
  btnTextAlt: { color: '#fff', fontWeight: '900' },

  lb: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 10, marginTop: 8 },
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  pos: { width: 24, color: '#d8ff3e', fontWeight: '900' },
  user: { flex: 1, color: '#e1e1e1' },
  score: { color: '#fff', fontWeight: '800' },
  editIconBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#333',
    borderRadius: 8,
    marginLeft: 8,
  },

  // Notes
  noteCard: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 10, marginTop: 8 },
  noteInput: { minHeight: 80, color: '#fff', textAlignVertical: 'top' },

  // Modal
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { backgroundColor: '#151515', borderRadius: 14, padding: 18, width: '86%' },
  modalTitle: { color: '#fff', fontWeight: '900', marginBottom: 12, fontSize: 16, textAlign: 'center' },
  modalLabel: { color: '#bbb', marginTop: 6, marginBottom: 6 },
  modalInput: {
    backgroundColor: '#222',
    borderRadius: 10,
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  toggle: { backgroundColor: '#2a2a2a', borderRadius: 10, padding: 10, alignItems: 'center', flexDirection: 'row' },
  toggleOn: { backgroundColor: '#26531f' },
  toggleText: { color: '#fff', fontWeight: '800' },

  // EMOM pager
  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  pagerBtn: { padding: 8, backgroundColor: '#2a2a2a', borderRadius: 10 },
  pagerText: { color: '#fff', fontWeight: '900' },
});
