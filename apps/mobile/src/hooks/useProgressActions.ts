import axios from 'axios';
import config from '../config';
import { getToken } from '../utils/authStorage';

export function useProgressActions(classId: number) {
  const advance = async (direction: 'next' | 'prev') => {
    const token = await getToken();
    await axios.post(
      `${config.BASE_URL}/live/${classId}/advance`,
      { direction },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    // Return fresh progress so the screen can update immediately if needed
    const { data } = await axios.get(
      `${config.BASE_URL}/live/${classId}/me`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data as { current_step: number; finished_at: string | null; dnf_partial_reps: number; rounds_completed?: number };
  };

  const submitPartial = async (reps: number) => {
    const token = await getToken();
    await axios.post(
      `${config.BASE_URL}/live/${classId}/partial`,
      { reps },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    // fetch again so leaderboard/progress is in sync
    const { data } = await axios.get(
      `${config.BASE_URL}/live/${classId}/me`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data;
  };

  return { advance, submitPartial };
}

export async function coachStart(classId: number) {
  const token = await getToken();
  await axios.post(`${config.BASE_URL}/coach/live/${classId}/start`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function coachStop(classId: number) {
  const token = await getToken();
  await axios.post(`${config.BASE_URL}/coach/live/${classId}/stop`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
}
