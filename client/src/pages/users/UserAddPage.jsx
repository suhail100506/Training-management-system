import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { toast, ToastContainer } from 'react-toastify';
import { Save, ArrowLeft, RefreshCw, UserCheck, AlertCircle } from 'lucide-react';

import * as userApi from '../../api/user.api';
import * as staffApi from '../../api/staff.api';
import { userSchema } from '../../utils/validators';
import PageTitle from '../../components/common/PageTitle';

import 'react-toastify/dist/ReactToastify.css';

const UserAddPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [staffMatch, setStaffMatch] = useState(null);
  const [checkingStaff, setCheckingStaff] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(userSchema),
    defaultValues: {
      role: 'admin'
    }
  });

  const watchStaffNumber = watch('staffNumber');

  const checkStaffNumber = async () => {
    if (!watchStaffNumber || watchStaffNumber.trim() === '') {
      toast.warning('Please enter a Staff Number first.');
      return;
    }
    setCheckingStaff(true);
    setStaffMatch(null);

    try {
      const response = await staffApi.searchStaff(watchStaffNumber.trim());
      const matches = response.data.data;
      const exactMatch = matches.find(s => s.staffNumber.toUpperCase() === watchStaffNumber.trim().toUpperCase());

      if (exactMatch) {
        setStaffMatch(exactMatch);
        setValue('email', exactMatch.emailId || '');
        toast.success(`Staff matched: ${exactMatch.staffName}`);
      } else {
        toast.error('Staff Number not found in Staff Master Roster.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to verify Staff Number.');
    } finally {
      setCheckingStaff(false);
    }
  };

  const onSubmit = async (data) => {
    if (!staffMatch) {
      toast.error('You must verify the Staff Number against the master roster before registering.');
      return;
    }

    setLoading(true);
    try {
      await userApi.createUser({
        staffNumber: data.staffNumber.trim(),
        email: data.email.trim(),
        role: data.role,
        temporaryPassword: data.temporaryPassword
      });

      toast.success('Admin user account created successfully!');
      setTimeout(() => {
        navigate('/users');
      }, 1500);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Failed to create user account.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate('/users')}
          className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </button>
        <PageTitle title="Register Admin Account" subtitle="Create dashboard privileges for an employee" />
      </div>

      <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          <div className="space-y-4 text-xs">
            
            {/* Staff Number & Verify trigger */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Staff Number*</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="e.g. S10002"
                  className={`flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                    errors.staffNumber ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                  }`}
                  {...register('staffNumber')}
                />
                <button
                  type="button"
                  disabled={checkingStaff}
                  onClick={checkStaffNumber}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 dark:bg-brand-700 dark:hover:bg-brand-800 text-white font-bold rounded-xl flex items-center space-x-1.5 transition-all shadow-sm"
                >
                  {checkingStaff ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  <span>Verify Staff</span>
                </button>
              </div>
              {errors.staffNumber && <p className="text-[10px] text-red-500 font-semibold">{errors.staffNumber.message}</p>}
            </div>

            {/* Matched Staff Details Panel */}
            {staffMatch && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 rounded-xl text-emerald-800 dark:text-emerald-450 space-y-1">
                <p className="font-bold flex items-center space-x-1">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Matched: {staffMatch.staffName}</span>
                </p>
                <p className="text-[10px]">Affiliation: {staffMatch.designation} | {staffMatch.groupName} | {staffMatch.productDivisionCategory}</p>
              </div>
            )}

            {/* User Email */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Account Email Address*</label>
              <input
                type="email"
                placeholder="e.g. employee@tms.com"
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                  errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                }`}
                {...register('email')}
              />
              {errors.email && <p className="text-[10px] text-red-500 font-semibold">{errors.email.message}</p>}
            </div>

            {/* Role dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Administrative Role*</label>
              <select
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                  errors.role ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                }`}
                {...register('role')}
              >
                <option value="admin">Admin (Operational privileges)</option>
                <option value="super_admin">Super Admin (System configuration privileges)</option>
              </select>
              {errors.role && <p className="text-[10px] text-red-500 font-semibold">{errors.role.message}</p>}
            </div>

            {/* Temporary Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Temporary Password*</label>
              <input
                type="password"
                placeholder="Minimum 8 characters with complexity"
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                  errors.temporaryPassword ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                }`}
                {...register('temporaryPassword')}
              />
              <span className="text-[9px] text-slate-450 italic mt-0.5 block">This user will be forced to change this password on their initial login.</span>
              {errors.temporaryPassword && <p className="text-[10px] text-red-500 font-semibold">{errors.temporaryPassword.message}</p>}
            </div>

          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-100 dark:border-slate-850">
            <button
              type="button"
              disabled={loading}
              onClick={() => navigate('/users')}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-850/45 transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 disabled:bg-brand-400 text-white font-bold rounded-xl text-xs transition-all flex items-center space-x-1.5 shadow-md"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Register User</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
};

export default UserAddPage;
