import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { toast, ToastContainer } from 'react-toastify';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { loginSchema } from '../../utils/validators';
import useAuth from '../../hooks/useAuth';
import cdotLogo from '../../assets/CDOT_logo.gif';

import 'react-toastify/dist/ReactToastify.css';

const LoginPage = () => {
  const { login, user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (token && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, user, navigate]);

  // Check if redirected due to session expiration
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === 'true') {
      toast.warning('Your session has expired. Please login again.');
    }
  }, [location]);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(loginSchema)
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const loggedUser = await login(data.email, data.password);
      toast.success('Welcome back!');
      
      // Force change password on first login (with default password)
      if (loggedUser.mustChangePassword) {
        toast.info('Please change your password before proceeding.');
        navigate('/change-password', { replace: true });
      } else {
        const origin = location.state?.from?.pathname || '/dashboard';
        navigate(origin, { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
      const errMsg = err.response?.data?.message || 'Invalid email or password. Please try again.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 bg-cover bg-center px-4 relative">
      {/* Absolute Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand-700/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
      
      <div className="max-w-md w-full z-10">
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/20 space-y-6">
          
          {/* Logo and Brand Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-2.5 bg-white rounded-2xl shadow-md border border-slate-250/20">
              <img src={cdotLogo} alt="CDOT Logo" className="w-12 h-12 object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {localStorage.getItem('tms_systemName') || 'CDOT Training System'}
            </h2>
            <p className="text-sm text-slate-500">Sign in to manage training records</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  placeholder="name@kmg.com"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 text-slate-900 placeholder-slate-400 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 ${
                    errors.email ? 'border-red-500 focus:ring-red-400' : 'border-slate-200'
                  }`}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 text-slate-900 placeholder-slate-400 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 ${
                    errors.password ? 'border-red-500 focus:ring-red-400' : 'border-slate-200'
                  }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Action Trigger Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-700 hover:bg-brand-800 disabled:bg-brand-400 text-white font-semibold rounded-xl shadow-lg shadow-brand-700/20 hover:shadow-brand-700/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
};

export default LoginPage;
