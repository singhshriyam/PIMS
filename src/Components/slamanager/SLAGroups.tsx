import React, { useState, useEffect } from 'react';
import { getStoredToken } from '../../app/(MainBody)/services/userService';

// API Configuration
const API_BASE_URL = 'https://apexwpc.apextechno.co.uk/api';

// Types
interface SLAGroup {
  id: number;
  name: string;
  active: number;
  created_at: string | null;
  updated_at: string;
  deleted_at: string | null;
  sla_definations?: SLADefinition[];
}

interface SLADefinition {
  id: number;
  sla_type_id: number;
  sla_target_id: number;
  name: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number | null;
  active: number;
  cost: string;
  created_at: string;
  updated_at: string;
  sla_group_id: number;
  deleted_at: string | null;
}

interface APIResponse {
  success: boolean;
  data: SLAGroup[] | SLAGroup | null;
  message?: string;
}

const SLAGroups: React.FC = () => {
  // State management
  const [slaGroups, setSlaGroups] = useState<SLAGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);

  // Form and UI states
  const [formData, setFormData] = useState({ name: '', active: 1 });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewingGroup, setViewingGroup] = useState<SLAGroup | null>(null);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Processing states
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState<number | null>(null);

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

  const getTypeName = (typeId: number): string => {
    return typeId === 1 ? 'SLA' : typeId === 2 ? 'OLA' : 'Unknown';
  };

  const getTargetName = (targetId: number): string => {
    return targetId === 1 ? 'Response' : targetId === 2 ? 'Resolution' : 'Unknown';
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
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

  const formatDuration = (definition: SLADefinition): string => {
    const parts = [];
    if (definition.days > 0) parts.push(`${definition.days}d`);
    if (definition.hours > 0) parts.push(`${definition.hours}h`);
    if (definition.minutes > 0) parts.push(`${definition.minutes}m`);
    if (definition.seconds && definition.seconds > 0) parts.push(`${definition.seconds}s`);
    return parts.length > 0 ? parts.join(' ') : '0';
  };

  // API Functions
  const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    const headers = getHeaders();
    if (!headers) throw new Error('No authentication headers');

    const config: RequestInit = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    return response.json();
  };

  const fetchSLAGroups = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall('/sla-groups');
      if (result.success && Array.isArray(result.data)) {
        setSlaGroups(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch SLA groups');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch SLA groups';
      showAlert(errorMessage, 'error');
      setSlaGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const createSLAGroup = async (): Promise<void> => {
    try {
      setCreating(true);
      const result = await apiCall('/sla-groups', 'POST', formData);
      if (result.success) {
        showAlert('SLA Group created successfully!');
        setCreateModal(false);
        resetForm();
        await fetchSLAGroups();
      } else {
        throw new Error(result.message || 'Failed to create SLA group');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create SLA group';
      showAlert(errorMessage, 'error');
    } finally {
      setCreating(false);
    }
  };

  const updateSLAGroup = async (): Promise<void> => {
    if (!editingId) return;
    try {
      setUpdating(true);
      const result = await apiCall(`/sla-groups/${editingId}`, 'PUT', formData);
      if (result.success) {
        showAlert('SLA Group updated successfully!');
        setEditModal(false);
        setEditingId(null);
        resetForm();
        await fetchSLAGroups();
      } else {
        throw new Error(result.message || 'Failed to update SLA group');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update SLA group';
      showAlert(errorMessage, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const deleteSLAGroup = async (): Promise<void> => {
    if (!deletingId) return;
    try {
      setDeleting(true);
      const result = await apiCall(`/sla-groups/${deletingId}`, 'DELETE');
      if (result.success) {
        showAlert('SLA Group deleted successfully!');
        setDeleteModal(false);
        setDeletingId(null);
        await fetchSLAGroups();
      } else {
        throw new Error(result.message || 'Failed to delete SLA group');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete SLA group';
      showAlert(errorMessage, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const toggleGroupStatus = async (groupId: number, currentStatus: number): Promise<void> => {
    try {
      setTogglingStatus(groupId);
      const result = await apiCall(`/sla-groups/sla-group-change-status/${groupId}`, 'POST', {
        active: currentStatus === 1 ? false : true
      });
      if (result.success) {
        showAlert(`SLA Group ${currentStatus === 1 ? 'deactivated' : 'activated'} successfully!`);
        await fetchSLAGroups();
      } else {
        throw new Error(result.message || 'Failed to change group status');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change group status';
      showAlert(errorMessage, 'error');
    } finally {
      setTogglingStatus(null);
    }
  };

  const viewGroupDetails = async (groupId: number): Promise<void> => {
    try {
      const result = await apiCall(`/sla-groups/sla-group-definations/${groupId}`, 'POST');
      if (result.success && result.data) {
        setViewingGroup(result.data as SLAGroup);
        setViewModal(true);
        setOpenDropdown(null);
      } else {
        throw new Error(result.message || 'Failed to fetch group details');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch group details';
      showAlert(errorMessage, 'error');
    }
  };

  // Event handlers
  const resetForm = () => setFormData({ name: '', active: 1 });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'active' ? parseInt(value) : value }));
  };

  const handleCreate = () => { resetForm(); setCreateModal(true); };

  const handleEdit = (group: SLAGroup) => {
    setFormData({ name: group.name, active: group.active });
    setEditingId(group.id);
    setEditModal(true);
    setOpenDropdown(null);
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    setDeleteModal(true);
    setOpenDropdown(null);
  };

  const toggleDropdown = (id: number) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };

    if (openDropdown !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  // Filter groups based on search
  const filteredGroups = slaGroups.filter(group => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return group.name.toLowerCase().includes(searchLower) ||
           (group.active === 1 ? 'active' : 'inactive').includes(searchLower);
  });

  // Effects
  useEffect(() => { fetchSLAGroups(); }, []);

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5 className="text-muted">Loading SLA Groups...</h5>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid" style={{ minHeight: '100vh' }}>
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
                <h5 className="mb-0">SLA Groups</h5>
                <div className="d-flex gap-2">
                  <button className="btn btn-success btn-sm" onClick={handleCreate} disabled={loading}>
                    + Add SLA Group
                  </button>
                </div>
              </div>
            </div>

            <div className="card-body">
              {/* Search Controls */}
              <div className="row mb-3">
                <div className="col-md-6"></div>
                <div className="col-md-6">
                  <div className="d-flex justify-content-end">
                    <div className="d-flex align-items-center">
                      <span className="me-2">Search:</span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search groups..."
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
                <table className="table table-hover mb-0" style={{ width: '100%' }}>
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th>Updated At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroups.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4">
                          <div className="text-muted">
                            {searchTerm ? 'No groups match your search.' : 'No SLA groups found.'}
                          </div>
                          {!searchTerm && (
                            <button className="btn btn-primary btn-sm mt-2" onClick={handleCreate}>
                              Create First Group
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredGroups.map((group) => (
                        <tr key={group.id}>
                          <td>{group.id}</td>
                          <td><span className="fw-medium">{group.name}</span></td>
                          <td>
                            <span className={`badge ${group.active === 1 ? 'bg-success' : 'bg-secondary'}`}>
                              {group.active === 1 ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td><small className="text-muted">{formatDate(group.created_at)}</small></td>
                          <td><small className="text-muted">{formatDate(group.updated_at)}</small></td>
                          <td>
                            <div className="position-relative">
                              <button
                                className="btn btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDropdown(group.id);
                                }}
                                disabled={togglingStatus === group.id}
                              >
                                {togglingStatus === group.id ? (
                                  <span className="spinner-border spinner-border-sm"></span>
                                ) : (
                                  '≡'
                                )}
                              </button>
                              {openDropdown === group.id && (
                                <div className="position-absolute bg-white border rounded shadow"
                                     style={{ top: '100%', right: 0, zIndex: 1000, minWidth: '150px' }}>
                                  <button
                                    className="dropdown-item btn btn-sm w-100 text-start border-0 bg-transparent px-3 py-2 text-dark"
                                    onClick={() => viewGroupDetails(group.id)}
                                  >
                                    View
                                  </button>
                                  <button
                                    className="dropdown-item btn btn-sm w-100 text-start border-0 bg-transparent px-3 py-2 text-dark"
                                    onClick={() => handleEdit(group)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className={`dropdown-item btn btn-sm w-100 text-dark border-0 bg-transparent px-3 py-2 text-${group.active === 1 ? 'warning' : 'success'}`}
                                    onClick={() => toggleGroupStatus(group.id, group.active)}
                                  >
                                    {group.active === 1 ? 'Deactivate' : 'Activate'}
                                  </button>
                                  <button
                                    className="dropdown-item btn btn-sm w-100 text-start border-0 bg-transparent px-3 py-2 text-dark"
                                    onClick={() => handleDelete(group.id)}
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

              <div className="mt-3 d-flex justify-content-between align-items-center">
                <div className="text-muted">
                  Showing {filteredGroups.length} entries
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {createModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">Add SLA Group</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setCreateModal(false)} disabled={creating}></button>
                </div>
                <div className="modal-body">
                  <form>
                    <div className="mb-3">
                      <label className="form-label">Group Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter group name"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Status *</label>
                      <select className="form-select" name="active" value={formData.active} onChange={handleInputChange} required>
                        <option value={1}>Active</option>
                        <option value={0}>Inactive</option>
                      </select>
                    </div>
                  </form>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setCreateModal(false)} disabled={creating}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={createSLAGroup} disabled={creating || !formData.name.trim()}>
                    {creating ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</> : 'Create Group'}
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
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header bg-warning text-white">
                  <h5 className="modal-title">Edit SLA Group</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setEditModal(false)} disabled={updating}></button>
                </div>
                <div className="modal-body">
                  <form>
                    <div className="mb-3">
                      <label className="form-label">Group Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter group name"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Status *</label>
                      <select className="form-select" name="active" value={formData.active} onChange={handleInputChange} required>
                        <option value={1}>Active</option>
                        <option value={0}>Inactive</option>
                      </select>
                    </div>
                  </form>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditModal(false)} disabled={updating}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-warning" onClick={updateSLAGroup} disabled={updating || !formData.name.trim()}>
                    {updating ? <><span className="spinner-border spinner-border-sm me-2"></span>Updating...</> : 'Update Group'}
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
                  <h5 className="modal-title">Delete SLA Group</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setDeleteModal(false)} disabled={deleting}></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete this SLA group?</p>
                  <p className="text-muted">This action cannot be undone and may affect related SLA definitions.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setDeleteModal(false)} disabled={deleting}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={deleteSLAGroup} disabled={deleting}>
                    {deleting ? <><span className="spinner-border spinner-border-sm me-2"></span>Deleting...</> : 'Delete Group'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* View Details Modal */}
      {viewModal && viewingGroup && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-xl">
              <div className="modal-content">
                <div className="modal-header bg-info text-white">
                  <h5 className="modal-title">SLA Group Details: {viewingGroup.name}</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setViewModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <h6>Group Information</h6>
                      <table className="table table-borderless table-sm">
                        <tbody>
                          <tr><td><strong>ID:</strong></td><td>{viewingGroup.id}</td></tr>
                          <tr><td><strong>Name:</strong></td><td>{viewingGroup.name}</td></tr>
                          <tr>
                            <td><strong>Status:</strong></td>
                            <td>
                              <span className={`badge ${viewingGroup.active === 1 ? 'bg-success' : 'bg-secondary'}`}>
                                {viewingGroup.active === 1 ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                          <tr><td><strong>Created:</strong></td><td>{formatDate(viewingGroup.created_at)}</td></tr>
                          <tr><td><strong>Updated:</strong></td><td>{formatDate(viewingGroup.updated_at)}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-12">
                      <h6>SLA Definitions ({viewingGroup.sla_definations?.length || 0})</h6>
                      {viewingGroup.sla_definations && viewingGroup.sla_definations.length > 0 ? (
                        <div className="table-responsive">
                          <table className="table table-striped table-sm">
                            <thead className="table-light">
                              <tr>
                                <th>ID</th><th>Name</th><th>Type</th><th>Target</th><th>Duration</th><th>Cost</th><th>Status</th><th>Created</th>
                              </tr>
                            </thead>
                            <tbody>
                              {viewingGroup.sla_definations.map((definition) => (
                                <tr key={definition.id}>
                                  <td>{definition.id}</td>
                                  <td className="fw-medium">{definition.name}</td>
                                  <td><span className="badge bg-primary">{getTypeName(definition.sla_type_id)}</span></td>
                                  <td><span className="badge bg-secondary">{getTargetName(definition.sla_target_id)}</span></td>
                                  <td className="fw-medium">{formatDuration(definition)}</td>
                                  <td>£{definition.cost}</td>
                                  <td>
                                    <span className={`badge ${definition.active === 1 ? 'bg-success' : 'bg-secondary'}`}>
                                      {definition.active === 1 ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                  <td><small className="text-muted">{formatDate(definition.created_at)}</small></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted">
                          <p>No SLA definitions found for this group.</p>
                        </div>
                      )}
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

export default SLAGroups;
