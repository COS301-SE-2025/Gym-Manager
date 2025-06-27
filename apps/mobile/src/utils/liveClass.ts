import axios from 'axios';

export const getLiveClass = async (token: string | null) => {
  if (!token) return null;
  try {
    const res = await axios.get('http://localhost:4000/live/class', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  } catch (err) {
    return null;
  }
};
