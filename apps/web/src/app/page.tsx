'use client';
import { useRouter } from "next/navigation";
import { useState } from "react";
import "./login.css"

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    //request sent here
    router.push('/dashboard'); //if successful
  };
  return (
    <div className="login-container">
    <div className="login-card">
        <div className="logo">

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
