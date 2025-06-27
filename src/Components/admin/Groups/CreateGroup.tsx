// src/Components/admin/Groups/CreateGroup.tsx
'use client'
import React, { useState } from 'react';
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
import { Save, Users, ArrowLeft, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

const CreateGroup: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!formData.name.trim()) {
      setError('Group name is required');
      setLoading(false);
      return;
    }

    // Simulate API call
    setTimeout(() => {
      try {
        // TODO: Replace with actual API call when create group endpoint is available
        // await createGroup(formData);

        setSuccess('Group created successfully!');

        // Reset form
        setFormData({ name: '', description: '', is_active: true });

        // Redirect after success
        setTimeout(() => {
          router.push('/dashboard/admin/all-groups');
        }, 1500);
      } catch (err: any) {
        setError(err.message || 'Failed to create group');
      } finally {
        setLoading(false);
      }
    }, 1000);
  };

  const handleReset = () => {
    setFormData({ name: '', description: '', is_active: true });
    setError('');
    setSuccess('');
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
                  <h4 className="mb-1">Create Group</h4>
                  <p className="text-muted mb-0">Create a new user group for organizing users and permissions</p>
                </div>
                <Button
                  color="outline-secondary"
                  onClick={() => router.push('/dashboard/admin/all-groups')}
                >
                  <ArrowLeft size={16} className="me-1" />
                  Back to Groups
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
                <Users size={20} />
                <div className="ms-3">
                  <h5 className="mb-0">Create New Group</h5>
                  <small className="text-muted">Add a new user group to organize permissions and access</small>
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
                  <Col md={12}>
                    <FormGroup>
                      <Label>
                        Group Name <span className="text-danger">*</span>
                      </Label>
                      <Input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter group name (e.g., Administrators, Field Team)"
                        disabled={loading}
                      />
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
                        placeholder="Describe the group's purpose, responsibilities, and scope of access..."
                        rows={4}
                        disabled={loading}
                      />
                    </FormGroup>
                  </Col>
                </Row>

                {/* Form Actions */}
                <hr className="my-4" />
                <div className="d-flex gap-2 justify-content-end">
                  <Button
                    color="secondary"
                    type="button"
                    onClick={() => router.push('/dashboard/admin/all-groups')}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    color="primary"
                    type="submit"
                    disabled={loading || !formData.name.trim()}
                  >
                    <Save size={16} className="me-1" />
                    {loading ? 'Creating...' : 'Create Group'}
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

export default CreateGroup;
