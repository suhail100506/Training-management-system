import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layout wrappers
import AppLayout from '../components/common/AppLayout';
import ProtectedRoute from '../components/common/ProtectedRoute';
import RoleRoute from '../components/common/RoleRoute';

// Auth Pages
import LoginPage from '../pages/auth/LoginPage';
import ChangePasswordPage from '../pages/auth/ChangePasswordPage';

// Dashboard
import DashboardPage from '../pages/dashboard/DashboardPage';

// Training Records
import TrainingListPage from '../pages/training/TrainingListPage';
import TrainingAddPage from '../pages/training/TrainingAddPage';
import TrainingEditPage from '../pages/training/TrainingEditPage';
import TrainingViewPage from '../pages/training/TrainingViewPage';

// Bulk Upload
import BulkUploadPage from '../pages/bulk-upload/BulkUploadPage';
import UploadBatchListPage from '../pages/bulk-upload/UploadBatchListPage';
import UploadBatchDetailPage from '../pages/bulk-upload/UploadBatchDetailPage';

// Staff Master
import StaffListPage from '../pages/staff/StaffListPage';
import StaffAddPage from '../pages/staff/StaffAddPage';
import StaffEditPage from '../pages/staff/StaffEditPage';
import StaffImportPage from '../pages/staff/StaffImportPage';

// User Management (Super Admin only)
import UserListPage from '../pages/users/UserListPage';
import UserAddPage from '../pages/users/UserAddPage';
import UserEditPage from '../pages/users/UserEditPage';

// Master Data (Super Admin only)
import MasterDataPage from '../pages/master/MasterDataPage';

// Settings (Super Admin only)
import SettingsPage from '../pages/settings/SettingsPage';

// Audit Logs
import AuditLogPage from '../pages/audit/AuditLogPage';

import FinancialYearReportPage from '../pages/reports/FinancialYearReportPage';
import StaffWiseReportPage from '../pages/reports/StaffWiseReportPage';
import DepartmentWiseReportPage from '../pages/reports/DepartmentWiseReportPage';
import CostAnalysisReportPage from '../pages/reports/CostAnalysisReportPage';
import TrainingStatusReportPage from '../pages/reports/TrainingStatusReportPage';
import BeneficiaryReportPage from '../pages/reports/BeneficiaryReportPage';
import AllInReportPage from '../pages/reports/AllInReportPage';

// Error pages
import AccessDeniedPage from '../pages/AccessDeniedPage';
import NotFoundPage from '../pages/NotFoundPage';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth pages */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Core Authenticated Pages */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="change-password" element={<ChangePasswordPage />} />
          
          {/* Training Records CRUD */}
          <Route path="training" element={<TrainingListPage />} />
          <Route path="training/add" element={<TrainingAddPage />} />
          <Route path="training/:id/edit" element={<TrainingEditPage />} />
          <Route path="training/:id/view" element={<TrainingViewPage />} />
          
          {/* Bulk Import */}
          <Route path="bulk-upload" element={<BulkUploadPage />} />
          <Route path="bulk-upload/history" element={<UploadBatchListPage />} />
          <Route path="bulk-upload/history/:batchId" element={<UploadBatchDetailPage />} />
          
          {/* Staff Master */}
          <Route path="staff" element={<StaffListPage />} />
          <Route 
            path="staff/import" 
            element={
              <RoleRoute roles={['super_admin', 'admin']}>
                <StaffImportPage />
              </RoleRoute>
            } 
          />
          <Route 
            path="staff/add" 
            element={
              <RoleRoute roles={['super_admin', 'admin']}>
                <StaffAddPage />
              </RoleRoute>
            } 
          />
          <Route 
            path="staff/:id/edit" 
            element={
              <RoleRoute roles={['super_admin', 'admin']}>
                <StaffEditPage />
              </RoleRoute>
            } 
          />
          
          {/* User Management (Super Admin only) */}
          <Route 
            path="users" 
            element={
              <RoleRoute roles={['super_admin']}>
                <UserListPage />
              </RoleRoute>
            } 
          />
          <Route 
            path="users/add" 
            element={
              <RoleRoute roles={['super_admin']}>
                <UserAddPage />
              </RoleRoute>
            } 
          />
          <Route 
            path="users/:id/edit" 
            element={
              <RoleRoute roles={['super_admin']}>
                <UserEditPage />
              </RoleRoute>
            } 
          />

          {/* Master Data Management (Super Admin only) */}
          <Route 
            path="master" 
            element={
              <RoleRoute roles={['super_admin']}>
                <MasterDataPage />
              </RoleRoute>
            } 
          />
          
          {/* System Audit Logs */}
          <Route path="audit" element={<AuditLogPage />} />
          
          {/* Settings (Super Admin only) */}
          <Route 
            path="settings" 
            element={
              <RoleRoute roles={['super_admin']}>
                <SettingsPage />
              </RoleRoute>
            } 
          />

          {/* Reports Pages */}
          <Route path="reports/all-in-report" element={<AllInReportPage />} />
          <Route path="reports/financial-year" element={<FinancialYearReportPage />} />
          <Route path="reports/staff-wise" element={<StaffWiseReportPage />} />
          <Route path="reports/department-wise" element={<DepartmentWiseReportPage />} />
          <Route path="reports/cost-analysis" element={<CostAnalysisReportPage />} />
          <Route path="reports/training-status" element={<TrainingStatusReportPage />} />
          <Route path="reports/beneficiaries" element={<BeneficiaryReportPage />} />
        </Route>
        
        {/* Error Fallbacks */}
        <Route path="/access-denied" element={<AccessDeniedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
