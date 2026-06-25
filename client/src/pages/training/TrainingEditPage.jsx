import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { toast, ToastContainer } from 'react-toastify';
import DatePicker from 'react-datepicker';
import { Calendar, User, RefreshCw, AlertCircle, Save, ArrowLeft } from 'lucide-react';

import * as trainingApi from '../../api/training.api';
import * as masterApi from '../../api/master.api';
import { trainingRecordSchema } from '../../utils/validators';
import { formatDate, formatInputDate, utcToLocalMidnight } from '../../utils/formatters';
import { TRAINING_TYPE_OPTIONS, TRAINING_MODE_OPTIONS, TRAINING_STATUS_OPTIONS } from '../../utils/constants';

import PageTitle from '../../components/common/PageTitle';

import 'react-datepicker/dist/react-datepicker.css';
import 'react-toastify/dist/ReactToastify.css';

const TrainingEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [duplicateBanner, setDuplicateBanner] = useState(false);
  const [metaDetails, setMetaDetails] = useState(null);
  const [trainingTypes, setTrainingTypes] = useState(TRAINING_TYPE_OPTIONS.map(o => ({ value: o.value, _id: o.value })));

  // Fetch training types on mount
  useEffect(() => {
    const fetchTrainingTypes = async () => {
      try {
        const response = await masterApi.getMasterData('typeOfTraining');
        if (response.data.data && response.data.data.length > 0) {
          setTrainingTypes(response.data.data);
        }
      } catch (err) {
        console.error('Failed to load training types:', err);
        toast.error('Failed to load dynamic training type options.');
      }
    };
    fetchTrainingTypes();
  }, []);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(trainingRecordSchema)
  });

  const watchStartDate = watch('startDateOfTraining');
  const watchEndDate = watch('endDateOfTraining');
  const watchProcessedDate = watch('requestProcessedDate');

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const response = await trainingApi.getTrainingRecordById(id);
        const r = response.data.data;
        
        // Reset form values with parsed date formats
        reset({
          staffNumber: r.staffNumber,
          trainingTopic: r.trainingTopic,
          trainingModuleNumber: r.trainingModuleNumber,
          trainerName: r.trainerName || '',
          trainingInstituteName: r.trainingInstituteName || '',
          typeOfTraining: r.typeOfTraining,
          trainingMode: r.trainingMode,
          trainingDurationHours: r.trainingDurationHours,
          startDateOfTraining: r.startDateOfTraining ? utcToLocalMidnight(r.startDateOfTraining) : null,
          endDateOfTraining: r.endDateOfTraining ? utcToLocalMidnight(r.endDateOfTraining) : null,
          requestProcessedDate: r.requestProcessedDate ? utcToLocalMidnight(r.requestProcessedDate) : null,
          trainingStatus: r.trainingStatus,
          trainingCostPerPerson: r.trainingCostPerPerson || 0,
          remarks: r.remarks || ''
        });

        // Set staff details for static card
        setMetaDetails({
          staffNumber: r.staffNumber,
          staffName: r.staffName,
          emailId: r.emailId,
          designation: r.designation,
          groupName: r.groupName,
          productDivisionCategory: r.productDivisionCategory,
          reportingGLManagerName: r.reportingGLManagerName,
          employmentStatus: r.employmentStatus,
          dateOfJoining: r.dateOfJoining,
          superannuationDate: r.superannuationDate,
          updatedAt: r.updatedAt,
          updatedBy: r.updatedBy
        });
      } catch (err) {
        console.error('Failed to load training record:', err);
        toast.error('Training record not found.');
        navigate('/training');
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [id, reset, navigate]);

  // Pre-submit duplicate check excluding current ID
  const checkDuplicateExcluding = async (staffNum, modNum, startD) => {
    try {
      const formattedDate = formatInputDate(startD);
      const checkRes = await trainingApi.checkDuplicate({
        staffNumber: staffNum,
        trainingModuleNumber: modNum,
        startDateOfTraining: formattedDate,
        excludeId: id
      });
      return checkRes.data.data.isDuplicate;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    setDuplicateBanner(false);

    try {
      // 1. Perform duplicate check
      const isDuplicate = await checkDuplicateExcluding(
        data.staffNumber,
        data.trainingModuleNumber,
        data.startDateOfTraining
      );

      if (isDuplicate) {
        setDuplicateBanner(true);
        toast.error('A record for this Staff + Module + Start Date already exists. Please verify.');
        setSaving(false);
        return;
      }

      // 2. Submit edits
      await trainingApi.updateTrainingRecord(id, {
        ...data,
        startDateOfTraining: formatInputDate(data.startDateOfTraining),
        endDateOfTraining: formatInputDate(data.endDateOfTraining),
        requestProcessedDate: formatInputDate(data.requestProcessedDate)
      });

      toast.success('Training record updated successfully!');
      setTimeout(() => {
        navigate('/training');
      }, 1500);
    } catch (err) {
      console.error('Save failed:', err);
      const errMsg = err.response?.data?.message || 'Failed to update training record. Try again.';
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="w-8 h-8 text-brand-700 animate-spin" />
        <span className="text-sm font-medium text-slate-500">Loading record details...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/training')}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
          <PageTitle title="Edit Training Record" subtitle="Modify course parameters or status flags" />
        </div>

        {metaDetails?.updatedAt && (
          <div className="text-[10px] text-slate-400 text-right italic">
            <p>Last modified: {new Date(metaDetails.updatedAt).toLocaleString('en-IN')}</p>
          </div>
        )}
      </div>

      {/* Duplicate Alert Banner */}
      {duplicateBanner && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl flex items-start space-x-3 text-red-800 dark:text-red-400 animate-bounce">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold">Duplicate Entry Detected</h4>
            <p className="text-xs mt-1">Another record for this Staff + Module + Start Date already exists. Overwriting is disabled.</p>
          </div>
        </div>
      )}

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Read Only Staff Card */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <User className="w-4 h-4 text-brand-700" />
            <span>Staff Information</span>
          </h3>

          <div className="space-y-3 pt-3 text-xs">
            <div>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Staff Number</p>
              <p className="font-bold text-slate-950 dark:text-white text-sm">{metaDetails?.staffNumber}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Staff Name</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{metaDetails?.staffName || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Email ID</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{metaDetails?.emailId || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Designation</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{metaDetails?.designation || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Group Name</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{metaDetails?.groupName || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Division</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{metaDetails?.productDivisionCategory || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Reporting Manager</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{metaDetails?.reportingGLManagerName || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Employment Status</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{metaDetails?.employmentStatus || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Date of Joining</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{metaDetails?.dateOfJoining ? formatDate(metaDetails.dateOfJoining) : '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Training Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Topic & Module */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Training Topic*</label>
                <input
                  type="text"
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
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                    errors.trainingModuleNumber ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                  }`}
                  {...register('trainingModuleNumber')}
                />
                {errors.trainingModuleNumber && <p className="text-[10px] text-red-500 font-semibold">{errors.trainingModuleNumber.message}</p>}
              </div>

              {/* Trainer & Institute */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Trainer Name</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white"
                  {...register('trainerName')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Training Institute Name</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white"
                  {...register('trainingInstituteName')}
                />
              </div>

              {/* Type & Mode */}
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

              {/* Duration & Start Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Duration in Hours*</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
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
                          if (watchProcessedDate && val && new Date(watchProcessedDate) < new Date(val)) {
                            setValue('requestProcessedDate', null);
                          }
                        }}
                        dateFormat="dd/MM/yyyy"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                      />
                    )}
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
                {errors.startDateOfTraining && <p className="text-[10px] text-red-500 font-semibold">{errors.startDateOfTraining.message}</p>}
              </div>

              {/* End Date & Request Processed Date */}
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
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                      />
                    )}
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
                {errors.endDateOfTraining && <p className="text-[10px] text-red-500 font-semibold">{errors.endDateOfTraining.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Request Processed Date</label>
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
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                      />
                    )}
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
                <span className="text-[9px] text-slate-400 italic block mt-0.5 font-medium">Date when training request was processed/approved</span>
                {errors.requestProcessedDate && <p className="text-[10px] text-red-500 font-semibold">{errors.requestProcessedDate.message}</p>}
              </div>

              {/* Status & Cost */}
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
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:text-white ${
                    errors.trainingCostPerPerson ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                  }`}
                  {...register('trainingCostPerPerson')}
                />
                {errors.trainingCostPerPerson && <p className="text-[10px] text-red-500 font-semibold">{errors.trainingCostPerPerson.message}</p>}
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

            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-100 dark:border-slate-850">
              <button
                type="button"
                onClick={() => navigate('/training')}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-850/40 transition-all"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-brand-700 hover:bg-brand-800 disabled:bg-brand-400 text-white font-bold rounded-xl text-xs transition-all flex items-center space-x-1.5 shadow-md"
              >
                {saving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
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

export default TrainingEditPage;
