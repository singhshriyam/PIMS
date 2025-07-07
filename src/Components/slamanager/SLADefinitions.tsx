import React, { useState, useEffect } from 'react';
import { getStoredToken } from '../../app/(MainBody)/services/userService';

// API Configuration
const API_BASE_URL = 'https://apexwpc.apextechno.co.uk/api';

interface SLADefinition {
  id: number;
  name: string;
  sla_type_id: number;
  sla_target_id: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  created_at: string;
  updated_at: string;
  active: number;
  cost: string;
  sla_group_id: number;
}

interface MasterDataItem {
  id: number;
  name: string;
}

interface APIResponse {
  success: boolean;
  data: SLADefinition[] | SLADefinition | MasterDataItem[] | null;
  message?: string;
}

const SLADefinitions = () => {
  const [slaDefinitions, setSlaDefinitions] = useState<SLADefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMasterData, setLoadingMasterData] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  // Master data states
  const [slaTypes, setSlaTypes] = useState<MasterDataItem[]>([]);
  const [slaTargets, setSlaTargets] = useState<MasterDataItem[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    sla_type_id: 1,
    sla_target_id: 1,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    active: 1,
    cost: '0.00',
    sla_group_id: 1
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [alert, setAlert] = useState({ show: false, message: '', color: '' });

  // Helper functions to convert IDs to names
  const getTypeName = (typeId: number): string => {
    const type = slaTypes.find(t => t.id === typeId);
    return type ? type.name : `Unknown (ID: ${typeId})`;
  };

  const getTargetName = (targetId: number): string => {
    const target = slaTargets.find(t => t.id === targetId);
    return target ? target.name : `Unknown (ID: ${targetId})`;
  };

  // API headers using your userService
  const getHeaders = () => {
    const token = getStoredToken();

    if (!token) {
      showAlert('No authentication token found. Please login again.', 'danger');
      return null;
    }

    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Show alert
  const showAlert = (message: string, color = 'success') => {
    setAlert({ show: true, message, color });
    setTimeout(() => setAlert({ show: false, message: '', color: '' }), 3000);
  };

  // Load master data from APIs
  const loadMasterData = async (): Promise<void> => {
    try {
      setLoadingMasterData(true);
      const headers = getHeaders();
      if (!headers) {
        setLoadingMasterData(false);
        return;
      }

      // Load SLA Types
      const slaTypesResponse = await fetch(`${API_BASE_URL}/sla-types`, {
        method: 'GET',
        headers: headers
      });

      if (slaTypesResponse.ok) {
        const result = await slaTypesResponse.json();
        console.log('SLA Types loaded:', result);
        setSlaTypes(result.data || []);
      } else {
        showAlert(`Failed to fetch SLA types (Status: ${slaTypesResponse.status})`, 'error');
      }

      // Load SLA Targets
      const slaTargetsResponse = await fetch(`${API_BASE_URL}/sla-targets`, {
        method: 'GET',
        headers: headers
      });

      if (slaTargetsResponse.ok) {
        const result = await slaTargetsResponse.json();
        console.log('SLA Targets loaded:', result);
        setSlaTargets(result.data || []);
      } else {
        showAlert(`Failed to fetch SLA targets (Status: ${slaTargetsResponse.status})`, 'error');
      }

    } catch (error) {
      console.error('Error loading master data:', error);
      showAlert('Error loading master data', 'danger');
    } finally {
      setLoadingMasterData(false);
    }
  };

  // Fetch SLA definitions
  const fetchSLADefinitions = async () => {
    try {
      setLoading(true);
      const headers = getHeaders();

      if (!headers) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/sla-definitions`, {
        method: 'GET',
        headers: headers
      });

      if (response.status === 401) {
        showAlert('Authentication failed. Please login again.', 'danger');
        return;
      }

      if (response.ok) {
        const result = await response.json();
        setSlaDefinitions(result.data || []);
      } else {
        showAlert(`Failed to fetch SLA definitions (Status: ${response.status})`, 'danger');
      }
    } catch (error) {
      showAlert('Error fetching SLA definitions', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Create SLA definition
  const createSLADefinition = async () => {
    try {
      const headers = getHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/sla-definitions`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(formData)
      });

      if (response.status === 401) {
        showAlert('Authentication failed. Please login again.', 'danger');
        return;
      }

      if (response.ok) {
        showAlert('SLA Definition created successfully!');
        setCreateModal(false);
        resetForm();
        fetchSLADefinitions();
      } else {
        showAlert(`Failed to create SLA definition (Status: ${response.status})`, 'danger');
      }
    } catch (error) {
      showAlert('Error creating SLA definition', 'danger');
    }
  };

  // Update SLA definition
  const updateSLADefinition = async () => {
    if (!editingId) return;

    try {
      const headers = getHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/sla-definitions/${editingId}`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(formData)
      });

      if (response.status === 401) {
        showAlert('Authentication failed. Please login again.', 'danger');
        return;
      }

      if (response.ok) {
        showAlert('SLA Definition updated successfully!');
        setEditModal(false);
        setEditingId(null);
        resetForm();
        fetchSLADefinitions();
      } else {
        showAlert(`Failed to update SLA definition (Status: ${response.status})`, 'danger');
      }
    } catch (error) {
      showAlert('Error updating SLA definition', 'danger');
    }
  };

  // Delete SLA definition
  const deleteSLADefinition = async () => {
    if (!deletingId) return;

    try {
      const headers = getHeaders();
      if (!headers) return;

      const response = await fetch(`${API_BASE_URL}/sla-definitions/${deletingId}`, {
        method: 'DELETE',
        headers: headers
      });

      if (response.status === 401) {
        showAlert('Authentication failed. Please login again.', 'danger');
        return;
      }

      if (response.ok) {
        showAlert('SLA Definition deleted successfully!');
        setDeleteModal(false);
        setDeletingId(null);
        fetchSLADefinitions();
      } else {
        showAlert(`Failed to delete SLA definition (Status: ${response.status})`, 'danger');
      }
    } catch (error) {
      showAlert('Error deleting SLA definition', 'danger');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      sla_type_id: slaTypes.length > 0 ? slaTypes[0].id : 1,
      sla_target_id: slaTargets.length > 0 ? slaTargets[0].id : 1,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      active: 1,
      cost: '0.00',
      sla_group_id: 1
    });
  };

  // Handle create
  const handleCreate = () => {
    resetForm();
    setCreateModal(true);
  };

  // Handle edit
  const handleEdit = (definition: SLADefinition) => {
    setFormData({
      name: definition.name,
      sla_type_id: definition.sla_type_id,
      sla_target_id: definition.sla_target_id,
      days: definition.days,
      hours: definition.hours,
      minutes: definition.minutes,
      seconds: definition.seconds,
      active: definition.active,
      cost: definition.cost,
      sla_group_id: definition.sla_group_id
    });
    setEditingId(definition.id);
    setEditModal(true);
    setOpenDropdown(null);
  };

  // Handle delete
  const handleDelete = (id: number) => {
    setDeletingId(id);
    setDeleteModal(true);
    setOpenDropdown(null);
  };

  // Toggle dropdown
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

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'sla_type_id' || name === 'sla_target_id' || name === 'days' || name === 'hours' || name === 'minutes' || name === 'seconds' || name === 'active' || name === 'sla_group_id' ? parseInt(value) : value
    });
  };

  // Load data on component mount
  useEffect(() => {
    const initializeData = async () => {
      await loadMasterData();
      await fetchSLADefinitions();
    };
    initializeData();
  }, []);

  if (loading || loadingMasterData) {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5 className="text-muted">
              {loadingMasterData ? 'Loading Master Data...' : 'Loading SLA Definitions...'}
            </h5>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid" style={{ minHeight: '100vh' }}>
      <div className="row">
        <div className="col-12">
          {alert.show && (
            <div className={`alert alert-${alert.color} mt-3`} role="alert">
              {alert.message}
            </div>
          )}

          <div className="card mt-4">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">SLA Definition List</h5>
                <button className="btn btn-success btn-sm" onClick={handleCreate}>
                  + Add SLA Definition
                </button>
              </div>
            </div>

            <div className="card-body">
              {loading ? (
                <div className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <div>
                  <table className="table table-hover mb-0" style={{ width: '100%' }}>
                    <thead className="table-light">
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Target</th>
                        <th>Days</th>
                        <th>Hours</th>
                        <th>Minutes</th>
                        <th>Seconds</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slaDefinitions.map((definition) => (
                        <tr key={definition.id}>
                          <td>{definition.id}</td>
                          <td>{definition.name}</td>
                          <td>{getTypeName(definition.sla_type_id)}</td>
                          <td>{getTargetName(definition.sla_target_id)}</td>
                          <td>{definition.days}</td>
                          <td>{definition.hours}</td>
                          <td>{definition.minutes}</td>
                          <td>{definition.seconds}</td>
                          <td>
                            <span className={`badge ${definition.active === 1 ? 'bg-success' : 'bg-secondary'}`}>
                              {definition.active === 1 ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <div className="position-relative">
                              <button
                                className="btn btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDropdown(definition.id);
                                }}
                              >
                                ≡
                              </button>
                              {openDropdown === definition.id && (
                                <div className="position-absolute bg-white border rounded shadow" style={{ top: '100%', right: 0, zIndex: 1000, minWidth: '120px' }}>
                                  <button
                                    className="dropdown-item btn btn-sm w-100 text-dark border-0 bg-transparent px-3 py-2 text-primary"
                                    onClick={() => handleEdit(definition)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="dropdown-item btn btn-sm w-100 text-dark border-0 bg-transparent px-3 py-2 text-danger"
                                    onClick={() => handleDelete(definition.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-3 d-flex justify-content-between align-items-center">
                <div className="text-muted">
                  Showing {slaDefinitions.length} entries
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
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">Add SLA Definition</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setCreateModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Name</label>
                        <input
                          type="text"
                          className="form-control"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Enter SLA name"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Select Type</label>
                        <select
                          className="form-select"
                          name="sla_type_id"
                          value={formData.sla_type_id}
                          onChange={handleInputChange}
                        >
                          {slaTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Select Target</label>
                        <select
                          className="form-select"
                          name="sla_target_id"
                          value={formData.sla_target_id}
                          onChange={handleInputChange}
                        >
                          {slaTargets.map(target => (
                            <option key={target.id} value={target.id}>{target.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Cost</label>
                        <input
                          type="text"
                          className="form-control"
                          name="cost"
                          value={formData.cost}
                          onChange={handleInputChange}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Days</label>
                        <input
                          type="number"
                          className="form-control"
                          name="days"
                          value={formData.days}
                          onChange={handleInputChange}
                          min="0"
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Hours</label>
                        <input
                          type="number"
                          className="form-control"
                          name="hours"
                          value={formData.hours}
                          onChange={handleInputChange}
                          min="0"
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Minutes</label>
                        <input
                          type="number"
                          className="form-control"
                          name="minutes"
                          value={formData.minutes}
                          onChange={handleInputChange}
                          min="0"
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Seconds</label>
                        <input
                          type="number"
                          className="form-control"
                          name="seconds"
                          value={formData.seconds}
                          onChange={handleInputChange}
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Active</label>
                        <select
                          className="form-select"
                          name="active"
                          value={formData.active}
                          onChange={handleInputChange}
                        >
                          <option value={1}>Active</option>
                          <option value={0}>Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">SLA Group ID</label>
                        <input
                          type="number"
                          className="form-control"
                          name="sla_group_id"
                          value={formData.sla_group_id}
                          onChange={handleInputChange}
                          min="1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={createSLADefinition}>
                    Submit
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
                <div className="modal-header bg-warning text-white">
                  <h5 className="modal-title">Edit SLA Definition</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setEditModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Name</label>
                        <input
                          type="text"
                          className="form-control"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Enter SLA name"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Select Type</label>
                        <select
                          className="form-select"
                          name="sla_type_id"
                          value={formData.sla_type_id}
                          onChange={handleInputChange}
                        >
                          {slaTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Select Target</label>
                        <select
                          className="form-select"
                          name="sla_target_id"
                          value={formData.sla_target_id}
                          onChange={handleInputChange}
                        >
                          {slaTargets.map(target => (
                            <option key={target.id} value={target.id}>{target.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Cost</label>
                        <input
                          type="text"
                          className="form-control"
                          name="cost"
                          value={formData.cost}
                          onChange={handleInputChange}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Days</label>
                        <input
                          type="number"
                          className="form-control"
                          name="days"
                          value={formData.days}
                          onChange={handleInputChange}
                          min="0"
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Hours</label>
                        <input
                          type="number"
                          className="form-control"
                          name="hours"
                          value={formData.hours}
                          onChange={handleInputChange}
                          min="0"
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Minutes</label>
                        <input
                          type="number"
                          className="form-control"
                          name="minutes"
                          value={formData.minutes}
                          onChange={handleInputChange}
                          min="0"
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Seconds</label>
                        <input
                          type="number"
                          className="form-control"
                          name="seconds"
                          value={formData.seconds}
                          onChange={handleInputChange}
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Active</label>
                        <select
                          className="form-select"
                          name="active"
                          value={formData.active}
                          onChange={handleInputChange}
                        >
                          <option value={1}>Active</option>
                          <option value={0}>Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">SLA Group ID</label>
                        <input
                          type="number"
                          className="form-control"
                          name="sla_group_id"
                          value={formData.sla_group_id}
                          onChange={handleInputChange}
                          min="1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditModal(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-warning" onClick={updateSLADefinition}>
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header bg-danger text-white">
                  <h5 className="modal-title">Delete SLA Definition</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setDeleteModal(false)}></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete this SLA definition?</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setDeleteModal(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={deleteSLADefinition}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SLADefinitions;
