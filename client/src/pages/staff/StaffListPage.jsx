import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { Plus, Search, Edit, Trash2, RefreshCw, Upload } from 'lucide-react';

import * as staffApi from '../../api/staff.api';
import { usePagination } from '../../hooks/usePagination';
import { formatDate } from '../../utils/formatters';
import useAuth from '../../hooks/useAuth';
import { isSuperAdmin, isAdmin } from '../../utils/roleHelpers';
import PageTitle from '../../components/common/PageTitle';
import DataTable from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';

import 'react-toastify/dist/ReactToastify.css';

const StaffListPage = () => {
  const { user } = useAuth();
  const canManageStaff = isSuperAdmin(user) || isAdmin(user);
  const { page, limit, total, totalPages, setTotal, setTotalPages, handlePageChange, handleLimitChange } = usePagination(25);
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Deletion state
  const [deleteId, setDeleteId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDelete, setIsBulkDelete] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await staffApi.getStaff({
        page,
        limit,
        search: search || undefined
      });
      const { data, pagination } = response.data;
      setStaff(data);
      setTotal(pagination.total);
      setTotalPages(pagination.totalPages);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load staff list.');
    } finally {
      setLoading(false);
    }
  };

  // Clear selection when data changes
  useEffect(() => {
    setSelectedIds([]);
  }, [staff]);

  useEffect(() => {
    fetchStaff();
  }, [page, limit]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchStaff();
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(staff.filter(s => s.staffNumber !== 'S00001').map(s => s._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleDeleteTrigger = (id) => {
    setDeleteId(id);
    setIsBulkDelete(false);
    setConfirmOpen(true);
  };

  const handleBulkDeleteTrigger = () => {
    setIsBulkDelete(true);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (isBulkDelete) {
      if (selectedIds.length === 0) return;
      try {
        await staffApi.deleteStaffBulk(selectedIds);
        toast.success(`${selectedIds.length} staff members deleted successfully.`);
        fetchStaff();
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete selected staff members.');
      } finally {
        setIsBulkDelete(false);
      }
    } else {
      if (!deleteId) return;
      try {
        await staffApi.deleteStaff(deleteId);
        toast.success('Staff member deleted successfully.');
        fetchStaff();
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete staff member.');
      } finally {
        setDeleteId(null);
      }
    }
  };

  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={staff.length > 0 && staff.filter(s => s.staffNumber !== 'S00001').length > 0 && selectedIds.length === staff.filter(s => s.staffNumber !== 'S00001').length}
          onChange={handleSelectAll}
          className="rounded border-slate-350 dark:border-slate-800 text-brand-700 focus:ring-brand-500 bg-white dark:bg-slate-900 cursor-pointer"
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row._id)}
          disabled={row.staffNumber === 'S00001'}
          onChange={(e) => handleSelectRow(row._id, e.target.checked)}
          className={`rounded border-slate-350 dark:border-slate-800 text-brand-700 focus:ring-brand-500 bg-white dark:bg-slate-900 ${
            row.staffNumber === 'S00001' ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
          }`}
        />
      )
    },
    {
      header: '#',
      render: (row, idx) => (page - 1) * limit + idx + 1
    },
    { header: 'Staff Number', key: 'staffNumber' },
    { header: 'Staff Name', key: 'staffName' },
    { header: 'Email ID', key: 'emailId' },
    { header: 'Designation', key: 'designation' },
    { header: 'Group Name', key: 'groupName' },
    { header: 'Division', key: 'productDivisionCategory' },
    {
      header: 'Employment Status',
      render: (row) => {
        let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/40';
        if (row.employmentStatus === 'Currently Serving') badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400';
        if (row.employmentStatus === 'Resigned') badgeStyle = 'bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/20 dark:text-rose-400';
        if (row.employmentStatus === 'Retired') badgeStyle = 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20 dark:text-amber-400';

        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${badgeStyle}`}>
            {row.employmentStatus}
          </span>
        );
      }
    },
    {
      header: 'Joining Date',
      render: (row) => row.dateOfJoining ? formatDate(row.dateOfJoining) : '—'
    }
  ];

  if (canManageStaff) {
    columns.push({
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <Link
            to={`/staff/${row._id}/edit`}
            className="p-1 text-slate-500 hover:text-brand-700 dark:hover:text-brand-400"
            title="Edit Profile"
          >
            <Edit className="w-4 h-4" />
          </Link>
          <button
            onClick={() => row.staffNumber !== 'S00001' && handleDeleteTrigger(row._id)}
            disabled={row.staffNumber === 'S00001'}
            className={`p-1 transition-colors ${
              row.staffNumber === 'S00001'
                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40'
                : 'text-slate-500 hover:text-red-600'
            }`}
            title={row.staffNumber === 'S00001' ? 'Cannot Delete Super Admin' : 'Delete Profile'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageTitle title="Staff Master Roster" subtitle="Manage active employees master list and alignments" />
        
        {canManageStaff && (
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDeleteTrigger}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all duration-200 cursor-pointer animate-in fade-in zoom-in-95 duration-150"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
            )}
            <Link
              to="/staff/import"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-bold rounded-xl shadow-sm transition-all duration-200"
            >
              <Upload className="w-4 h-4" />
              <span>Import Staff</span>
            </Link>
            <Link
              to="/staff/add"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold rounded-xl shadow-md transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff</span>
            </Link>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-800/50">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by name, number, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-white focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-1.5 bg-slate-900 hover:bg-slate-850 dark:bg-brand-700 dark:hover:bg-brand-800 text-white font-bold rounded-lg text-xs flex items-center space-x-1 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Query</span>
        </button>
      </form>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={staff}
        loading={loading}
        selectedRowIds={selectedIds}
        pagination={{
          page,
          limit,
          total,
          totalPages,
          handlePageChange,
          handleLimitChange
        }}
      />

      {/* Delete Confirmation popup */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={isBulkDelete ? "Confirm Bulk Deletion" : "Confirm Staff Deletion"}
        message={
          isBulkDelete
            ? `Are you sure you want to delete the ${selectedIds.length} selected staff members? This action cannot be undone.`
            : "Are you sure you want to delete this staff member profile from the system? This action cannot be undone."
        }
      />

      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
};

export default StaffListPage;
