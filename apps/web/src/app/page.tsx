'use client';
import { useRouter } from "next/navigation";
import { useState } from "react";
import "./login.css"
import Image from "next/image";
import axios from 'axios';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  interface LoginResponse {
    token: string;
    user: {
      roles: string[];
    };
  }
  const handleSubmit = async (event: React.FormEvent) => {
  event.preventDefault();

  try {
    const response = await axios.post<LoginResponse>('http://localhost:3000/login', { email, password },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.STATIC_JWT}`
        }
      });

    console.log('Login response:', response.data);

    if (!response.data?.token) {
      console.error('No token received in response');
      return;
    }

    // Store token in localStorage
    localStorage.setItem('authToken', response.data.token);

    // Store user data if available
    if (response.data.user) {
      localStorage.setItem('userData', JSON.stringify(response.data.user));
    }

    // Role-based navigation (only checking for admin)
    if (response.data.user?.roles?.includes('admin')) {
      router.push('/dashboard');
    } else {
      router.push('/'); // Redirect to home or unauthorized page
      // Alternatively, show an error message:
      // alert('You do not have admin privileges');
    }
  } catch (error) {
    console.error('Login error:', error);
    if (axios.isAxiosError(error)) {
      alert('Login failed');
    } else {
      alert('An unexpected error occurred');
    }
  }
};
  return (
    <div className="login-container">
    <div className="login-card">
        <div className="logo">
            <Image src="/trainwiselogo.svg" alt="Logo" width={354} height={81} priority/>
        </div>
        <div className="login-header">
          <h1>Sign in to your account</h1>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" value={email} onChange={(event) => setEmail(event.target.value)} required/>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" value={password} onChange={(event) => setPassword(event.target.value)} required/>
          </div>

          <button type="submit" className="login-button">
            Login
          </button>
        </form>
    </div>
    </div>
  );
}
