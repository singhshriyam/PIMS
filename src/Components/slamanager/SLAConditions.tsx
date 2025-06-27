import React, { useState } from 'react';

interface Condition {
  id: number;
  slaState: string;
  incidentField: string;
  operator: string;
  logicalOperator: string;
}

const SLAConditions = () => {
  // State for SLA conditions
  const [slaConditions, setSlaConditions] = useState([
    {
      id: 1,
      slaDefinition: 'Response',
      slaState: 'Start',
      incidentField: 'Incident State',
      operator: '==',
      value: 'New',
      logicalOperator: 'OR',
      createdAt: '2025-04-23 17:12:21'
    },
    {
      id: 2,
      slaDefinition: 'Resolution-Significant',
      slaState: 'Start',
      incidentField: 'Impact',
      operator: '==',
      value: 'Significant',
      logicalOperator: 'OR',
      createdAt: '2025-04-23 17:12:41'
    },
    {
      id: 3,
      slaDefinition: 'Resolution-Moderate',
      slaState: 'Start',
      incidentField: 'Impact',
      operator: '==',
      value: 'Moderate',
      logicalOperator: 'OR',
      createdAt: '2025-04-23 17:13:03'
    },
    {
      id: 4,
      slaDefinition: 'Resolution-Low',
      slaState: 'Start',
      incidentField: 'Impact',
      operator: '==',
      value: 'Low',
      logicalOperator: 'OR',
      createdAt: '2025-04-23 17:13:21'
    }
  ]);

  // Modal states
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    conditionFor: 'Start',
    field: 'Incident State',
    operator: '==',
    logicalOperator: 'OR'
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Alert state
  const [alert, setAlert] = useState({ show: false, message: '', color: '' });

  // Show alert
  const showAlert = (message: string, color = 'success') => {
    setAlert({ show: true, message, color });
    setTimeout(() => setAlert({ show: false, message: '', color: '' }), 3000);
  };

  // Handle create
  const handleCreate = () => {
    setFormData({
      conditionFor: 'Start',
      field: 'Incident State',
      operator: '==',
      logicalOperator: 'OR'
    });
    setCreateModal(true);
  };

  // Handle edit
  const handleEdit = (condition: Condition) => {
    setFormData({
      conditionFor: condition.slaState,
      field: condition.incidentField,
      operator: condition.operator,
      logicalOperator: condition.logicalOperator
    });
    setEditingId(condition.id);
    setEditModal(true);
  };

  // Handle delete
  const handleDelete = (id: number) => {
    setDeletingId(id);
    setDeleteModal(true);
  };

  // Submit create
  const submitCreate = () => {
    const newCondition = {
      id: 5,
      slaDefinition: 'New SLA',
      slaState: formData.conditionFor,
      incidentField: formData.field,
      operator: formData.operator,
      value: 'New Value',
      logicalOperator: formData.logicalOperator,
      createdAt: '2025-04-24 10:30:00'
    };

    setSlaConditions([...slaConditions, newCondition]);
    setCreateModal(false);
    showAlert('SLA Condition created successfully!');
  };

  // Submit edit
  const submitEdit = () => {
    setSlaConditions(slaConditions.map(condition =>
      condition.id === editingId
        ? {
            ...condition,
            slaState: formData.conditionFor,
            incidentField: formData.field,
            operator: formData.operator,
            logicalOperator: formData.logicalOperator
          }
        : condition
    ));

    setEditModal(false);
    setEditingId(null);
    showAlert('SLA Condition updated successfully!');
  };

  // Confirm delete
  const confirmDelete = () => {
    setSlaConditions(slaConditions.filter(condition => condition.id !== deletingId));
    setDeleteModal(false);
    setDeletingId(null);
    showAlert('SLA Condition deleted successfully!');
  };

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  return (
    <div className="container-fluid">
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
                <h5 className="mb-0">SLA Conditions</h5>
                <button className="btn btn-success btn-sm" onClick={handleCreate}>
                  + Add SLA Conditions
                </button>
              </div>
            </div>

            <div className="card-body">
              <div className="mb-3">
                <h6>SLA: Response , Type: SLA , Target:Response, Time:3 minutes</h6>
              </div>

              {/* Search Controls */}
              <div className="row mb-3">
                <div className="col-md-6">
                  <div className="d-flex align-items-center">
                    <span className="me-2">Show</span>
                    <select className="form-select me-2" style={{ width: 'auto' }}>
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
                        placeholder="Search..."
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
                      <th>SLA State</th>
                      <th>Incident Field</th>
                      <th>Operator</th>
                      <th>Value</th>
                      <th>Logical Operator</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slaConditions.map((condition) => (
                      <tr key={condition.id}>
                        <td>{condition.id}</td>
                        <td>{condition.slaState}</td>
                        <td>{condition.incidentField}</td>
                        <td>{condition.operator}</td>
                        <td>{condition.value}</td>
                        <td>{condition.logicalOperator}</td>
                        <td>{condition.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Info */}
              <div className="mt-3 d-flex justify-content-between align-items-center">
                <div className="text-muted">
                  Showing 1 to 4 of 4 entries
                </div>
                <div>
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className="page-item disabled">
                        <span className="page-link">Previous</span>
                      </li>
                      <li className="page-item active">
                        <span className="page-link">1</span>
                      </li>
                      <li className="page-item disabled">
                        <span className="page-link">Next</span>
                      </li>
                    </ul>
                  </nav>
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
                  <h5 className="modal-title">Add Sla Condition</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setCreateModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Condition For</label>
                        <input
                          type="text"
                          className="form-control"
                          name="conditionFor"
                          value={formData.conditionFor}
                          onChange={handleInputChange}
                          placeholder="Select"
                        />
                        <select
                          className="form-select mt-2"
                          name="conditionFor"
                          value={formData.conditionFor}
                          onChange={handleInputChange}
                        >
                          <option value="Start">Start</option>
                          <option value="Cancel">Cancel</option>
                          <option value="Pause">Pause</option>
                          <option value="Resume">Resume</option>
                          <option value="Stop">Stop</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Field</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Select field"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Operator</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Select Operator"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Select Logical Operator</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Select Operator"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={submitCreate}>
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
                  <h5 className="modal-title">Edit SLA Condition</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setEditModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Condition For</label>
                        <select
                          className="form-select"
                          name="conditionFor"
                          value={formData.conditionFor}
                          onChange={handleInputChange}
                        >
                          <option value="Start">Start</option>
                          <option value="Cancel">Cancel</option>
                          <option value="Pause">Pause</option>
                          <option value="Resume">Resume</option>
                          <option value="Stop">Stop</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Field</label>
                        <select
                          className="form-select"
                          name="field"
                          value={formData.field}
                          onChange={handleInputChange}
                        >
                          <option value="Incident State">Incident State</option>
                          <option value="Impact">Impact</option>
                          <option value="Priority">Priority</option>
                          <option value="Category">Category</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Operator</label>
                        <select
                          className="form-select"
                          name="operator"
                          value={formData.operator}
                          onChange={handleInputChange}
                        >
                          <option value="==">==</option>
                          <option value="!=">!=</option>
                          <option value=">">&gt;</option>
                          <option value="<">&lt;</option>
                          <option value=">=">&gt;=</option>
                          <option value="<=">&lt;=</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Select Logical Operator</label>
                        <select
                          className="form-select"
                          name="logicalOperator"
                          value={formData.logicalOperator}
                          onChange={handleInputChange}
                        >
                          <option value="OR">OR</option>
                          <option value="AND">AND</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditModal(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-warning" onClick={submitEdit}>
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
                  <h5 className="modal-title">Delete Category</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setDeleteModal(false)}></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure want to delete ?</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setDeleteModal(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-danger" onClick={confirmDelete}>
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

export default SLAConditions;
