import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import logoImg from '../assets/logo1.png';
import titleImg from '../assets/title.png';
import { apiService } from '../services/api';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const response = await apiService.adminLogin({ email, password });
      if (response.status) {
        // You could store the admin profile somewhere or navigate to an admin dashboard
        navigate('/admin'); 
      } else {
        setError(response.message || 'Login failed.');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setError(err.message || 'An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
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
          <h1 className="login-title">Admin Access</h1>
          <p className="login-subtitle">Secure login for system administrators.</p>
        </div>

        {/* Login Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium mb-4 text-center border border-red-200">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Admin Email</label>
            <input 
              type="email" 
              id="email" 
              placeholder="admin@lyfflow.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              disabled={isLoading}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div className="form-group">
            <div className="label-row">
              <label htmlFor="password">Password</label>
            </div>
            <div className="password-input-wrapper" style={{ position: 'relative', width: '100%' }}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                id="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                disabled={isLoading}
                style={{ width: '100%', paddingRight: '45px', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button type="submit" className="btn-login-submit" disabled={isLoading}>
            {isLoading ? 'Authenticating...' : 'Log In'}
          </button>
        </form>

        {/* Footer Links */}
        <div className="login-footer mt-6">
          <Link to="/" className="text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium">← Back to Main App</Link>
        </div>
      </div>
    </div>
  );
}
