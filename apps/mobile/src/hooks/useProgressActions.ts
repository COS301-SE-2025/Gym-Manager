import axios from 'axios';
import config from '../config';
import { getToken } from '../utils/authStorage';

export function useProgressActions(classId: number) {
  async function advance(direction: 'next'|'prev' = 'next') {
    const token = await getToken();
    await axios.post(`${config.BASE_URL}/live/${classId}/advance`, { direction }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
  async function submitPartial(reps: number) {
    const token = await getToken();
    await axios.post(`${config.BASE_URL}/live/${classId}/partial`, { reps }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
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
