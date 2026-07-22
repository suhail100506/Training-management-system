import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { toast, ToastContainer } from 'react-toastify';
import DatePicker from 'react-datepicker';
import { Calendar, Save, ArrowLeft, RefreshCw } from 'lucide-react';

import * as staffApi from '../../api/staff.api';
import * as masterApi from '../../api/master.api';
import { staffSchema } from '../../utils/validators';
import { EMPLOYMENT_STATUS_OPTIONS } from '../../utils/constants';

import PageTitle from '../../components/common/PageTitle';

import 'react-datepicker/dist/react-datepicker.css';
import 'react-toastify/dist/ReactToastify.css';

const StaffAddPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Dropdown Caches
  const [designations, setDesignations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [divisions, setDivisions] = useState([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(staffSchema),
    defaultValues: {
      employmentStatus: 'Currently Serving'
    }
  });

  // Load master data dropdowns on mount
  useEffect(() => {
    const fetchMasterOptions = async () => {
      try {
        const [dRes, gRes, divRes] = await Promise.all([
          masterApi.getMasterData('designation'),
          masterApi.getMasterData('groupName'),
          masterApi.getMasterData('productDivision')
        ]);
        setDesignations(dRes.data.data);
        setGroups(gRes.data.data);
        setDivisions(divRes.data.data);
      } catch (err) {
        console.error('Failed to load master dropdown choices:', err);
        toast.error('Failed to load dynamic dropdown categories.');
      }
    };
    fetchMasterOptions();
  }, []);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await staffApi.createStaff({
        ...data,
        dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining).toISOString().split('T')[0] : null,
        superannuationDate: data.superannuationDate ? new Date(data.superannuationDate).toISOString().split('T')[0] : null
      });

      toast.success('Staff member registered successfully!');
      setTimeout(() => {
        navigate('/staff');
      }, 1500);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Failed to register staff profile. Try again.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate('/staff')}
          className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </button>
        <PageTitle title="Register Staff Member" subtitle="Create a new profile in the Staff Master list" />
      </div>

      <div className="max-w-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            
            {/* Staff Number */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Staff Number*</label>
              <input
                type="text"
                placeholder="e.g. S10008"
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                  errors.staffNumber ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                }`}
                {...register('staffNumber')}
              />
              {errors.staffNumber && <p className="text-[10px] text-red-500 font-semibold">{errors.staffNumber.message}</p>}
            </div>

            {/* Staff Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Staff Name*</label>
              <input
                type="text"
                placeholder="e.g. Alice Cooper"
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                  errors.staffName ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                }`}
                {...register('staffName')}
              />
              {errors.staffName && <p className="text-[10px] text-red-500 font-semibold">{errors.staffName.message}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Email ID</label>
              <input
                type="email"
                placeholder="e.g. alice.cooper@tms.com"
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                  errors.emailId ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                }`}
                {...register('emailId')}
              />
              {errors.emailId && <p className="text-[10px] text-red-500 font-semibold">{errors.emailId.message}</p>}
            </div>

            {/* Designation */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Designation</label>
              <select
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white"
                {...register('designation')}
              >
                <option value="">Select Designation</option>
                {designations.map(d => <option key={d._id} value={d.value}>{d.value}</option>)}
              </select>
            </div>

            {/* Group Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Group Name</label>
              <select
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white"
                {...register('groupName')}
              >
                <option value="">Select Group</option>
                {groups.map(g => <option key={g._id} value={g.value}>{g.value}</option>)}
              </select>
            </div>

            {/* Product Division Category */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Product Division Category</label>
              <select
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white"
                {...register('productDivisionCategory')}
              >
                <option value="">Select Product Division</option>
                {divisions.map(d => <option key={d._id} value={d.value}>{d.value}</option>)}
              </select>
            </div>

            {/* Reporting Manager Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Reporting Manager (GL)</label>
              <input
                type="text"
                placeholder="e.g. Richard Hendricks"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none dark:text-white"
                {...register('reportingGLManagerName')}
              />
            </div>

            {/* Employment Status */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Employment Status*</label>
              <select
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                  errors.employmentStatus ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                }`}
                {...register('employmentStatus')}
              >
                {EMPLOYMENT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {errors.employmentStatus && <p className="text-[10px] text-red-500 font-semibold">{errors.employmentStatus.message}</p>}
            </div>

            {/* Date of Joining */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Date of Joining</label>
              <div className="relative">
                <Controller
                  control={control}
                  name="dateOfJoining"
                  render={({ field }) => (
                    <DatePicker
                      placeholderText="Select Date of Joining"
                      selected={field.value}
                      onChange={(val) => field.onChange(val)}
                      dateFormat="dd/MM/yyyy"
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none dark:text-white"
                    />
                  )}
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
              {errors.dateOfJoining && <p className="text-[10px] text-red-500 font-semibold">{errors.dateOfJoining.message}</p>}
            </div>

            {/* Superannuation Date */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Superannuation Date</label>
              <div className="relative">
                <Controller
                  control={control}
                  name="superannuationDate"
                  render={({ field }) => (
                    <DatePicker
                      placeholderText="Select Superannuation Date"
                      selected={field.value}
                      onChange={(val) => field.onChange(val)}
                      dateFormat="dd/MM/yyyy"
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none dark:text-white"
                    />
                  )}
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
              {errors.superannuationDate && <p className="text-[10px] text-red-500 font-semibold">{errors.superannuationDate.message}</p>}
            </div>

          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-100 dark:border-slate-850">
            <button
              type="button"
              disabled={loading}
              onClick={() => navigate('/staff')}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-850/40 transition-all"
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
                  <span>Register Staff</span>
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

export default StaffAddPage;
