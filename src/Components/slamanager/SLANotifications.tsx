import React, { useState } from 'react';

const SLANotifications = () => {
  // State for SLA notifications
  const [slaNotifications, setSlaNotifications] = useState([
    {
      id: 1,
      name: 'Narayan',
      email: 'ajay.apndey@apextechno.co.uk',
      mobile: '',
      group: 'Incident Handler',
      for: 'response',
      createdAt: '2025-04-20 22:04:51'
    }
  ]);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card mt-4">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">All SLA Notification</h5>
                <button className="btn btn-success btn-sm">
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
                      <th>Name</th>
                      <th>Email</th>
                      <th>Mobile</th>
                      <th>Group</th>
                      <th>For</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slaNotifications.map((notification) => (
                      <tr key={notification.id}>
                        <td>{notification.id}</td>
                        <td>{notification.name}</td>
                        <td>{notification.email}</td>
                        <td>{notification.mobile || '-'}</td>
                        <td>{notification.group}</td>
                        <td>{notification.for}</td>
                        <td>{notification.createdAt}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <button className="btn btn-primary btn-sm">
                              ≡
                            </button>
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
                  Showing 1 to 1 of 1 entry
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
    </div>
  );
};

export default SLANotifications;
