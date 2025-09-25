// apps/mobile/src/hooks/useLeaderboardHype.ts
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LbRow } from './useLeaderboardRealtime'; // <-- use the real row type

const UP_TEMPLATES = [
  (rank: number) => (rank === 1 ? 'NEW #1! 🔥' : `Up to #${rank}!`),
  (rank: number) => (rank === 1 ? 'You’re leading! 🚀' : `Climbed to #${rank}!`),
  (rank: number) => (rank === 1 ? 'Top spot! 🏅' : `Nice push — #${rank}!`),
];
const DOWN_TEMPLATES = [
  (rank: number) => `Now #${rank} — keep pushing!`,
  (rank: number) => `Dropped to #${rank} — you got this!`,
  (rank: number) => `#${rank}. Next rep takes you up.`,
];
const TOP3_TEMPLATES = [() => 'Top 3! 💪', () => 'On the podium! 🥉', () => 'In the medals! 🏅'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function useLeaderboardHype(
  lb: LbRow[],
  myUserId?: number | string,
  optedOut?: boolean
) {
  const [text, setText] = useState('');
  const [show, setShow] = useState(false);
  const lastShownAtRef = useRef(0);
  const prevRankRef = useRef<number | null>(null);

  // Compute my rank from the full leaderboard (don't slice)
  const myRank = useMemo(() => {
    if (!myUserId) return null;
    const idx = lb.findIndex((r) => String(r.user_id) === String(myUserId));
    return idx >= 0 ? idx + 1 : null;
  }, [lb, myUserId]);

  // Debug logging
  useEffect(() => {
    console.log('🔍 HypeToast Debug:', {
      lbLength: lb.length,
      myUserId,
      myRank,
      optedOut,
      show,
      text,
      lbUsers: lb.slice(0, 3).map(r => ({ id: r.user_id, name: r.first_name || r.last_name || r.name }))
    });
  }, [lb, myUserId, myRank, optedOut, show, text]);

  useEffect(() => {
    if (optedOut) return;
    if (myRank == null) return;

    const prev = prevRankRef.current;
    prevRankRef.current = myRank;

    // throttle hype (>= 1.8s)
    const now = Date.now();
    if (now - lastShownAtRef.current < 1800) return;

    let msg = '';
    if (prev == null) {
      // first known rank: only hype if Top 3
      if (myRank <= 3) msg = pick(TOP3_TEMPLATES)();
    } else if (myRank < prev) {
      msg = pick(UP_TEMPLATES)(myRank);
    } else if (myRank > prev) {
      msg = pick(DOWN_TEMPLATES)(myRank);
    } else {
      // unchanged — occasionally hype Top 3
      if (myRank <= 3 && Math.random() < 0.12) msg = pick(TOP3_TEMPLATES)();
    }

    // DEBUG: Force a test message if we have a rank but no message
    if (!msg && myRank && lb.length > 0) {
      console.log('🔍 DEBUG: Forcing test toast for rank', myRank);
      msg = `Test toast - Rank #${myRank}`;
    }

    if (msg) {
      console.log('🔍 HypeToast triggering with message:', msg);
      lastShownAtRef.current = now;
      setText(msg);
      setShow(true);
      const id = setTimeout(() => setShow(false), 1700);
      return () => clearTimeout(id);
    }
  }, [myRank, optedOut, lb.length]);

  return { text, show };
}
