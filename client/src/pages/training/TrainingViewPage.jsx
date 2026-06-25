import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Calendar, User, Clock, IndianRupee, Award, MapPin, Trash2 } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';

import * as trainingApi from '../../api/training.api';
import { formatDate, formatCurrency } from '../../utils/formatters';
import PageTitle from '../../components/common/PageTitle';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';

import 'react-toastify/dist/ReactToastify.css';

const TrainingViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await trainingApi.deleteTrainingRecord(record._id);
      toast.success('Training record deleted successfully.');
      setTimeout(() => {
        navigate('/training');
      }, 1500);
    } catch (err) {
      console.error('Deletion error:', err);
      toast.error('Failed to delete training record.');
    } finally {
      setConfirmOpen(false);
    }
  };

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const response = await trainingApi.getTrainingRecordById(id);
        setRecord(response.data.data);
      } catch (err) {
        console.error('Failed to fetch training record:', err);
        toast.error('Training record not found.');
        navigate('/training');
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-8 h-8 border-3 border-brand-700 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-slate-500 font-medium">Loading record details...</span>
      </div>
    );
  }

  if (!record) return null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/training')}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
          <PageTitle 
            title={`Record Details - ${record.staffNumber}`} 
            subtitle="Read-only view of course logs and staff alignment details" 
          />
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Record</span>
          </button>

          <Link
            to={`/training/${record._id}/edit`}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Record</span>
          </Link>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Staff Profile summary */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100 dark:border-slate-850">
            <div className="w-16 h-16 rounded-full bg-brand-700 text-white flex items-center justify-center text-xl font-bold shadow-md uppercase mb-3">
              {record.staffName ? record.staffName.slice(0, 2) : 'EM'}
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">{record.staffName}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">{record.staffNumber}</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-450 uppercase border border-brand-100/30">
              {record.employmentStatus}
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Email ID</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{record.emailId || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Designation</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{record.designation || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Group Name</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{record.groupName || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Product Division</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{record.productDivisionCategory || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Reporting GL Manager</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{record.reportingGLManagerName || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Date of Joining</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{record.dateOfJoining ? formatDate(record.dateOfJoining) : '—'}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Training record data */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850/50 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-850 pb-3">
            Training Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            
            {/* Topic & Module */}
            <div className="space-y-1.5">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold flex items-center space-x-1">
                <Award className="w-3.5 h-3.5 text-brand-700" />
                <span>Training Topic</span>
              </p>
              <p className="font-semibold text-sm text-slate-850 dark:text-slate-200">{record.trainingTopic}</p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold">Training Module Number</p>
              <p className="font-mono font-bold text-sm text-slate-850 dark:text-slate-200">{record.trainingModuleNumber}</p>
            </div>

            {/* Trainer & Institute */}
            <div className="space-y-1.5">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-brand-700" />
                <span>Trainer Name</span>
              </p>
              <p className="font-semibold text-slate-850 dark:text-slate-200">{record.trainerName || '—'}</p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-brand-700" />
                <span>Training Institute Name</span>
              </p>
              <p className="font-semibold text-slate-850 dark:text-slate-200">{record.trainingInstituteName || '—'}</p>
            </div>

            {/* Type & Mode */}
            <div className="space-y-1.5">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold">Type of Training</p>
              <p className="font-semibold text-slate-850 dark:text-slate-200">{record.typeOfTraining}</p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold">Training Mode</p>
              <p className="font-semibold text-slate-850 dark:text-slate-200">{record.trainingMode}</p>
            </div>

            {/* Duration & Cost */}
            <div className="space-y-1.5">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-brand-700" />
                <span>Duration</span>
              </p>
              <p className="font-bold text-slate-850 dark:text-slate-200">{record.trainingDurationHours} Hours</p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold flex items-center space-x-1">
                <IndianRupee className="w-3.5 h-3.5 text-brand-700" />
                <span>Training Cost per Person</span>
              </p>
              <p className="font-bold text-slate-850 dark:text-slate-200">{formatCurrency(record.trainingCostPerPerson)}</p>
            </div>

            {/* Dates (Start, End, Request Processed) */}
            <div className="space-y-1.5">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-brand-700" />
                <span>Training Start Date / End Date</span>
              </p>
              <p className="font-semibold text-slate-850 dark:text-slate-200">
                {formatDate(record.startDateOfTraining)} to {formatDate(record.endDateOfTraining)}
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-brand-700" />
                <span>Request Processed Date</span>
              </p>
              {/* Prominent display of Request Processed: DD/MM/YYYY as requested */}
              <p className="font-bold text-brand-700 dark:text-brand-400 text-sm">
                Request Processed: {formatDate(record.requestProcessedDate)}
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-brand-700" />
                <span>Payment Date</span>
              </p>
              <p className="font-bold text-brand-700 dark:text-brand-400 text-sm">
                Payment Date: {record.paymentDate ? formatDate(record.paymentDate) : '—'}
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold">Training Status</p>
              <div>
                <StatusBadge status={record.trainingStatus} />
              </div>
            </div>

            {/* Remarks (Optional) - Full Width */}
            <div className="space-y-1.5 md:col-span-2 pt-3 border-t border-slate-100 dark:border-slate-850">
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold">Remarks</p>
              <p className="font-semibold text-slate-805 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {record.remarks || '—'}
              </p>
            </div>

          </div>

          {/* Audit trail info */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-850 flex flex-wrap gap-4 justify-between text-[10px] text-slate-400 italic">
            {record.createdAt && <p>Record created on {new Date(record.createdAt).toLocaleString('en-IN')}</p>}
            {record.updatedAt && <p>Last updated on {new Date(record.updatedAt).toLocaleString('en-IN')}</p>}
          </div>
        </div>

      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Confirm Record Deletion"
        message="Are you sure you want to delete this training record? This action cannot be undone."
      />

      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
};

export default TrainingViewPage;
