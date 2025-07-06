import React, { useState, useEffect } from 'react';
import { getStoredToken } from '../../app/(MainBody)/services/userService';

// API Configuration
const API_BASE_URL = 'https://apexwpc.apextechno.co.uk/api';

// Types
interface SLACondition {
  id: number;
  sla_defination_id: number;
  sla_state_id: number;
  sla_incident_field_id: number;
  operator: string;
  impact_id: number | null;
  incidentstate_id: number | null;
  logical_operator_id: number;
  created_at: string;
  updated_at: string;
}

interface SLADefinition {
  id: number;
  name: string;
  sla_type_id: number;
  sla_target_id: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number | null;
  active: number;
  cost: string;
  created_at: string;
  updated_at: string;
  sla_group_id: number;
  deleted_at: null;
}

interface MasterDataItem {
  id: number;
  name: string;
}

interface APIResponse {
  success: boolean;
  data: SLACondition[] | SLACondition | SLADefinition[] | null;
  message?: string;
}

const SLAConditions: React.FC = () => {
  // State management
  const [slaConditions, setSlaConditions] = useState<SLACondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Master data states
  const [slaDefinitions, setSlaDefinitions] = useState<SLADefinition[]>([]);
  const [slaStates, setSlaStates] = useState<MasterDataItem[]>([]);
  const [incidentFields, setIncidentFields] = useState<MasterDataItem[]>([]);
  const [impacts, setImpacts] = useState<MasterDataItem[]>([]);
  const [incidentStates, setIncidentStates] = useState<MasterDataItem[]>([]);
  const [logicalOperators, setLogicalOperators] = useState<MasterDataItem[]>([]);
  const [loadingMasterData, setLoadingMasterData] = useState(true);

  // Modal and UI states
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    sla_defination_id: 1,
    sla_state_id: 1,
    sla_incident_field_id: 1,
    operator: '==',
    impact_id: null as number | null,
    incidentstate_id: null as number | null,
    logical_operator_id: 1
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewingCondition, setViewingCondition] = useState<SLACondition | null>(null);

  // Search and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Processing states
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const getDisplayName = (id: number | null, dataArray: MasterDataItem[]): string => {
    if (!id) return 'N/A';
    const item = dataArray.find(item => item.id === id);
    return item ? item.name : `Unknown (ID: ${id})`;
  };

  const getSLADefinitionName = (id: number): string => {
    const definition = slaDefinitions.find(def => def.id === id);
    return definition ? definition.name : `(ID: ${id})`;
  };

  const getSLAStateName = (id: number): string => {
    return id === 1 ? 'Start' : id === 2 ? 'Pause' : id === 3 ? 'Stop' : id === 4 ? 'Complete' : 'Unknown';
  };

  const getFieldName = (id: number): string => {
    return id === 1 ? 'Impact' :
           id === 2 ? 'Incident State' :
           id === 3 ? 'Priority' :
           id === 4 ? 'Category' :
           id === 5 ? 'Urgency' :
           id === 6 ? 'Assignment Group' : 'Unknown';
  };

  const getLogicalOperatorName = (id: number): string => {
    return id === 1 ? 'AND' : id === 2 ? 'OR' : id === 3 ? 'NOT' : 'Unknown';
  };

  const getImpactName = (id: number): string => {
    return id === 1 ? 'Low' : id === 2 ? 'Medium' : id === 3 ? 'High' : id === 4 ? 'Critical' : 'Unknown';
  };

  const getIncidentStateName = (id: number): string => {
    return id === 1 ? 'New' : id === 2 ? 'In Progress' : id === 3 ? 'Resolved' : id === 4 ? 'Closed' : 'Unknown';
  };

  const getValueName = (condition: SLACondition): string => {
    const fieldName = getFieldName(condition.sla_incident_field_id);

    if ((fieldName.toLowerCase().includes('impact') || fieldName.toLowerCase().includes('priority')) && condition.impact_id) {
      return getImpactName(condition.impact_id);
    }
    if ((fieldName.toLowerCase().includes('state') || fieldName.toLowerCase().includes('status')) && condition.incidentstate_id) {
      return getIncidentStateName(condition.incidentstate_id);
    }
    if (condition.impact_id) return getImpactName(condition.impact_id);
    if (condition.incidentstate_id) return getIncidentStateName(condition.incidentstate_id);
    return 'N/A';
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

  // API functions
  const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    const headers = getHeaders();
    if (!headers) throw new Error('No authentication headers');

    const config: RequestInit = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    return response.json();
  };

  const loadMasterData = async (): Promise<void> => {
    try {
      setLoadingMasterData(true);

      // Load SLA Definitions EXACTLY like SLADefinitions component
      const headers = getHeaders();
      if (!headers) {
        setLoadingMasterData(false);
        return;
      }

      try {
        const response = await fetch('https://apexwpc.apextechno.co.uk/api/sla-definitions', {
          method: 'GET',
          headers: headers
        });

        if (response.status === 401) {
          showAlert('Authentication failed. Please login again.', 'error');
          return;
        }

        if (response.ok) {
          const result = await response.json();
          console.log('SLA Definitions loaded:', result); // Debug log
          setSlaDefinitions(result.data || []);
        } else {
          showAlert(`Failed to fetch SLA definitions (Status: ${response.status})`, 'error');
        }
      } catch (error) {
        console.error('Error fetching SLA definitions:', error);
        showAlert('Error fetching SLA definitions', 'error');
      }

      // Set all master data with defaults
      setSlaStates([
        { id: 1, name: 'Start' },
        { id: 2, name: 'Pause' },
        { id: 3, name: 'Stop' },
        { id: 4, name: 'Complete' }
      ]);

      setIncidentFields([
        { id: 1, name: 'Impact' },
        { id: 2, name: 'Incident State' },
        { id: 3, name: 'Priority' },
        { id: 4, name: 'Category' },
        { id: 5, name: 'Urgency' },
        { id: 6, name: 'Assignment Group' }
      ]);

      setLogicalOperators([
        { id: 1, name: 'AND' },
        { id: 2, name: 'OR' },
        { id: 3, name: 'NOT' }
      ]);

      setImpacts([
        { id: 1, name: 'Low' },
        { id: 2, name: 'Medium' },
        { id: 3, name: 'High' },
        { id: 4, name: 'Critical' }
      ]);

      setIncidentStates([
        { id: 1, name: 'New' },
        { id: 2, name: 'In Progress' },
        { id: 3, name: 'Resolved' },
        { id: 4, name: 'Closed' }
      ]);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load master data';
      showAlert(errorMessage, 'error');
    } finally {
      setLoadingMasterData(false);
    }
  };

  const fetchSLAConditions = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall('/sla-conditions');
      if (result.success && Array.isArray(result.data)) {
        setSlaConditions(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch SLA conditions');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch SLA conditions';
      showAlert(errorMessage, 'error');
      setSlaConditions([]);
    } finally {
      setLoading(false);
    }
  };

  const createSLACondition = async (): Promise<void> => {
    try {
      setCreating(true);
      const result = await apiCall('/sla-conditions', 'POST', formData);
      if (result.success) {
        showAlert('SLA Condition created successfully!');
        setCreateModal(false);
        resetForm();
        await fetchSLAConditions();
      } else {
        throw new Error(result.message || 'Failed to create SLA condition');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create SLA condition';
      showAlert(errorMessage, 'error');
    } finally {
      setCreating(false);
    }
  };

  const updateSLACondition = async (): Promise<void> => {
    if (!editingId) return;
    try {
      setUpdating(true);
      const result = await apiCall(`/sla-conditions/${editingId}`, 'PUT', formData);
      if (result.success) {
        showAlert('SLA Condition updated successfully!');
        setEditModal(false);
        setEditingId(null);
        resetForm();
        await fetchSLAConditions();
      } else {
        throw new Error(result.message || 'Failed to update SLA condition');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update SLA condition';
      showAlert(errorMessage, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const deleteSLACondition = async (): Promise<void> => {
    if (!deletingId) return;
    try {
      setDeleting(true);
      const result = await apiCall(`/sla-conditions/${deletingId}`, 'DELETE');
      if (result.success) {
        showAlert('SLA Condition deleted successfully!');
        setDeleteModal(false);
        setDeletingId(null);
        await fetchSLAConditions();
      } else {
        throw new Error(result.message || 'Failed to delete SLA condition');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete SLA condition';
      showAlert(errorMessage, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Event handlers
  const resetForm = () => {
    setFormData({
      sla_defination_id: slaDefinitions.length > 0 ? slaDefinitions[0].id : 1,
      sla_state_id: slaStates.length > 0 ? slaStates[0].id : 1,
      sla_incident_field_id: incidentFields.length > 0 ? incidentFields[0].id : 1,
      operator: '==',
      impact_id: null,
      incidentstate_id: null,
      logical_operator_id: logicalOperators.length > 0 ? logicalOperators[0].id : 1
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('_id') ? (value ? parseInt(value) : null) : value
    }));
  };

  const handleCreate = () => { resetForm(); setCreateModal(true); };

  const handleEdit = (condition: SLACondition) => {
    setFormData({
      sla_defination_id: condition.sla_defination_id,
      sla_state_id: condition.sla_state_id,
      sla_incident_field_id: condition.sla_incident_field_id,
      operator: condition.operator,
      impact_id: condition.impact_id,
      incidentstate_id: condition.incidentstate_id,
      logical_operator_id: condition.logical_operator_id
    });
    setEditingId(condition.id);
    setEditModal(true);
    setOpenDropdown(null);
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    setDeleteModal(true);
    setOpenDropdown(null);
  };

  const handleView = (condition: SLACondition) => {
    setViewingCondition(condition);
    setViewModal(true);
    setOpenDropdown(null);
  };

  const toggleDropdown = (id: number) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  // Pagination logic
  const filteredConditions = slaConditions.filter(condition => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      getSLADefinitionName(condition.sla_defination_id).toLowerCase().includes(searchLower) ||
      getSLAStateName(condition.sla_state_id).toLowerCase().includes(searchLower) ||
      getFieldName(condition.sla_incident_field_id).toLowerCase().includes(searchLower) ||
      condition.operator.toLowerCase().includes(searchLower) ||
      getValueName(condition).toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredConditions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentConditions = filteredConditions.slice(startIndex, startIndex + itemsPerPage);

  // Effects
  useEffect(() => {
    const initializeData = async () => {
      await loadMasterData();
      await fetchSLAConditions();
    };
    initializeData();
  }, []);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  if (loading || loadingMasterData) {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5 className="text-muted">
              {loadingMasterData ? 'Loading Master Data...' : 'Loading SLA Conditions...'}
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
                <h5 className="mb-0">SLA Conditions</h5>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-success btn-sm"
                    onClick={handleCreate}
                    disabled={loading || loadingMasterData}
                  >
                    + Add SLA Condition
                  </button>
                </div>
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
                        placeholder="Search conditions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '200px' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>SLA Def</th>
                      <th>SLA State</th>
                      <th>Field</th>
                      <th>Operator</th>
                      <th>Value</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentConditions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-4">
                          <div className="text-muted">
                            {searchTerm ? 'No conditions match your search.' : 'No SLA conditions found.'}
                          </div>
                          {!searchTerm && (
                            <button className="btn btn-primary btn-sm mt-2" onClick={handleCreate}>
                              Create First Condition
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      currentConditions.map((condition) => (
                        <tr key={condition.id}>
                          <td>{condition.id}</td>
                          <td>{getSLADefinitionName(condition.sla_defination_id)}</td>
                          <td>{getSLAStateName(condition.sla_state_id)}</td>
                          <td>{getFieldName(condition.sla_incident_field_id)}</td>
                          <td>{condition.operator}</td>
                          <td>{getValueName(condition)}</td>
                          <td>{formatDate(condition.created_at)}</td>
                          <td>
                            <div className="position-relative">
                              <button className="btn btn-sm" onClick={() => toggleDropdown(condition.id)}>≡</button>
                              {openDropdown === condition.id && (
                                <div className="position-absolute bg-white border rounded shadow"
                                     style={{ top: '100%', right: 0, zIndex: 1000, minWidth: '120px' }}>
                                  <button
                                    className="dropdown-item btn btn-sm w-100 text-dark border-0 bg-transparent px-3 py-2 text-info"
                                    onClick={() => handleView(condition)}
                                  >
                                    View
                                  </button>
                                  <button
                                    className="dropdown-item btn btn-sm w-100 text-dark border-0 bg-transparent px-3 py-2 text-danger"
                                    onClick={() => handleDelete(condition.id)}
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
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredConditions.length)} of {filteredConditions.length} entries
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
                  <h5 className="modal-title">Add SLA Condition</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setCreateModal(false)} disabled={creating}></button>
                </div>
                <div className="modal-body">
                  <form>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">SLA Definition *</label>
                          <select className="form-select" name="sla_defination_id" value={formData.sla_defination_id} onChange={handleInputChange} required>
                            {slaDefinitions.map(def => (
                              <option key={def.id} value={def.id}>{def.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">SLA State *</label>
                          <select className="form-select" name="sla_state_id" value={formData.sla_state_id} onChange={handleInputChange} required>
                            {slaStates.map(state => (
                              <option key={state.id} value={state.id}>{state.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Incident Field *</label>
                          <select className="form-select" name="sla_incident_field_id" value={formData.sla_incident_field_id} onChange={handleInputChange} required>
                            {incidentFields.map(field => (
                              <option key={field.id} value={field.id}>{field.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Operator *</label>
                          <select className="form-select" name="operator" value={formData.operator} onChange={handleInputChange} required>
                            <option value="==">== (Equals)</option>
                            <option value="!=">!= (Not Equals)</option>
                            <option value=">">&gt; (Greater Than)</option>
                            <option value="<">&lt; (Less Than)</option>
                            <option value=">=">&gt;= (Greater Than or Equal)</option>
                            <option value="<=">&lt;= (Less Than or Equal)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Impact (if applicable)</label>
                          <select className="form-select" name="impact_id" value={formData.impact_id || ''} onChange={handleInputChange}>
                            <option value="">Select Impact</option>
                            {impacts.map(impact => (
                              <option key={impact.id} value={impact.id}>{impact.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Incident State (if applicable)</label>
                          <select className="form-select" name="incidentstate_id" value={formData.incidentstate_id || ''} onChange={handleInputChange}>
                            <option value="">Select Incident State</option>
                            {incidentStates.map(state => (
                              <option key={state.id} value={state.id}>{state.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Logical Operator *</label>
                          <select className="form-select" name="logical_operator_id" value={formData.logical_operator_id} onChange={handleInputChange} required>
                            {logicalOperators.map(operator => (
                              <option key={operator.id} value={operator.id}>{operator.name}</option>
                            ))}
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
                  <button type="button" className="btn btn-warning" onClick={updateSLACondition} disabled={updating}>
                    {updating ? <><span className="spinner-border spinner-border-sm me-2"></span>Updating...</> : 'Update Condition'}
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
                  <h5 className="modal-title">Delete SLA Condition</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setDeleteModal(false)} disabled={deleting}></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete this SLA condition?</p>
                  <p className="text-muted">This action cannot be undone and may affect SLA processing.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setDeleteModal(false)} disabled={deleting}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={deleteSLACondition} disabled={deleting}>
                    {deleting ? <><span className="spinner-border spinner-border-sm me-2"></span>Deleting...</> : 'Delete Condition'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* View Modal */}
      {viewModal && viewingCondition && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header bg-info text-white">
                  <h5 className="modal-title">SLA Condition Details</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setViewModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <h6>Condition Information</h6>
                      <table className="table table-borderless table-sm">
                        <tbody>
                          <tr><td><strong>ID:</strong></td><td>{viewingCondition.id}</td></tr>
                          <tr><td><strong>SLA Definition:</strong></td><td>{getSLADefinitionName(viewingCondition.sla_defination_id)}</td></tr>
                          <tr><td><strong>SLA State:</strong></td><td>{getSLAStateName(viewingCondition.sla_state_id)}</td></tr>
                          <tr><td><strong>Field:</strong></td><td>{getFieldName(viewingCondition.sla_incident_field_id)}</td></tr>
                          <tr><td><strong>Operator:</strong></td><td>{viewingCondition.operator}</td></tr>
                          <tr><td><strong>Value:</strong></td><td>{getValueName(viewingCondition)}</td></tr>
                          <tr><td><strong>Logical Operator:</strong></td><td>{getLogicalOperatorName(viewingCondition.logical_operator_id)}</td></tr>
                          <tr><td><strong>Created:</strong></td><td>{formatDate(viewingCondition.created_at)}</td></tr>
                          <tr><td><strong>Updated:</strong></td><td>{formatDate(viewingCondition.updated_at)}</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="col-md-6">
                      <h6>Technical Details</h6>
                      <table className="table table-borderless table-sm">
                        <tbody>
                          <tr><td><strong>Definition ID:</strong></td><td>{viewingCondition.sla_defination_id}</td></tr>
                          <tr><td><strong>State ID:</strong></td><td>{viewingCondition.sla_state_id}</td></tr>
                          <tr><td><strong>Field ID:</strong></td><td>{viewingCondition.sla_incident_field_id}</td></tr>
                          <tr><td><strong>Impact ID:</strong></td><td>{viewingCondition.impact_id || 'N/A'}</td></tr>
                          <tr><td><strong>Incident State ID:</strong></td><td>{viewingCondition.incidentstate_id || 'N/A'}</td></tr>
                          <tr><td><strong>Logical Op ID:</strong></td><td>{viewingCondition.logical_operator_id}</td></tr>
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

export default SLAConditions;
