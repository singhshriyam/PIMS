// Components/admin/AllRoles.tsx
'use client'
import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardHeader,
  Button,
  Table,
  Badge,
  Alert,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormGroup,
  Label
} from 'reactstrap';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fetchRoles } from '../../../../src/app/(MainBody)/services/masterService';


const AllRoles: React.FC = () => {
  const router = useRouter();

  // State management
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });

  // Load roles from API when component mounts
  useEffect(() => {
    loadRoles();
  }, []);

  // Function to load roles from API
  const loadRoles = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetchRoles();
      setRoles(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  // Filter roles based on search term
  const filteredRoles = roles.filter(role =>
    role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle edit role
  const handleEdit = (role: any) => {
    setEditingRole(role);
    setEditFormData({
      name: role.name,
      description: role.description || '',
      is_active: role.is_active
    });
    setShowEditModal(true);
  };

  // Handle update role
  const handleUpdateRole = async () => {
    if (!editingRole) return;

    setLoading(true);
    setError('');

    try {
      // TODO: Replace with actual API call when update endpoint is available
      // await updateRole(editingRole.id, editFormData);

      // For now, update locally
      setRoles(prev => prev.map(role =>
        role.id === editingRole.id
          ? { ...role, ...editFormData }
          : role
      ));

      setSuccess('Role updated successfully!');
      setShowEditModal(false);
      setEditingRole(null);
      setEditFormData({ name: '', description: '', is_active: true });

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete role
  const handleDelete = async (id: number, roleName: string) => {
    if (!window.confirm(`Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // TODO: Replace with actual API call when delete endpoint is available
      // await deleteRole(id);

      // For now, delete locally
      setRoles(prev => prev.filter(role => role.id !== id));
      setSuccess('Role deleted successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to delete role');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit form input changes
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Close edit modal
  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingRole(null);
    setEditFormData({ name: '', description: '', is_active: true });
    setError('');
  };

  return (
    <Container fluid>
      {/* Page Header */}
      <Row>
        <Col xs={12}>
          <Card className="mb-4 mt-4">
            <CardBody>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-1">All Roles</h4>
                  <p className="text-muted mb-0">Manage user roles and permissions</p>
                </div>
                <Button
                  color="primary"
                  onClick={() => router.push('/dashboard/admin/create-role')}
                >
                  <Plus size={16} className="me-1" />
                  Create Role
                </Button>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader>
              <div className="d-flex align-items-center">
                <Shield size={20} />
                <div className="ms-3">
                  <h5 className="mb-0">Roles Management</h5>
                  <small className="text-muted">View and manage all user roles</small>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {/* Error Alert */}
              {error && (
                <Alert color="danger" className="mb-3">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong>Error:</strong> {error}
                    </div>
                    <Button color="outline-danger" size="sm" onClick={loadRoles}>
                      Retry
                    </Button>
                  </div>
                </Alert>
              )}

              {/* Success Alert */}
              {success && (
                <Alert color="success" className="mb-3">
                  {success}
                </Alert>
              )}

              {/* Loading state */}
              {loading && (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              )}

              {/* Content when not loading */}
              {!loading && (
                <>
                  {/* Roles Table */}
                  <div className="table-responsive">
                    <Table hover>
                      <thead className="table-light">
                        <tr>
                          <th>ID</th>
                          <th>Role Name</th>
                          <th>Group</th>
                          <th>Description</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRoles.map((role) => (
                          <tr key={role.id}>
                            <td>
                              <span className="fw-medium text-primary">{role.id}</span>
                            </td>
                            <td className="fw-medium">{role.name}</td>
                            <td>
                              <Badge color="primary" className="px-2">
                                {role.group_name}
                              </Badge>
                            </td>
                            <td>
                              <span title={role.description}>
                                {role.description && role.description.length > 50
                                  ? role.description.substring(0, 50) + '...'
                                  : role.description || '-'
                                }
                              </span>
                            </td>
                            <td>
                              <div className="d-flex gap-2">
                                <Button
                                  color="outline-primary"
                                  size="sm"
                                  onClick={() => handleEdit(role)}
                                  title="Edit Role"
                                >
                                  <Edit size={14} />
                                </Button>
                                <Button
                                  color="outline-danger"
                                  size="sm"
                                  onClick={() => handleDelete(role.id, role.name)}
                                  title="Delete Role"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {/* Empty State */}
                  {filteredRoles.length === 0 && !error && (
                    <div className="text-center py-5">
                      <p className="text-muted">
                        {searchTerm ? 'No matching roles found' : 'No roles available'}
                      </p>
                      {!searchTerm && (
                        <Button
                          color="primary"
                          onClick={() => router.push('/dashboard/admin/create-role')}
                        >
                          <Plus size={16} className="me-1" />
                          Create First Role
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Edit Role Modal */}
      <Modal isOpen={showEditModal} toggle={closeEditModal} size="lg">
        <ModalHeader toggle={closeEditModal}>
          <div className="d-flex align-items-center">
            <Shield size={20} />
            <span className="ms-2">Edit Role</span>
          </div>
        </ModalHeader>
        <ModalBody>
          {error && (
            <Alert color="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <Row>
            <Col md={12}>
              <FormGroup>
                <Label>Role Name <span className="text-danger">*</span></Label>
                <Input
                  type="text"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  placeholder="Enter role name"
                />
              </FormGroup>
            </Col>
            <Col md={12}>
              <FormGroup>
                <Label>Description</Label>
                <Input
                  type="textarea"
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditInputChange}
                  placeholder="Enter role description"
                  rows={3}
                />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={closeEditModal}>
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={handleUpdateRole}
            disabled={loading || !editFormData.name.trim()}
          >
            {loading ? 'Updating...' : 'Update Role'}
          </Button>
        </ModalFooter>
      </Modal>
    </Container>
  );
};

export default AllRoles;
