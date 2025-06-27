// src/Components/admin/Groups/AllGroups.tsx
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
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Mock data for groups (API not implemented yet)
const mockGroups = [
  {
    id: 1,
    name: 'Administrators',
    description: 'System administrators with full access to all system functions and settings',
    is_active: true
  },
  {
    id: 2,
    name: 'Incident Managers',
    description: 'Responsible for managing and coordinating incident response activities',
    is_active: true
  },
  {
    id: 3,
    name: 'Field Engineers',
    description: 'Technical staff who handle field operations and equipment maintenance',
    is_active: true
  },
  {
    id: 4,
    name: 'Expert Team',
    description: 'Quality assurance specialists and compliance monitoring team',
    is_active: false
  },
  {
    id: 5,
    name: 'Incident Handler',
    description: 'Daily operations management and coordination staff',
    is_active: true
  }
];

const AllGroups: React.FC = () => {
  const router = useRouter();

  // State management
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });

  // Load groups when component mounts
  useEffect(() => {
    loadGroups();
  }, []);

  // Function to load groups - currently using mock data
  const loadGroups = async () => {
    setLoading(true);
    setError('');

    try {
      // Simulate API loading delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // TODO: Replace with actual API call when available
      // const response = await fetchGroups();
      // setGroups(response.data || []);

      // Using mock data for now
      setGroups(mockGroups);
    } catch (err: any) {
      setError(err.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  // Filter groups based on search term
  const filteredGroups = groups.filter(group =>
    group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle edit group
  const handleEdit = (group: any) => {
    setEditingGroup(group);
    setEditFormData({
      name: group.name,
      description: group.description || '',
      is_active: group.is_active
    });
    setShowEditModal(true);
  };

  // Handle update group
  const handleUpdateGroup = async () => {
    if (!editingGroup) return;

    setLoading(true);
    setError('');

    try {
      // TODO: Replace with actual API call when update endpoint is available
      // await updateGroup(editingGroup.id, editFormData);

      // For now, update locally
      setGroups(prev => prev.map(group =>
        group.id === editingGroup.id
          ? { ...group, ...editFormData }
          : group
      ));

      setSuccess('Group updated successfully!');
      setShowEditModal(false);
      setEditingGroup(null);
      setEditFormData({ name: '', description: '', is_active: true });

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to update group');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete group
  const handleDelete = async (id: number, groupName: string) => {
    if (!window.confirm(`Are you sure you want to delete the group "${groupName}"? This action cannot be undone and will affect all users in this group.`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // TODO: Replace with actual API call when delete endpoint is available
      // await deleteGroup(id);

      // For now, delete locally
      setGroups(prev => prev.filter(group => group.id !== id));
      setSuccess('Group deleted successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to delete group');
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
    setEditingGroup(null);
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
                  <h4 className="mb-1">All Groups</h4>
                  <p className="text-muted mb-0">Manage user groups and their permissions</p>
                </div>
                <Button
                  color="primary"
                  onClick={() => router.push('/dashboard/admin/create-group')}
                >
                  <Plus size={16} className="me-1" />
                  Create Group
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
                <Users size={20} />
                <div className="ms-3">
                  <h5 className="mb-0">Groups Management</h5>
                  <small className="text-muted">View and manage all user groups</small>
                  <Badge color="warning" size="sm" className="ms-2">Mock Data</Badge>
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
                    <Button color="outline-danger" size="sm" onClick={loadGroups}>
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
                  {/* Groups Table */}
                  <div className="table-responsive">
                    <Table hover>
                      <thead className="table-light">
                        <tr>
                          <th>ID</th>
                          <th>Group Name</th>
                          <th>Description</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredGroups.map((group) => (
                          <tr key={group.id}>
                            <td>
                              <span className="fw-medium text-primary">{group.id}</span>
                            </td>
                            <td className="fw-medium">{group.name}</td>
                            <td>
                              <span title={group.description}>
                                {group.description && group.description.length > 80
                                  ? group.description.substring(0, 80) + '...'
                                  : group.description || '-'
                                }
                              </span>
                            </td>
                            <td>
                              <div className="d-flex gap-2">
                                <Button
                                  color="outline-primary"
                                  size="sm"
                                  onClick={() => handleEdit(group)}
                                  title="Edit Group"
                                >
                                  <Edit size={14} />
                                </Button>
                                <Button
                                  color="outline-danger"
                                  size="sm"
                                  onClick={() => handleDelete(group.id, group.name)}
                                  title="Delete Group"
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
                  {filteredGroups.length === 0 && !error && (
                    <div className="text-center py-5">
                      <p className="text-muted">No groups available</p>
                      <Button
                        color="primary"
                        onClick={() => router.push('/dashboard/admin/create-group')}
                      >
                        <Plus size={16} className="me-1" />
                        Create First Group
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Edit Group Modal */}
      <Modal isOpen={showEditModal} toggle={closeEditModal} size="lg">
        <ModalHeader toggle={closeEditModal}>
          <div className="d-flex align-items-center">
            <Users size={20} />
            <span className="ms-2">Edit Group</span>
          </div>
        </ModalHeader>
        <ModalBody>
          {error && (
            <Alert color="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>Group Name <span className="text-danger">*</span></Label>
                <Input
                  type="text"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  placeholder="Enter group name"
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
                  placeholder="Enter group description"
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
            onClick={handleUpdateGroup}
            disabled={loading || !editFormData.name.trim()}
          >
            {loading ? 'Updating...' : 'Update Group'}
          </Button>
        </ModalFooter>
      </Modal>
    </Container>
  );
};

export default AllGroups;
