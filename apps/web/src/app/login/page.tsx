'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import './login.css';
import Image from 'next/image';
import axios from 'axios';

export default function LoginPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      console.log(API_URL);
      const response = await axios.post(
        `${API_URL}/login`,
        { email, password },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
      localStorage.setItem('authToken', response.data.token);
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
        document.cookie = `refreshToken=${response.data.refreshToken}; path=/; max-age=${60 * 60 * 24 * 30}; secure; samesite=strict`;
      }
      document.cookie = `authToken=${response.data.token}; path=/; max-age=3600; secure; samesite=strict`;
      router.push('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo">
          <Image src="/trainwiselogo.svg" alt="Logo" width={354} height={81} priority />
        </div>
        <div className="login-header">
          <h1>Management Dashboard</h1>
          <h3>Sign in to your account</h3>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
