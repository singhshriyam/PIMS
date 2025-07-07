import React, { useState, useEffect, useRef } from 'react';
import { getStoredToken } from '../../app/(MainBody)/services/userService';

// API Configuration
const API_BASE_URL = 'https://apexwpc.apextechno.co.uk/api';

// Types
interface SLANotification {
  id: number;
  user_id: number;
  email: string;
  mobile: string | number | null;
  for: string;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface APIResponse {
  success: boolean;
  data: SLANotification[] | SLANotification | null;
  message?: string;
}

const SLANotifications: React.FC = () => {
  // State management
  const [slaNotifications, setSlaNotifications] = useState<SLANotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Master data states
  const [users, setUsers] = useState<User[]>([]);
  const [loadingMasterData, setLoadingMasterData] = useState(true);

  // Modal and UI states
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    user_id: 1,
    email: '',
    mobile: '',
    for: 'response'
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewingNotification, setViewingNotification] = useState<SLANotification | null>(null);

  // Search and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Processing states
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Ref for click outside detection
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Utility functions
  const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') {
      setSuccess(message);
      setError(null);
      setTimeout(() => setSuccess(null), 5000);
    } else {
      setError(message);
      setSuccess(null);
      setTimeout(() => setError(null), 10000);
    }
  };

  const getHeaders = () => {
    const token = getStoredToken();
    if (!token) {
      showAlert('Authentication token not found. Please log in again.', 'error');
      return null;
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const getUserName = (userId: number): string => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : `User ID: ${userId}`;
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatMobile = (mobile: string | number | null): string => {
    if (!mobile) return 'N/A';
    return mobile.toString();
  };

  const getNotificationTypeName = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'response':
        return 'Response';
      case 'escalation':
        return 'Escalation';
      case 'breach':
        return 'Breach';
      case 'warning':
        return 'Warning';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // API functions
  const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    const headers = getHeaders();
    if (!headers) throw new Error('No authentication headers');

    const config: RequestInit = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please login again.');
      } else if (response.status === 422) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Validation error');
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    return response.json();
  };

  const loadMasterData = async (): Promise<void> => {
    try {
      setLoadingMasterData(true);
      setUsers([
        { id: 1, name: 'Admin User', email: 'admin@apextechno.co.uk' },
        { id: 2, name: 'Manager User', email: 'manager@apextechno.co.uk' },
        { id: 3, name: 'Ajay Pandey', email: 'ajay.apndey@apextechno.co.uk' },
        { id: 4, name: 'Ajay Pandey 2', email: 'ajay.apndey1@apextechno.co.uk' },
        { id: 5, name: 'Support User', email: 'support@apextechno.co.uk' }
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load master data';
      showAlert(errorMessage, 'error');
    } finally {
      setLoadingMasterData(false);
    }
  };

  const fetchSLANotifications = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall('/sla-notifications');

      if (result.success && Array.isArray(result.data)) {
        setSlaNotifications(result.data);
      } else if (result.success && result.data === null) {
        setSlaNotifications([]);
      } else {
        throw new Error(result.message || 'Failed to fetch SLA notifications');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch SLA notifications';
      showAlert(errorMessage, 'error');
      setSlaNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const createSLANotification = async (): Promise<void> => {
    try {
      setCreating(true);

      if (!formData.email.trim()) {
        showAlert('Email is required', 'error');
        return;
      }

      const payload = {
        user_id: formData.user_id,
        email: formData.email.trim(),
        mobile: formData.mobile ? parseInt(formData.mobile) : null,
        for: formData.for
      };

      const result = await apiCall('/sla-notifications', 'POST', payload);

      if (result.success) {
        showAlert('SLA Notification created successfully!');
        setCreateModal(false);
        resetForm();
        await fetchSLANotifications();
      } else {
        throw new Error(result.message || 'Failed to create SLA notification');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create SLA notification';
      showAlert(errorMessage, 'error');
    } finally {
      setCreating(false);
    }
  };

  const updateSLANotification = async (): Promise<void> => {
    if (!editingId) return;
    try {
      setUpdating(true);

      if (!formData.email.trim()) {
        showAlert('Email is required', 'error');
        return;
      }

      const payload = {
        id: editingId,
        user_id: formData.user_id,
        email: formData.email.trim(),
        mobile: formData.mobile ? parseInt(formData.mobile) : null,
        for: formData.for
      };

      const result = await apiCall(`/sla-notifications/${editingId}`, 'PUT', payload);

      if (result.success) {
        showAlert('SLA Notification updated successfully!');
        setEditModal(false);
        setEditingId(null);
        resetForm();
        await fetchSLANotifications();
      } else {
        throw new Error(result.message || 'Failed to update SLA notification');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update SLA notification';
      showAlert(errorMessage, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const deleteSLANotification = async (): Promise<void> => {
    if (!deletingId) return;
    try {
      setDeleting(true);
      const result = await apiCall(`/sla-notifications/${deletingId}`, 'DELETE');
      if (result.success) {
        showAlert('SLA Notification deleted successfully!');
        setDeleteModal(false);
        setDeletingId(null);
        await fetchSLANotifications();
      } else {
        throw new Error(result.message || 'Failed to delete SLA notification');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete SLA notification';
      showAlert(errorMessage, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Event handlers
  const resetForm = () => {
    setFormData({
      user_id: users.length > 0 ? users[0].id : 1,
      email: '',
      mobile: '',
      for: 'response'
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'user_id' ? parseInt(value) : value
    }));
  };

  const handleCreate = () => {
    resetForm();
    setCreateModal(true);
  };

  const handleEdit = (notification: SLANotification) => {
    setFormData({
      user_id: notification.user_id,
      email: notification.email,
      mobile: formatMobile(notification.mobile),
      for: notification.for
    });
    setEditingId(notification.id);
    setEditModal(true);
    setOpenDropdown(null);
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    setDeleteModal(true);
    setOpenDropdown(null);
  };

  const handleView = (notification: SLANotification) => {
    setViewingNotification(notification);
    setViewModal(true);
    setOpenDropdown(null);
  };

  const toggleDropdown = (id: number) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  // Pagination logic
  const filteredNotifications = slaNotifications.filter(notification => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      getUserName(notification.user_id).toLowerCase().includes(searchLower) ||
      notification.email.toLowerCase().includes(searchLower) ||
      formatMobile(notification.mobile).toLowerCase().includes(searchLower) ||
      getNotificationTypeName(notification.for).toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentNotifications = filteredNotifications.slice(startIndex, startIndex + itemsPerPage);

  // Effects
  useEffect(() => {
    const initializeData = async () => {
      await loadMasterData();
      await fetchSLANotifications();
    };
    initializeData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading || loadingMasterData) {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5 className="text-muted">
              {loadingMasterData ? 'Loading Master Data...' : 'Loading SLA Notifications...'}
            </h5>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          {/* Alerts */}
          {success && (
            <div className="alert alert-success alert-dismissible fade show mt-3">
              <strong>✅ Success!</strong> {success}
              <button type="button" className="btn-close" onClick={() => setSuccess(null)}></button>
            </div>
          )}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show mt-3">
              <strong>❌ Error!</strong> {error}
              <button type="button" className="btn-close" onClick={() => setError(null)}></button>
            </div>
          )}

          <div className="card mt-4">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">SLA Notifications</h5>
                <button
                  className="btn btn-success btn-sm"
                  onClick={handleCreate}
                  disabled={loading || loadingMasterData}
                >
                  + Add SLA Notification
                </button>
              </div>
            </div>

            <div className="card-body">
              {/* Search Controls */}
              <div className="row mb-3">
                <div className="col-md-6">
                  <div className="d-flex align-items-center">
                    <span className="me-2">Show</span>
                    <select
                      className="form-select me-2"
                      style={{ width: 'auto' }}
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span>entries per page</span>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex justify-content-end">
                    <div className="d-flex align-items-center">
                      <span className="me-2">Search:</span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search notifications..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '200px' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div>
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>User</th>
                      <th>Email</th>
                      <th>Mobile</th>
                      <th>Type</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentNotifications.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-4">
                          <div className="text-muted">
                            {searchTerm ? 'No notifications match your search.' : 'No SLA notifications found.'}
                          </div>
                          {!searchTerm && (
                            <button className="btn btn-primary btn-sm mt-2" onClick={handleCreate}>
                              Create First Notification
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      currentNotifications.map((notification) => (
                        <tr key={notification.id}>
                          <td>{notification.id}</td>
                          <td>{getUserName(notification.user_id)}</td>
                          <td>{notification.email}</td>
                          <td>{formatMobile(notification.mobile)}</td>
                          <td>
                            <span className={`badge ${
                              notification.for === 'response' ? 'bg-primary' :
                              notification.for === 'escalation' ? 'bg-warning text-dark' :
                              notification.for === 'breach' ? 'bg-danger' :
                              'bg-info'
                            }`}>
                              {getNotificationTypeName(notification.for)}
                            </span>
                          </td>
                          <td>{formatDate(notification.created_at)}</td>
                          <td>
                            <div className="position-relative" ref={dropdownRef}>
                              <button className="btn btn-sm" onClick={() => toggleDropdown(notification.id)}>≡</button>
                              {openDropdown === notification.id && (
                                <div className="position-absolute bg-white border rounded shadow"
                                     style={{ top: '100%', right: 0, zIndex: 1000, minWidth: '120px' }}>
                                  <button
                                    className="dropdown-item btn btn-sm w-100 text-dark border-0 bg-transparent px-3 py-2 text-info"
                                    onClick={() => handleView(notification)}
                                  >
                                    View
                                  </button>
                                  <button
                                    className="dropdown-item btn btn-sm w-100 text-dark border-0 bg-transparent px-3 py-2 text-warning"
                                    onClick={() => handleEdit(notification)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="dropdown-item btn btn-sm w-100 text-dark border-0 bg-transparent px-3 py-2 text-danger"
                                    onClick={() => handleDelete(notification.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-3 d-flex justify-content-between align-items-center">
                  <div className="text-muted">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredNotifications.length)} of {filteredNotifications.length} entries
                  </div>
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                          Previous
                        </button>
                      </li>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNum = totalPages <= 5 ? i + 1 :
                                     currentPage <= 3 ? i + 1 :
                                     currentPage >= totalPages - 2 ? totalPages - 4 + i :
                                     currentPage - 2 + i;
                        return (
                          <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setCurrentPage(pageNum)}>{pageNum}</button>
                          </li>
                        );
                      })}
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {createModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">Add SLA Notification</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setCreateModal(false)} disabled={creating}></button>
                </div>
                <div className="modal-body">
                  <form>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">User *</label>
                          <select className="form-select" name="user_id" value={formData.user_id} onChange={handleInputChange} required>
                            {users.map(user => (
                              <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Email *</label>
                          <input
                            type="email"
                            className="form-control"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="Enter email address"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Mobile</label>
                          <input
                            type="text"
                            className="form-control"
                            name="mobile"
                            value={formData.mobile}
                            onChange={handleInputChange}
                            placeholder="Enter mobile number"
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Notification Type *</label>
                          <select className="form-select" name="for" value={formData.for} onChange={handleInputChange} required>
                            <option value="response">Response</option>
                            <option value="escalation">Escalation</option>
                            <option value="breach">Breach</option>
                            <option value="warning">Warning</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setCreateModal(false)} disabled={creating}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={createSLANotification} disabled={creating}>
                    {creating ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</> : 'Create Notification'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header bg-warning text-dark">
                  <h5 className="modal-title">Edit SLA Notification</h5>
                  <button type="button" className="btn-close" onClick={() => setEditModal(false)} disabled={updating}></button>
                </div>
                <div className="modal-body">
                  <form>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">User *</label>
                          <select className="form-select" name="user_id" value={formData.user_id} onChange={handleInputChange} required>
                            {users.map(user => (
                              <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Email *</label>
                          <input
                            type="email"
                            className="form-control"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="Enter email address"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Mobile</label>
                          <input
                            type="text"
                            className="form-control"
                            name="mobile"
                            value={formData.mobile}
                            onChange={handleInputChange}
                            placeholder="Enter mobile number"
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Notification Type *</label>
                          <select className="form-select" name="for" value={formData.for} onChange={handleInputChange} required>
                            <option value="response">Response</option>
                            <option value="escalation">Escalation</option>
                            <option value="breach">Breach</option>
                            <option value="warning">Warning</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditModal(false)} disabled={updating}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-warning" onClick={updateSLANotification} disabled={updating}>
                    {updating ? <><span className="spinner-border spinner-border-sm me-2"></span>Updating...</> : 'Update Notification'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header bg-danger text-white">
                  <h5 className="modal-title">Delete SLA Notification</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setDeleteModal(false)} disabled={deleting}></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete this SLA notification?</p>
                  <p className="text-muted">This action cannot be undone and may affect notification delivery.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setDeleteModal(false)} disabled={deleting}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={deleteSLANotification} disabled={deleting}>
                    {deleting ? <><span className="spinner-border spinner-border-sm me-2"></span>Deleting...</> : 'Delete Notification'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* View Modal */}
      {viewModal && viewingNotification && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header bg-info text-white">
                  <h5 className="modal-title">SLA Notification Details</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setViewModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <h6>Notification Information</h6>
                      <table className="table table-borderless table-sm">
                        <tbody>
                          <tr><td><strong>ID:</strong></td><td>{viewingNotification.id}</td></tr>
                          <tr><td><strong>User:</strong></td><td>{getUserName(viewingNotification.user_id)}</td></tr>
                          <tr><td><strong>Email:</strong></td><td>{viewingNotification.email}</td></tr>
                          <tr><td><strong>Mobile:</strong></td><td>{formatMobile(viewingNotification.mobile)}</td></tr>
                          <tr><td><strong>Type:</strong></td><td>
                            <span className={`badge ${
                              viewingNotification.for === 'response' ? 'bg-primary' :
                              viewingNotification.for === 'escalation' ? 'bg-warning text-dark' :
                              viewingNotification.for === 'breach' ? 'bg-danger' :
                              'bg-info'
                            }`}>
                              {getNotificationTypeName(viewingNotification.for)}
                            </span>
                          </td></tr>
                          <tr><td><strong>Created:</strong></td><td>{formatDate(viewingNotification.created_at)}</td></tr>
                          <tr><td><strong>Updated:</strong></td><td>{formatDate(viewingNotification.updated_at)}</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="col-md-6">
                      <h6>Technical Details</h6>
                      <table className="table table-borderless table-sm">
                        <tbody>
                          <tr><td><strong>User ID:</strong></td><td>{viewingNotification.user_id}</td></tr>
                          <tr><td><strong>Notification For:</strong></td><td>{viewingNotification.for}</td></tr>
                          <tr><td><strong>Contact Email:</strong></td><td>{viewingNotification.email}</td></tr>
                          <tr><td><strong>Contact Mobile:</strong></td><td>{formatMobile(viewingNotification.mobile)}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setViewModal(false)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SLANotifications;
