import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import logoImg from '../assets/logo1.png';
import titleImg from '../assets/title.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Dummy login logic: redirect to dashboard
    navigate('/dashboard');
  };

  return (
    <div className="login-page-container">
      {/* Background Decorative Shapes */}
      <div className="bg-shape bg-shape-1"></div>
      <div className="bg-shape bg-shape-2"></div>
      <div className="bg-shape bg-shape-3"></div>

      <div className="login-card-wrapper animate-fade-in-up">
        {/* Header / Logo */}
        <div className="login-header">
          <Link to="/" className="login-logo-container">
            <img src={logoImg} alt="LYFFLOW Logo" className="brand-logo-img-login" style={{ height: '50px', width: 'auto' }} />
            <img src={titleImg} alt="LYFFLOW" className="brand-title-img-login" style={{ height: '28px', width: 'auto', marginLeft: '10px' }} />
          </Link>
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Log in to your workspace to continue.</p>
        </div>

        {/* Login Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Work Email</label>
            <input 
              type="email" 
              id="email" 
              placeholder="name@company.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div className="form-group">
            <div className="label-row">
              <label htmlFor="password">Password</label>
              <a href="#" className="forgot-password">Forgot password?</a>
            </div>
            <input 
              type="password" 
              id="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="btn-login-submit">Log In</button>
        </form>

        {/* Footer Links */}
        <div className="login-footer">
          <p>Don't have an account?</p>
          <Link to="/get-started" className="signup-link">Get Started</Link>
        </div>
      </div>
    </div>
  );
}
