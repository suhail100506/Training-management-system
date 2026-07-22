import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { toast, ToastContainer } from 'react-toastify';
import DatePicker from 'react-datepicker';
import { Calendar, User, Search, RefreshCw, AlertCircle, Save, ArrowLeft } from 'lucide-react';

import * as trainingApi from '../../api/training.api';
import * as staffApi from '../../api/staff.api';
import * as masterApi from '../../api/master.api';
import { useDebounce } from '../../hooks/useDebounce';
import { trainingRecordSchema } from '../../utils/validators';
import { formatInputDate, formatDate } from '../../utils/formatters';
import { TRAINING_TYPE_OPTIONS, TRAINING_MODE_OPTIONS, TRAINING_STATUS_OPTIONS } from '../../utils/constants';

import PageTitle from '../../components/common/PageTitle';

import 'react-datepicker/dist/react-datepicker.css';
import 'react-toastify/dist/ReactToastify.css';

const TrainingAddPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [duplicateBanner, setDuplicateBanner] = useState(false);
  const [trainingTypes, setTrainingTypes] = useState(TRAINING_TYPE_OPTIONS.map(o => ({ value: o.value, _id: o.value })));
  const [groups, setGroups] = useState([]);

  // Load dropdown data on mount
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [typesRes, groupsRes] = await Promise.all([
          masterApi.getMasterData('typeOfTraining'),
          masterApi.getMasterData('groupName')
        ]);
        if (typesRes.data.data && typesRes.data.data.length > 0) {
          setTrainingTypes(typesRes.data.data);
        }
        if (groupsRes.data.data && groupsRes.data.data.length > 0) {
          setGroups(groupsRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load dropdown master values:', err);
        toast.error('Failed to load dynamic selector options.');
      }
    };
    fetchDropdownData();
  }, []);

  // Staff Autocomplete Lookups
  const [searchVal, setSearchVal] = useState('');
  const debouncedSearch = useDebounce(searchVal, 350);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Selected Staff Details Cache
  const [staffProfile, setStaffProfile] = useState(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(trainingRecordSchema),
    defaultValues: {
      trainingCostPerPerson: 0
    }
  });

  const watchStaffNumber = watch('staffNumber');
  const watchStartDate = watch('startDateOfTraining');
  const watchEndDate = watch('endDateOfTraining');
  const watchModule = watch('trainingModuleNumber');
  const watchProcessedDate = watch('requestProcessedDate');

  // Trigger search on debounced text update
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearch || debouncedSearch.trim() === '') {
        setSuggestions([]);
        return;
      }
      try {
        const response = await staffApi.searchStaff(debouncedSearch);
        setSuggestions(response.data.data);
      } catch (err) {
        console.error('Failed to query staff autocomplete:', err);
      }
    };
    performSearch();
  }, [debouncedSearch]);

  const selectStaff = (staff) => {
    setStaffProfile(staff);
    setValue('staffNumber', staff.staffNumber, { shouldValidate: true });
    setValue('groupName', staff.groupName || '', { shouldValidate: true });
    setSearchVal(`${staff.staffNumber} - ${staff.staffName}`);
    setShowSuggestions(false);
    toast.success(`Staff ${staff.staffNumber} selected.`);
  };

  // Dry-run duplicate check
  const runDuplicateCheck = async (staffNum, modNum, startD) => {
    if (!staffNum || !modNum || !startD) return false;
    try {
      const formattedDate = formatInputDate(startD);
      const checkRes = await trainingApi.checkDuplicate({
        staffNumber: staffNum,
        trainingModuleNumber: modNum,
        startDateOfTraining: formattedDate
      });
      return checkRes.data.data.isDuplicate;
    } catch (err) {
      console.error('Failed duplicate check:', err);
      return false;
    }
  };

  const handleFormSubmit = async (data, addAnother = false) => {
    setLoading(true);
    setDuplicateBanner(false);

    try {
      // 1. Perform pre-submit duplicate check
      const isDuplicate = await runDuplicateCheck(
        data.staffNumber,
        data.trainingModuleNumber,
        data.startDateOfTraining
      );

      if (isDuplicate) {
        setDuplicateBanner(true);
        toast.error('A record for this Staff + Module + Start Date already exists. Please verify.');
        setLoading(false);
        return;
      }

      // 2. Submit record
      await trainingApi.createTrainingRecord({
        ...data,
        startDateOfTraining: formatInputDate(data.startDateOfTraining),
        endDateOfTraining: formatInputDate(data.endDateOfTraining),
        requestProcessedDate: formatInputDate(data.requestProcessedDate),
        paymentDate: formatInputDate(data.paymentDate),
      });

      toast.success('Training record created successfully.');
      
      if (addAnother) {
        // Reset form except staff profile cache to allow quick entries for same staff
        reset({
          staffNumber: data.staffNumber,
          groupName: data.groupName,
          trainingTopic: '',
          trainingModuleNumber: '',
          trainerName: '',
          trainingInstituteName: '',
          typeOfTraining: '',
          trainingMode: '',
          trainingDurationHours: '',
          startDateOfTraining: '',
          endDateOfTraining: '',
          requestProcessedDate: '',
          paymentDate: '',
          trainingStatus: '',
          trainingCostPerPerson: 0,
          remarks: ''
        });
      } else {
        setTimeout(() => {
          navigate('/training');
        }, 1500);
      }
    } catch (err) {
      console.error('Save failed:', err);
      const errMsg = err.response?.data?.message || 'Failed to create training record. Try again.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate('/training')}
          className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </button>
        <PageTitle title="Add Training Record" subtitle="Create a new employee training entry" />
      </div>

      {/* Duplicate warning banner */}
      {duplicateBanner && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl flex items-start space-x-3 text-red-800 dark:text-red-400 animate-bounce">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold">Duplicate Entry Detected</h4>
            <p className="text-xs mt-1">A record for this Staff + Module + Start Date already exists. Please verify the module code or select another date. Overwriting existing entries is disabled.</p>
          </div>
        </div>
      )}

      {/* Main Grid: Staff Info Card on Left, Training Form on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Section A: Staff Information (Left Card) */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <User className="w-4 h-4 text-brand-700" />
            <span>Staff Information</span>
          </h3>
          
          {/* Autocomplete Input Search */}
          <div className="space-y-1 relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Search Staff Member*</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Type Staff # or Name..."
                value={searchVal}
                onChange={(e) => {
                  setSearchVal(e.target.value);
                  setShowSuggestions(true);
                  if (e.target.value === '') {
                    setStaffProfile(null);
                    setValue('staffNumber', '');
                  }
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white"
              />
            </div>
            {errors.staffNumber && (
              <p className="text-[10px] text-red-500 font-semibold">{errors.staffNumber.message}</p>
            )}

            {/* Floating Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl mt-1.5 shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
                {suggestions.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => selectStaff(s)}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-850/50 text-xs text-slate-700 dark:text-slate-300 flex flex-col"
                  >
                    <span className="font-bold text-slate-900 dark:text-white">{s.staffNumber} - {s.staffName}</span>
                    <span className="text-[10px] text-slate-400">{s.designation} | {s.groupName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Read Only Details */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-850 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Staff Name</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{staffProfile?.staffName || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Email ID</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{staffProfile?.emailId || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Designation</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{staffProfile?.designation || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Group Name</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{staffProfile?.groupName || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Division</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{staffProfile?.productDivisionCategory || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Reporting Manager</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{staffProfile?.reportingGLManagerName || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Employment Status</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{staffProfile?.employmentStatus || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Date of Joining</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{staffProfile?.dateOfJoining ? formatDate(staffProfile.dateOfJoining) : '—'}</p>
              </div>
            </div>
            
            <div>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Superannuation Date</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{staffProfile?.superannuationDate ? formatDate(staffProfile.superannuationDate) : '—'}</p>
            </div>
          </div>
        </div>

        {/* Section B: Training Information (Right Grid Form) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit(data => handleFormSubmit(data, false))} className="space-y-6">
            
            {/* Form Fields: 2-column layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Row 1: Topic and Module */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Training Topic*</label>
                <input
                  type="text"
                  placeholder="e.g. Docker Fundamentals"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                    errors.trainingTopic ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                  }`}
                  {...register('trainingTopic')}
                />
                {errors.trainingTopic && <p className="text-[10px] text-red-500 font-semibold">{errors.trainingTopic.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Training Module Number*</label>
                <input
                  type="text"
                  placeholder="e.g. MOD-DKR-303"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                    errors.trainingModuleNumber ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                  }`}
                  {...register('trainingModuleNumber')}
                />
                {errors.trainingModuleNumber && <p className="text-[10px] text-red-500 font-semibold">{errors.trainingModuleNumber.message}</p>}
              </div>

              {/* Row 2: Trainer and Institute */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Trainer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white"
                  {...register('trainerName')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Training Institute Name</label>
                <input
                  type="text"
                  placeholder="e.g. TMS IT Solutions"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white"
                  {...register('trainingInstituteName')}
                />
              </div>

              {/* Group Name (Editable dropdown) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Group Name</label>
                <select
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                    errors.groupName ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                  }`}
                  {...register('groupName')}
                >
                  <option value="">Select Group</option>
                  {groups.map(g => <option key={g._id} value={g.value}>{g.value}</option>)}
                </select>
                {errors.groupName && <p className="text-[10px] text-red-500 font-semibold">{errors.groupName.message}</p>}
              </div>

              {/* Row 3: Type and Mode */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Type of Training*</label>
                <select
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                    errors.typeOfTraining ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                  }`}
                  {...register('typeOfTraining')}
                >
                  <option value="">Select Type</option>
                  {trainingTypes.map(o => <option key={o._id} value={o.value}>{o.value}</option>)}
                </select>
                {errors.typeOfTraining && <p className="text-[10px] text-red-500 font-semibold">{errors.typeOfTraining.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Training Mode*</label>
                <select
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                    errors.trainingMode ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                  }`}
                  {...register('trainingMode')}
                >
                  <option value="">Select Mode</option>
                  {TRAINING_MODE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {errors.trainingMode && <p className="text-[10px] text-red-500 font-semibold">{errors.trainingMode.message}</p>}
              </div>

              {/* Row 4: Duration and Start Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Duration in Hours*</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="e.g. 15.5"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                    errors.trainingDurationHours ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                  }`}
                  {...register('trainingDurationHours')}
                />
                {errors.trainingDurationHours && <p className="text-[10px] text-red-500 font-semibold">{errors.trainingDurationHours.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Start Date of Training*</label>
                <div className="relative">
                  <Controller
                    control={control}
                    name="startDateOfTraining"
                    render={({ field }) => (
                      <DatePicker
                        placeholderText="Select Start Date"
                        selected={field.value}
                        onChange={(val) => {
                          field.onChange(val);
                          // Clean requestProcessedDate if it falls before new start date
                          if (watchProcessedDate && val && new Date(watchProcessedDate) < new Date(val)) {
                            setValue('requestProcessedDate', null);
                          }
                        }}
                        dateFormat="dd/MM/yyyy"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        className={`w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                          errors.startDateOfTraining ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                        }`}
                      />
                    )}
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
                {errors.startDateOfTraining && <p className="text-[10px] text-red-500 font-semibold">{errors.startDateOfTraining.message}</p>}
              </div>

              {/* Row 5: End Date and Request Processed Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">End Date of Training*</label>
                <div className="relative">
                  <Controller
                    control={control}
                    name="endDateOfTraining"
                    render={({ field }) => (
                      <DatePicker
                        placeholderText="Select End Date"
                        selected={field.value}
                        onChange={(val) => field.onChange(val)}
                        dateFormat="dd/MM/yyyy"
                        minDate={watchStartDate}
                        disabled={!watchStartDate}
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        className={`w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                          errors.endDateOfTraining ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                        }`}
                      />
                    )}
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
                {errors.endDateOfTraining && <p className="text-[10px] text-red-500 font-semibold">{errors.endDateOfTraining.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center">
                  <span>Request Processed Date</span>
                </label>
                <div className="relative">
                  <Controller
                    control={control}
                    name="requestProcessedDate"
                    render={({ field }) => (
                      <DatePicker
                        placeholderText="Select Processed Date"
                        selected={field.value}
                        onChange={(val) => field.onChange(val)}
                        dateFormat="dd/MM/yyyy"
                        minDate={watchStartDate}
                        disabled={!watchStartDate}
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        className={`w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                          errors.requestProcessedDate ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                        }`}
                      />
                    )}
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
                <span className="text-[9px] text-slate-400 italic block mt-0.5">Date when training request was processed/approved</span>
                {errors.requestProcessedDate && <p className="text-[10px] text-red-500 font-semibold">{errors.requestProcessedDate.message}</p>}
              </div>

              {/* Row 6: Training Status and Cost */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Training Status*</label>
                <select
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                    errors.trainingStatus ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                  }`}
                  {...register('trainingStatus')}
                >
                  <option value="">Select Status</option>
                  {TRAINING_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {errors.trainingStatus && <p className="text-[10px] text-red-500 font-semibold">{errors.trainingStatus.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Training Cost per Person (₹)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                    errors.trainingCostPerPerson ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                  }`}
                  {...register('trainingCostPerPerson')}
                />
                {errors.trainingCostPerPerson && <p className="text-[10px] text-red-500 font-semibold">{errors.trainingCostPerPerson.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Payment Date (Optional)</label>
                <div className="relative">
                  <Controller
                    control={control}
                    name="paymentDate"
                    render={({ field }) => (
                      <DatePicker
                        placeholderText="Select Payment Date"
                        selected={field.value}
                        onChange={(val) => field.onChange(val)}
                        dateFormat="dd/MM/yyyy"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        className={`w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                          errors.paymentDate ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                        }`}
                      />
                    )}
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
                {errors.paymentDate && <p className="text-[10px] text-red-500 font-semibold">{errors.paymentDate.message}</p>}
              </div>
 
              {/* Remarks (Optional) - Full Width */}
              <div className="space-y-1 col-span-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Remarks (Optional)</label>
                <textarea
                  placeholder="Enter any additional details or notes about this training record..."
                  rows="3"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                    errors.remarks ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                  }`}
                  {...register('remarks')}
                />
                {errors.remarks && <p className="text-[10px] text-red-500 font-semibold">{errors.remarks.message}</p>}
              </div>

            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-100 dark:border-slate-850">
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmit(data => handleFormSubmit(data, true))}
                className="px-4 py-2.5 border border-brand-700 text-brand-700 dark:border-brand-500 dark:text-brand-400 font-bold rounded-xl text-xs hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-all duration-200"
              >
                Save & Add Another
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 disabled:bg-brand-400 text-white font-bold rounded-xl text-xs transition-all duration-200 flex items-center space-x-1.5 shadow-md shadow-brand-750/20"
              >
                {loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Record</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

      </div>

      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
};

export default TrainingAddPage;
