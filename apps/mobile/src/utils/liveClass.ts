import axios from 'axios';
import config from '../config';

export const getLiveClass = async (token: string | null) => {
  if (!token) return null;
  try {
    const res = await axios.get(`${config.BASE_URL}/live/class`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  } catch (err) {
    return null;
  }
};
