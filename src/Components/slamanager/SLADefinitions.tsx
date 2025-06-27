import React, { useState } from 'react';

interface SLADefinition {
  id: number;
  name: string;
  type: string;
  target: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  createdAt: string;
  status: string;
}

const SLADefinitions = () => {
  // State for SLA definitions
  const [slaDefinitions, setSlaDefinitions] = useState([
    {
      id: 1,
      name: 'Response',
      type: 'SLA',
      target: 'Response',
      days: 0,
      hours: 0,
      minutes: 3,
      seconds: 0,
      createdAt: '2025-04-23 17:09:32',
      status: 'Inactive'
    },
    {
      id: 2,
      name: 'Resolution-Significant',
      type: 'SLA',
      target: 'Resolution',
      days: 0,
      hours: 0,
      minutes: 3,
      seconds: 0,
      createdAt: '2025-04-23 17:10:10',
      status: 'Active'
    },
    {
      id: 3,
      name: 'Resolution-Moderate',
      type: 'SLA',
      target: 'Resolution',
      days: 0,
      hours: 0,
      minutes: 3,
      seconds: 0,
      createdAt: '2025-04-23 17:10:31',
      status: 'Active'
    },
    {
      id: 4,
      name: 'Resolution-Low',
      type: 'SLA',
      target: 'Resolution',
      days: 0,
      hours: 0,
      minutes: 3,
      seconds: 0,
      createdAt: '2025-04-23 17:10:59',
      status: 'Active'
    }
  ]);

  // Modal states
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    type: 'SLA',
    target: 'Response',
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

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
      name: '',
      type: 'SLA',
      target: 'Response',
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0
    });
    setCreateModal(true);
  };

  // Handle edit
  const handleEdit = (definition: SLADefinition) => {
    setFormData({
      name: definition.name,
      type: definition.type,
      target: definition.target,
      days: definition.days,
      hours: definition.hours,
      minutes: definition.minutes,
      seconds: definition.seconds
    });
    setEditingId(definition.id);
    setEditModal(true);
  };

  // Handle delete
  const handleDelete = (id: number) => {
    setDeletingId(id);
    setDeleteModal(true);
  };

  // Submit create
  const submitCreate = () => {
    const newDefinition = {
      id: 5,
      ...formData,
      createdAt: '2025-04-24 10:30:00',
      status: 'Active'
    };

    setSlaDefinitions([...slaDefinitions, newDefinition]);
    setCreateModal(false);
    showAlert('SLA Definition created successfully!');
  };

  // Submit edit
  const submitEdit = () => {
    setSlaDefinitions(slaDefinitions.map(def =>
      def.id === editingId
        ? { ...def, ...formData }
        : def
    ));

    setEditModal(false);
    setEditingId(null);
    showAlert('SLA Definition updated successfully!');
  };

  // Confirm delete
  const confirmDelete = () => {
    setSlaDefinitions(slaDefinitions.filter(def => def.id !== deletingId));
    setDeleteModal(false);
    setDeletingId(null);
    showAlert('SLA Definition deleted successfully!');
  };

  // Toggle dropdown
  const toggleDropdown = (id: number) => {
    setOpenDropdown(openDropdown === id ? null : id);
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
                <h5 className="mb-0">SLA Definition List</h5>
                <button className="btn btn-success btn-sm" onClick={handleCreate}>
                  + Add SLA Definition
                </button>
              </div>
            </div>

            <div className="card-body">
              {/* Table */}
              <div className="table-responsive">
                <table className="table table-hover mb-0">
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
                      <th>Created At</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slaDefinitions.map((definition) => (
                      <tr key={definition.id}>
                        <td>{definition.id}</td>
                        <td>{definition.name}</td>
                        <td>{definition.type}</td>
                        <td>{definition.target}</td>
                        <td>{definition.days}</td>
                        <td>{definition.hours}</td>
                        <td>{definition.minutes}</td>
                        <td>{definition.seconds}</td>
                        <td>{definition.createdAt}</td>
                        <td>
                          <span className={`badge ${definition.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}>
                            {definition.status}
                          </span>
                        </td>
                        <td>
                          <div className="position-relative">
                            <button
                              className="btn btn-sm"
                              onClick={() => toggleDropdown(definition.id)}
                            >
                              ≡
                            </button>
                            {openDropdown === definition.id && (
                              <div className="position-absolute bg-white border rounded shadow" style={{ top: '100%', right: 0, zIndex: 1000, minWidth: '120px' }}>
                                <button
                                  className="dropdown-item btn btn-sm w-100 text-start border-0 bg-transparent px-3 py-2 text-primary"
                                  onClick={() => {
                                    handleEdit(definition);
                                    setOpenDropdown(null);
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="dropdown-item btn btn-sm w-100 text-start border-0 bg-transparent px-3 py-2 text-danger"
                                  onClick={() => {
                                    handleDelete(definition.id);
                                    setOpenDropdown(null);
                                  }}
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

              {/* Pagination Info */}
              <div className="mt-3 d-flex justify-content-between align-items-center">
                <div className="text-muted">
                  Showing 1 to 4 of 4 entries
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
                <div className="modal-header">
                  <h5 className="modal-title">Add SLA Definition</h5>
                  <button type="button" className="btn-close" onClick={() => setCreateModal(false)}></button>
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
                          name="type"
                          value={formData.type}
                          onChange={handleInputChange}
                        >
                          <option value="SLA">SLA</option>
                          <option value="OLA">OLA</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Select Target</label>
                        <select
                          className="form-select"
                          name="target"
                          value={formData.target}
                          onChange={handleInputChange}
                        >
                          <option value="Response">Response</option>
                          <option value="Resolution">Resolution</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Cost</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0"
                          min="0"
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
                <div className="modal-header">
                  <h5 className="modal-title">Edit SLA Definition</h5>
                  <button type="button" className="btn-close" onClick={() => setEditModal(false)}></button>
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
                          name="type"
                          value={formData.type}
                          onChange={handleInputChange}
                        >
                          <option value="SLA">SLA</option>
                          <option value="OLA">OLA</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">Select Target</label>
                        <select
                          className="form-select"
                          name="target"
                          value={formData.target}
                          onChange={handleInputChange}
                        >
                          <option value="Response">Response</option>
                          <option value="Resolution">Resolution</option>
                        </select>
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
                <div className="modal-header">
                  <h5 className="modal-title">Delete Category</h5>
                  <button type="button" className="btn-close" onClick={() => setDeleteModal(false)}></button>
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

export default SLADefinitions;
