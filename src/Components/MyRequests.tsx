'use client'
import React, { useState, useEffect } from 'react'
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardHeader,
  Button,
  Badge,
  Table,
  Spinner,
  Alert
} from 'reactstrap'

// Types
interface Request {
  id: string
  request_number: string
  title: string
  category: string
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'completed'
  requested_at: string
  updated_at: string
}

interface MyRequestsProps {
  userType: 'manager' | 'handler' | 'expert_team' | 'end_user'
  onBack: () => void
}

// Mock data
const MOCK_REQUESTS: Request[] = [
  {
    id: '1',
    request_number: 'REQ-2024-001',
    title: 'New Equipment Purchase Request',
    category: 'Equipment',
    status: 'in_progress',
    requested_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-16T14:20:00Z'
  },
  {
    id: '2',
    request_number: 'REQ-2024-002',
    title: 'Training Program Request',
    category: 'Training',
    status: 'approved',
    requested_at: '2024-01-10T09:15:00Z',
    updated_at: '2024-01-12T11:45:00Z'
  },
  {
    id: '3',
    request_number: 'REQ-2024-003',
    title: 'Software License Renewal',
    category: 'Software',
    status: 'completed',
    requested_at: '2024-01-05T14:20:00Z',
    updated_at: '2024-01-08T16:30:00Z'
  },
  {
    id: '4',
    request_number: 'REQ-2024-004',
    title: 'Additional Staff Request',
    category: 'Staffing',
    status: 'pending',
    requested_at: '2024-01-20T11:00:00Z',
    updated_at: '2024-01-20T11:00:00Z'
  },
  {
    id: '5',
    request_number: 'REQ-2024-005',
    title: 'Office Space Modification',
    category: 'Facilities',
    status: 'rejected',
    requested_at: '2024-01-12T08:45:00Z',
    updated_at: '2024-01-14T13:20:00Z'
  }
]

const MyRequests: React.FC<MyRequestsProps> = ({ userType, onBack }) => {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMyRequests()
  }, [])

  const fetchMyRequests = async () => {
    try {
      setLoading(true)
      setError(null)

      // TODO: Replace with actual API call
      // const response = await fetch('/api/my-requests')
      // const data = await response.json()

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      setRequests(MOCK_REQUESTS)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch requests')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'in_progress': return 'info'
      case 'approved': return 'success'
      case 'rejected': return 'danger'
      case 'completed': return 'success'
      default: return 'secondary'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <Spinner color="primary" />
          <p className="mt-3 text-muted">Loading your requests...</p>
        </div>
      </Container>
    )
  }

  return (
    <Container fluid>
      {/* Header */}
      <Row>
        <Col xs={12}>
          <Card className="mb-4 mt-4">
            <CardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-0">📋 My Requests</h4>
                </div>
                <Button color="outline-secondary" onClick={onBack}>
                  ← Back
                </Button>
              </div>
            </CardHeader>
          </Card>
        </Col>
      </Row>

      {error && (
        <Row>
          <Col xs={12}>
            <Alert color="danger">
              <strong>Error:</strong> {error}
              <Button color="link" onClick={fetchMyRequests} className="p-0 ms-2">
                Try again
              </Button>
            </Alert>
          </Col>
        </Row>
      )}

      {/* Requests List */}
      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader>
              <h5 className="mb-0">Request History ({requests.length})</h5>
            </CardHeader>
            <CardBody>
              {requests.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted">No requests found</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover>
                    <thead className="table-light">
                      <tr>
                        <th>Request #</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Requested</th>
                        <th>Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((request) => (
                        <tr key={request.id}>
                          <td>
                            <span className="fw-medium text-primary">{request.request_number}</span>
                          </td>
                          <td>{request.title}</td>
                          <td>
                            <Badge color="light" className="text-dark">{request.category}</Badge>
                          </td>
                          <td>
                            <Badge color={getStatusColor(request.status)}>
                              {request.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </td>
                          <td>{formatDate(request.requested_at)}</td>
                          <td>{formatDate(request.updated_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default MyRequests
