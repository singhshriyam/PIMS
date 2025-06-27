// src/Components/admin/Roles/CreateRole.tsx
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
  FormGroup,
  Label,
  Input,
  Alert
} from 'reactstrap';
import { Save, Shield, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Mock groups data - should be fetched from API
const mockGroups = [
  { id: 1, name: 'Administrators' },
  { id: 2, name: 'Incident Managers' },
  { id: 3, name: 'Field Engineers' },
  { id: 4, name: 'Expert Team' },
  { id: 5, name: 'Incident Handler' }
];

const CreateRole: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    group_id: '',
    description: ''
  });

  // Load groups when component mounts
  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      // TODO: Replace with actual API call when available
      // const response = await fetchGroups();
      // setGroups(response.data || []);

      // Using mock data for now
      setGroups(mockGroups);
    } catch (err: any) {
      setError('Failed to load groups');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!formData.name.trim()) {
      setError('Role name is required');
      setLoading(false);
      return;
    }

    if (!formData.group_id) {
      setError('Please select a group');
      setLoading(false);
      return;
    }

    // Simulate API call
    setTimeout(() => {
      try {
        // TODO: Replace with actual API call when create role endpoint is available
        // await createRole(formData);

        setSuccess('Role created successfully!');

        // Reset form
        setFormData({ name: '', group_id: '', description: '' });

        // Redirect after success
        setTimeout(() => {
          router.push('/dashboard/admin/all-roles');
        }, 1500);
      } catch (err: any) {
        setError(err.message || 'Failed to create role');
      } finally {
        setLoading(false);
      }
    }, 1000);
  };

  const getSelectedGroupName = () => {
    const selectedGroup = groups.find(group => group.id.toString() === formData.group_id);
    return selectedGroup ? selectedGroup.name : '';
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
                  <h4 className="mb-1">Create Role</h4>
                  <p className="text-muted mb-0">Create a new role within a specific group</p>
                </div>
                <Button
                  color="outline-secondary"
                  onClick={() => router.push('/dashboard/admin/all-roles')}
                >
                  <ArrowLeft size={16} className="me-1" />
                  Back to Roles
                </Button>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Main Form */}
      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader>
              <div className="d-flex align-items-center">
                <Shield size={20} />
                <div className="ms-3">
                  <h5 className="mb-0">Add New Role</h5>
                  <small className="text-muted">Create a role within a specific group</small>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {/* Error Alert */}
              {error && (
                <Alert color="danger" className="mb-3">
                  <strong>Error:</strong> {error}
                </Alert>
              )}

              {/* Success Alert */}
              {success && (
                <Alert color="success" className="mb-3">
                  <strong>Success:</strong> {success}
                </Alert>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <FormGroup>
                      <Label>Name <span className="text-danger">*</span></Label>
                      <Input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter role name"
                        disabled={loading}
                      />
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup>
                      <Label>Select Group <span className="text-danger">*</span></Label>
                      <Input
                        type="select"
                        name="group_id"
                        value={formData.group_id}
                        onChange={handleInputChange}
                        required
                        disabled={loading}
                      >
                        <option value="">Select a group</option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md={12}>
                    <FormGroup>
                      <Label>Description</Label>
                      <Input
                        type="textarea"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Describe the role's responsibilities..."
                        rows={4}
                        disabled={loading}
                      />
                    </FormGroup>
                  </Col>
                </Row>

                {/* Preview */}
                {formData.name && formData.group_id && (
                  <div className="mt-3">
                    <Alert color="info">
                      <strong>Preview:</strong> Creating role "{formData.name}" in group "{getSelectedGroupName()}"
                    </Alert>
                  </div>
                )}

                {/* Form Actions */}
                <hr className="my-4" />
                <div className="d-flex gap-2 justify-content-end">
                  <Button
                    color="secondary"
                    type="button"
                    onClick={() => router.push('/dashboard/admin/all-roles')}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    color="primary"
                    type="submit"
                    disabled={loading || !formData.name.trim() || !formData.group_id}
                  >
                    <Save size={16} className="me-1" />
                    {loading ? 'Creating...' : 'SUBMIT'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CreateRole;
