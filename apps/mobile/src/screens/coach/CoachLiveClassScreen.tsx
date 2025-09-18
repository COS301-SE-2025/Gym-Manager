// apps/mobile/src/screens/coach/CoachLiveClassScreen.tsx
import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, TextInput, Modal, ScrollView } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
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

export default function CoachLiveClassScreen() {
  const { params } = useRoute<R>();
  const classId = params.classId as number;
  const session = useSession(classId);
  
  const [scope, setScope] = useState<LbFilter>('ALL');
  const lb = useLeaderboardRealtime(classId, scope);


  const type = (session?.workout_type ?? '').toUpperCase();
  const isEnded = (session?.status ?? '') === 'ended';

  // --- Notes (unchanged) ---
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
    try { await call(`/coach/live/${classId}/note`, { note }); }
    finally { setSaving(false); }
  };

  // --- Edit modal (enabled only when ended) ---
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
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
  }>({ ftMode: 'time' });

  const openEdit = (row: any) => {
    if (!isEnded) return; // safety in UI
    setEditUser(row);
    setForm({ ftMode: 'time' });
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
      }
      setEditOpen(false);
    } catch {
      setEditOpen(false);
    }
  };

  // Are all finished? (only meaningful for FT)
  const allFinished = useMemo(() => {
    if (type === 'FOR_TIME') return lb.length > 0 && lb.every((r:any) => !!r.finished);
    return false;
  }, [lb, type]);

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#111" />
      <View style={s.pad}>
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

        {/* RX/SC filter */}
        <View style={{ flexDirection:'row', justifyContent:'flex-start', gap:6, marginBottom:8 }}>
          {(['ALL','RX','SC'] as const).map(opt => (
            <TouchableOpacity
              key={opt}
              onPress={()=>setScope(opt)}
              style={{
                paddingHorizontal:10, paddingVertical:6, borderRadius:999,
                backgroundColor: scope===opt ? '#2e3500' : '#1f1f1f',
                borderWidth:1, borderColor: scope===opt ? '#d8ff3e' : '#2a2a2a'
              }}
            >
              <Text style={{ color: scope===opt ? '#d8ff3e' : '#9aa', fontWeight:'800' }}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.lb}>
          {lb.map((r:any,i:number)=>(
            <View key={`${r.user_id}-${i}`} style={s.lbRow}>
              <Text style={s.pos}>{i+1}</Text>
              <Text style={s.user}>
                {(r.first_name || r.last_name)
                  ? `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim()
                  : (r.name ?? `User ${r.user_id}`)}
                <Text style={{ color:'#9aa' }}> ({(r.scaling ?? 'RX')})</Text>
              </Text>
              <Text style={s.score}>
                {(type === 'FOR_TIME' || type === 'EMOM') && r.finished
                  ? fmt(Number(r.elapsed_seconds ?? 0))
                  : `${Number(r.total_reps ?? 0)} reps`}
              </Text>

              {/* Edit is ONLY available after the workout has ENDED */}
              {isEnded && (
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(r)}>
                  <Text style={s.editBtnText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Edit modal (shows only for ended sessions) */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={()=>setEditOpen(false)}>
        <View style={s.modalWrap}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Edit — {type}</Text>

            {type === 'FOR_TIME' && (
              <>
                <View style={{ flexDirection:'row', gap:8, marginBottom:8 }}>
                  <TouchableOpacity
                    style={[s.toggle, (form.ftMode === 'time') && s.toggleOn]}
                    onPress={()=>setForm(f=>({ ...f, ftMode: 'time' }))}
                  >
                    <Text style={s.toggleText}>Score by Time</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.toggle, (form.ftMode === 'reps') && s.toggleOn]}
                    onPress={()=>setForm(f=>({ ...f, ftMode: 'reps' }))}
                  >
                    <Text style={s.toggleText}>Score by Reps</Text>
                  </TouchableOpacity>
                </View>

                {form.ftMode === 'time' ? (
                  <View style={{ flexDirection:'row', gap:8 }}>
                    <TextInput
                      style={s.modalInput}
                      placeholder="mm"
                      keyboardType="numeric"
                      value={form.mm ?? ''}
                      onChangeText={v=>setForm(f=>({ ...f, mm: v.replace(/[^0-9]/g,'') }))}
                    />
                    <TextInput
                      style={s.modalInput}
                      placeholder="ss"
                      keyboardType="numeric"
                      value={form.ss ?? ''}
                      onChangeText={v=>setForm(f=>({ ...f, ss: v.replace(/[^0-9]/g,'') }))}
                    />
                  </View>
                ) : (
                  <>
                    <Text style={s.modalLabel}>Total reps</Text>
                    <TextInput
                      style={s.modalInput}
                      placeholder="0"
                      keyboardType="numeric"
                      value={form.ftReps ?? ''}
                      onChangeText={v=>setForm(f=>({ ...f, ftReps: v.replace(/[^0-9]/g,'') }))}
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
                  keyboardType="numeric"
                  value={form.amrapReps ?? ''}
                  onChangeText={v=>setForm(f=>({ ...f, amrapReps: v.replace(/[^0-9]/g,'') }))}
                />
              </>
            )}

            {(type === 'INTERVAL' || type === 'TABATA') && (
              <>
                <Text style={s.modalLabel}>Total reps</Text>
                <TextInput
                  style={s.modalInput}
                  placeholder="0"
                  keyboardType="numeric"
                  value={form.intervalReps ?? ''}
                  onChangeText={v=>setForm(f=>({ ...f, intervalReps: v.replace(/[^0-9]/g,'') }))}
                />
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

  // Notes
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

  toggle:{ backgroundColor:'#2a2a2a', borderRadius:10, padding:10, alignItems:'center' },
  toggleOn:{ backgroundColor:'#26531f' },
  toggleText:{ color:'#fff', fontWeight:'800' },
});
