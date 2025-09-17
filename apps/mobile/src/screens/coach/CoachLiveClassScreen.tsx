import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, TextInput, Modal } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useSession } from '../../hooks/useSession';
import { useLeaderboardRealtime } from '../../hooks/useLeaderboardRealtime';
import axios from 'axios';
import { getToken } from '../../utils/authStorage';
import config from '../../config';

type R = RouteProp<AuthStackParamList, 'CoachLive'>;

async function call(path: string) {
  const token = await getToken();
  await axios.post(`${config.BASE_URL}${path}`, {}, { headers: { Authorization: `Bearer ${token}` }});
}

async function callAuthed(path: string, body: any = {}) {
  const token = await getToken();
  return axios.post(`${config.BASE_URL}${path}`, body, { headers: { Authorization: `Bearer ${token}` } });
}

export default function CoachScreen() {
  const { params } = useRoute<R>();
  const classId = params.classId as number;

  const session = useSession(classId);
  const lb = useLeaderboardRealtime(classId);

  const type = (session?.workout_type ?? '').toUpperCase();
  const allFinished = useMemo(() => {
    if (type === 'FOR_TIME') {
      return lb.length > 0 && lb.every((r:any) => !!r.finished);
    }
    return false;
  }, [lb, type]);

  // ----------------------
  // Coach notes
  // ----------------------
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const token = await getToken();
        const r = await axios.get(`${config.BASE_URL}/coach/live/${classId}/note`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!stop) setNote(r.data?.note ?? '');
      } catch {}
    })();
    return () => { stop = true; };
  }, [classId]);

  const saveNote = async () => {
    setSaving(true);
    try {
      await callAuthed(`/coach/live/${classId}/note`, { note });
    } finally {
      setSaving(false);
    }
  };

  // ----------------------
  // Edit modal (type-aware)
  // ----------------------
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState<{
    // FOR_TIME
    ftFinished?: boolean;
    ftMM?: string;
    ftSS?: string;
    ftPartialReps?: string;
    // AMRAP
    totalReps?: string;
    // INTERVAL/TABATA
    stepIndex?: string;
    reps?: string;
    // EMOM
    minuteIndex?: string;
    emomSec?: string;
    emomFinished?: boolean;
  }>({});

  const openEdit = (row: any) => {
    setEditUser(row);
    // Pre-fill based on row + type
    if ((session?.workout_type ?? '').toUpperCase() === 'FOR_TIME') {
      if (row.finished) {
        const secs = Math.max(0, Number(row.elapsed_seconds ?? 0));
        const mm = Math.floor(secs / 60);
        const ss = secs % 60;
        setForm({
          ftFinished: true,
          ftMM: String(mm),
          ftSS: String(ss),
          ftPartialReps: '',
        });
      } else {
        setForm({
          ftFinished: false,
          ftMM: '',
          ftSS: '',
          ftPartialReps: row.total_reps != null ? String(row.total_reps) : '',
        });
      }
    } else if ((session?.workout_type ?? '').toUpperCase() === 'AMRAP') {
      setForm({ totalReps: row.total_reps != null ? String(row.total_reps) : '' });
    } else if ((session?.workout_type ?? '').toUpperCase() === 'INTERVAL' || (session?.workout_type ?? '').toUpperCase() === 'TABATA') {
      setForm({ stepIndex: '', reps: '' });
    } else if ((session?.workout_type ?? '').toUpperCase() === 'EMOM') {
      setForm({ minuteIndex: '', emomSec: '', emomFinished: false });
    } else {
      setForm({});
    }
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editUser) return;
    const t = (session?.workout_type ?? '').toUpperCase();
    try {
      if (t === 'FOR_TIME') {
        const finished = !!form.ftFinished;
        if (finished) {
          const mm = Math.max(0, Number(form.ftMM || 0));
          const ss = Math.max(0, Math.min(59, Number(form.ftSS || 0)));
          const totalSec = (mm * 60) + ss;
          await callAuthed(`/coach/live/${classId}/ft/set-finish`, { userId: editUser.user_id, finishSeconds: totalSec });
        } else {
          const partial = Math.max(0, Number(form.ftPartialReps || 0));
          // NEW: coach can set partial reps for athletes who didn't finish
          await callAuthed(`/coach/live/${classId}/ft/set-partial`, { userId: editUser.user_id, partialReps: partial });
        }
      } else if (t === 'AMRAP') {
        const totalReps = Math.max(0, Number(form.totalReps || 0));
        await callAuthed(`/coach/live/${classId}/amrap/set-total`, { userId: editUser.user_id, totalReps });
      } else if (t === 'INTERVAL' || t === 'TABATA') {
        const stepIndex = Math.max(0, Number(form.stepIndex || 0));
        const reps = Math.max(0, Number(form.reps || 0));
        await callAuthed(`/coach/live/${classId}/interval/score`, { userId: editUser.user_id, stepIndex, reps });
      } else if (t === 'EMOM') {
        const minuteIndex = Math.max(0, Number(form.minuteIndex || 0));
        const emomSec = Math.max(0, Math.min(59, Number(form.emomSec || 0)));
        const finished = !!form.emomFinished;
        await callAuthed(`/coach/live/${classId}/emom/mark`, { userId: editUser.user_id, minuteIndex, finished, finishSeconds: emomSec });
      }
      setEditOpen(false);
    } catch {
      setEditOpen(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      <View style={s.pad}>
        <Text style={s.title}>Coach Controls</Text>
        <Text style={s.meta}>Class #{classId}</Text>
        <Text style={s.meta}>Status: {session?.status ?? '—'}</Text>
        <Text style={s.meta}>Type: {session?.workout_type ?? '—'}</Text>

        {/* Coach Notes */}
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
            <Text style={s.btnPrimaryText}>{saving ? 'Saving…' : 'Save Notes'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 12 }} />
        {session?.status !== 'live' && session?.status !== 'paused' ? (
          <TouchableOpacity style={s.btnPrimary} onPress={() => call(`/coach/live/${classId}/start`)}>
            <Text style={s.btnPrimaryText}>Start Workout</Text>
          </TouchableOpacity>
        ) : null}

        {session?.status === 'live' && !allFinished ? (
          <View style={s.row}>
            <TouchableOpacity style={s.btn} onPress={() => call(`/coach/live/${classId}/pause`)}>
              <Text style={s.btnText}>Pause</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnDanger]} onPress={() => call(`/coach/live/${classId}/stop`)}>
              <Text style={s.btnTextAlt}>Stop</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {(session?.status === 'paused' || (session?.status === 'live' && allFinished)) ? (
          <View style={{gap:10}}>
            {session?.status === 'paused' && (
              <TouchableOpacity style={s.btnPrimary} onPress={() => call(`/coach/live/${classId}/resume`)}>
                <Text style={s.btnPrimaryText}>Resume</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.btnPrimary, {backgroundColor:'#ff5c5c'}]} onPress={() => call(`/coach/live/${classId}/stop`)}>
              <Text style={[s.btnPrimaryText, {color:'#fff'}]}>Finish Workout</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ height: 18 }} />
        <Text style={s.section}>Leaderboard</Text>
        <View style={s.lb}>
          {lb.map((r:any,i:number)=>(
            <View key={`${r.user_id}-${i}`} style={s.lbRow}>
              <Text style={s.pos}>{i+1}</Text>
              <Text style={s.user}>
                {(r.first_name || r.last_name) ? `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() : (r.name ?? `User ${r.user_id}`)}
              </Text>
              <Text style={s.score}>
                {r.finished && (type === 'FOR_TIME' || type === 'EMOM')
                  ? fmt(Number(r.elapsed_seconds ?? 0))
                  : `${Number(r.total_reps ?? 0)} reps`}
              </Text>
              <TouchableOpacity style={s.editBtn} onPress={() => openEdit(r)}>
                <Text style={s.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      {/* Edit modal */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={()=>setEditOpen(false)}>
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Edit — {(session?.workout_type ?? '').toUpperCase()}</Text>

            {/* FOR TIME: either finish time OR partial reps */}
            {(type === 'FOR_TIME') && (
              <>
                <TouchableOpacity
                  style={[s.toggle, form.ftFinished ? s.toggleOn : null]}
                  onPress={()=>setForm(f=>({ ...f, ftFinished: !f.ftFinished }))}
                >
                  <Text style={s.toggleText}>{form.ftFinished ? 'Finished ✓' : 'Not finished — set partial reps'}</Text>
                </TouchableOpacity>

                {form.ftFinished ? (
                  <>
                    <Text style={s.modalLabel}>Finish time</Text>
                    <View style={{ flexDirection:'row', gap:8 }}>
                      <TextInput
                        style={s.modalInput}
                        placeholder="mm"
                        keyboardType="numeric"
                        value={form.ftMM ?? ''}
                        onChangeText={v=>setForm(f=>({ ...f, ftMM: v.replace(/[^0-9]/g,'') }))}
                      />
                      <TextInput
                        style={s.modalInput}
                        placeholder="ss"
                        keyboardType="numeric"
                        value={form.ftSS ?? ''}
                        onChangeText={v=>setForm(f=>({ ...f, ftSS: v.replace(/[^0-9]/g,'') }))}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={s.modalLabel}>Partial reps</Text>
                    <TextInput
                      style={s.modalInput}
                      placeholder="0"
                      keyboardType="numeric"
                      value={form.ftPartialReps ?? ''}
                      onChangeText={v=>setForm(f=>({ ...f, ftPartialReps: v.replace(/[^0-9]/g,'') }))}
                    />
                  </>
                )}
              </>
            )}

            {/* AMRAP */}
            {type === 'AMRAP' && (
              <>
                <Text style={s.modalLabel}>Total reps</Text>
                <TextInput
                  style={s.modalInput}
                  placeholder="0"
                  keyboardType="numeric"
                  value={form.totalReps ?? ''}
                  onChangeText={v=>setForm(f=>({ ...f, totalReps: v.replace(/[^0-9]/g,'') }))}
                />
              </>
            )}

            {/* INTERVAL / TABATA */}
            {(type === 'INTERVAL' || type === 'TABATA') && (
              <>
                <Text style={s.modalLabel}>Step index & reps</Text>
                <TextInput
                  style={s.modalInput}
                  placeholder="step index"
                  keyboardType="numeric"
                  value={form.stepIndex ?? ''}
                  onChangeText={v=>setForm(f=>({ ...f, stepIndex: v.replace(/[^0-9]/g,'') }))}
                />
                <TextInput
                  style={s.modalInput}
                  placeholder="reps"
                  keyboardType="numeric"
                  value={form.reps ?? ''}
                  onChangeText={v=>setForm(f=>({ ...f, reps: v.replace(/[^0-9]/g,'') }))}
                />
              </>
            )}

            {/* EMOM */}
            {type === 'EMOM' && (
              <>
                <Text style={s.modalLabel}>Minute index (0-based) & finish seconds</Text>
                <TextInput
                  style={s.modalInput}
                  placeholder="minute index"
                  keyboardType="numeric"
                  value={form.minuteIndex ?? ''}
                  onChangeText={v=>setForm(f=>({ ...f, minuteIndex: v.replace(/[^0-9]/g,'') }))}
                />
                <TextInput
                  style={s.modalInput}
                  placeholder="seconds (0–59)"
                  keyboardType="numeric"
                  value={form.emomSec ?? ''}
                  onChangeText={v=>setForm(f=>({ ...f, emomSec: v.replace(/[^0-9]/g,'') }))}
                />
                <TouchableOpacity
                  style={[s.toggle, form.emomFinished ? s.toggleOn : null]}
                  onPress={()=>setForm(f=>({ ...f, emomFinished: !f.emomFinished }))}
                >
                  <Text style={s.toggleText}>{form.emomFinished ? 'Finished ✓' : 'Mark finished'}</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={{ flexDirection:'row', gap:10, marginTop:12 }}>
              <TouchableOpacity style={[s.btnPrimary, { flex:1 }]} onPress={submitEdit}>
                <Text style={s.btnPrimaryText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { flex:1 }]} onPress={()=>setEditOpen(false)}>
                <Text style={s.btnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function fmt(t: number) {
  const s = Math.max(0, Math.floor(t));
  const m = Math.floor(s/60);
  const ss = s%60;
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

const s = StyleSheet.create({
  root:{ flex:1, backgroundColor:'#101010' },
  pad:{ flex:1, padding:18 },
  title:{ color:'#d8ff3e', fontSize:24, fontWeight:'900' },
  meta:{ color:'#9aa', marginTop:4 },
  section:{ color:'#fff', marginTop:16, fontWeight:'800' },

  btnPrimary:{ backgroundColor:'#d8ff3e', padding:14, borderRadius:10, alignItems:'center' },
  btnPrimaryText:{ color:'#111', fontWeight:'900' },
  row:{ flexDirection:'row', gap:10, marginTop:8 },
  btn:{ flex:1, backgroundColor:'#2a2a2a', padding:14, borderRadius:10, alignItems:'center' },
  btnDanger:{ backgroundColor:'#ff5c5c' },
  btnText:{ color:'#fff', fontWeight:'900' },
  btnTextAlt:{ color:'#fff', fontWeight:'900' },

  lb:{ backgroundColor:'#1a1a1a', borderRadius:10, padding:10, marginTop:8 },
  lbRow:{ flexDirection:'row', alignItems:'center', paddingVertical:4 },
  pos:{ width:24, color:'#d8ff3e', fontWeight:'900' },
  user:{ flex:1, color:'#e1e1e1' },
  score:{ color:'#fff', fontWeight:'800' },

  // Notes UI
  noteCard:{ backgroundColor:'#1a1a1a', borderRadius:10, padding:10, marginTop:8 },
  noteInput:{ minHeight:80, color:'#fff', textAlignVertical:'top' },

  // Edit UI
  editBtn:{ backgroundColor:'#333', borderRadius:8, paddingHorizontal:10, paddingVertical:6, marginLeft:8 },
  editBtnText:{ color:'#fff', fontWeight:'800' },

  modalWrap:{ flex:1, backgroundColor:'rgba(0,0,0,0.65)', alignItems:'center', justifyContent:'center' },
  modalCard:{ backgroundColor:'#151515', borderRadius:14, padding:18, width:'86%' },
  modalTitle:{ color:'#fff', fontWeight:'900', marginBottom:12, fontSize:16, textAlign:'center' },
  modalLabel:{ color:'#bbb', marginTop:6, marginBottom:6 },
  modalInput:{ backgroundColor:'#222', borderRadius:10, color:'#fff', fontSize:18, fontWeight:'800', paddingVertical:8, paddingHorizontal:10 },

  toggle:{ backgroundColor:'#2a2a2a', borderRadius:10, padding:10, alignItems:'center', marginTop:8 },
  toggleOn:{ backgroundColor:'#26531f' },
  toggleText:{ color:'#fff', fontWeight:'800' },
});
