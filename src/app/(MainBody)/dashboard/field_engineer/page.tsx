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
  Input,
  Badge,
  Alert,
  Label
} from 'reactstrap'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  getCurrentUser,
  isAuthenticated
} from '../../services/userService'
import {
  fetchFieldEngineerIncidents,
  getIncidentStats,
  getStatusColor,
  getPriorityColor,
  type Incident
} from '../../services/incidentService'
import EditIncident from '../../../../Components/EditIncident'
import AssignIncidents from '../../../../Components/AssignIncidents'

const FieldEngineerDashboard = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const view = searchParams?.get('view')

  // State
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const itemsPerPage = 10

  // Helper functions
  const getIncidentNumber = (incident: Incident) => {
    return incident.incident_no || `INC-${incident.id}`
  }

  const getCategoryName = (incident: Incident) => {
    return incident.category?.name || 'Uncategorized'
  }

  const getPriorityName = (incident: Incident) => {
    return incident.priority?.name || incident.urgency?.name || 'Medium'
  }

  const getStatus = (incident: Incident) => {
    if (incident.incidentstate && typeof incident.incidentstate === 'string') {
      return incident.incidentstate
    }
    const state = incident.incidentstate?.name?.toLowerCase() || ''
    if (state === 'new') return 'pending'
    if (state === 'inprogress') return 'in_progress'
    if (state === 'resolved') return 'resolved'
    if (state === 'closed') return 'closed'
    return 'pending'
  }

  const getShortDescription = (incident: Incident) => {
    return incident.short_description || 'No description'
  }

  const getAddress = (incident: Incident) => {
    return incident.address || 'Not specified'
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return 'Unknown'
    }
  }

  // Data fetching
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const currentUser = getCurrentUser()
      if (!currentUser?.id) {
        router.replace('/auth/login')
        return
      }

      setUser(currentUser)

      const fieldIncidents = await fetchFieldEngineerIncidents()
      fieldIncidents.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setIncidents(fieldIncidents)
      setFilteredIncidents(fieldIncidents)
      setCurrentPage(1)
      setLoading(false)

    } catch (error: any) {
      console.error('Field Engineer Dashboard error:', error)
      setError(error.message || 'Failed to load assignments')
      setLoading(false)
    }
  }

  // Event handlers
  const handleEditIncident = (incident: Incident) => {
    setEditingIncident(incident)
    setShowEditModal(true)
  }

  const handleCloseEdit = () => {
    setEditingIncident(null)
    setShowEditModal(false)
    fetchData()
  }

  const handleRefresh = () => {
    fetchData()
  }

  // Effects
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login')
      return
    }
    fetchData()
  }, [router])

  useEffect(() => {
    let filtered = [...incidents]

    if (statusFilter !== 'all') {
      filtered = filtered.filter(incident => getStatus(incident) === statusFilter)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(incident =>
        getShortDescription(incident).toLowerCase().includes(term) ||
        getIncidentNumber(incident).toLowerCase().includes(term) ||
        getCategoryName(incident).toLowerCase().includes(term) ||
        getAddress(incident).toLowerCase().includes(term)
      )
    }

    setFilteredIncidents(filtered)
    setCurrentPage(1)
  }, [incidents, statusFilter, searchTerm])

  // Route handling
  if (view === 'assign-incidents') {
    return (
      <AssignIncidents
        userType="field_engineer"
        onBack={() => router.push('/dashboard/field_engineer')}
      />
    )
  }

  // Loading state
  if (loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="text-muted">Loading Field Assignments</h5>
        </div>
      </Container>
    )
  }

  // Error state
  if (error) {
    return (
      <Container fluid>
        <Alert color="danger" className="mt-3">
          <strong>Error:</strong> {error}
          <div className="mt-2">
            <Button color="primary" onClick={handleRefresh}>
              Try again
            </Button>
          </div>
        </Alert>
      </Container>
    )
  }

  // Edit modal
  if (editingIncident && showEditModal) {
    return (
      <EditIncident
        incident={editingIncident}
        userType="field_engineer"
        onClose={handleCloseEdit}
        onSave={handleCloseEdit}
      />
    )
  }

  // Pagination
  const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentIncidents = filteredIncidents.slice(startIndex, startIndex + itemsPerPage)
  const stats = getIncidentStats(filteredIncidents)

  // Main render
  return (
    <Container fluid>
      {/* Header */}
      <Row>
        <Col xs={12}>
          <Card className="mb-4 mt-4">
            <CardBody>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-1">Welcome back, {user?.first_name || 'Field Engineer'}!</h4>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Stats */}
      <Row>
        {[
          { value: stats.total, label: 'Total Assignments' },
          { value: stats.inProgress, label: 'In Progress' },
          { value: stats.resolved, label: 'Completed' },
          { value: stats.pending, label: 'Pending' }
        ].map((stat, index) => (
          <Col xl={3} md={6} key={index}>
            <Card className="o-hidden">
              <CardBody>
                <div className="text-center">
                  <h5 className="mb-0">{stat.value}</h5>
                  <span className="text-muted">{stat.label}</span>
                </div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader>
              <h5>Filter Assignments</h5>
            </CardHeader>
            <CardBody>
              <Row>
                <Col md={6}>
                  <Label>Search</Label>
                  <Input
                    type="text"
                    placeholder="Search assignments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </Col>
                <Col md={6}>
                  <Label>Status</Label>
                  <Input
                    type="select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </Input>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <h5>🔧 My Field Assignments ({filteredIncidents.length})</h5>
              </div>
            </CardHeader>
            <CardBody>
              {filteredIncidents.length === 0 ? (
                <div className="text-center py-4">
                  <h6 className="text-muted">No assignments found</h6>
                  <Button color="primary" onClick={handleRefresh}>Refresh</Button>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Incident</th>
                          <th>Description</th>
                          {/* <th>Category</th> */}
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Location</th>
                          <th>Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentIncidents.map((incident) => (
                          <tr key={incident.id}>
                            <td>
                              <div>
                                <span className="fw-medium text-primary">
                                  {getIncidentNumber(incident)}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div style={{ maxWidth: '200px' }}>
                                {getShortDescription(incident)}
                              </div>
                            </td>
                            {/* <td>{getCategoryName(incident)}</td> */}
                            <td>
                              <Badge
                                style={{
                                  backgroundColor: getPriorityColor(getPriorityName(incident)),
                                  color: 'white'
                                }}
                              >
                                {getPriorityName(incident)}
                              </Badge>
                            </td>
                            <td>
                              <Badge
                                style={{
                                  backgroundColor: getStatusColor(getStatus(incident)),
                                  color: 'white'
                                }}
                              >
                                {getStatus(incident).replace('_', ' ')}
                              </Badge>
                            </td>
                            <td>
                              <small className="text-muted">{getAddress(incident)}</small>
                            </td>
                            <td>
                              <small>{formatDate(incident.created_at)}</small>
                            </td>
                            <td>
                              <Button
                                color="warning"
                                size="sm"
                                onClick={() => handleEditIncident(incident)}
                              >
                                Update
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="d-flex justify-content-center mt-3">
                      <div className="btn-group">
                        <Button
                          color="outline-primary"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button color="primary" size="sm" disabled>
                          {currentPage} of {totalPages}
                        </Button>
                        <Button
                          color="outline-primary"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Edit Modal */}
      {showEditModal && editingIncident && (
        <EditIncident
          incident={editingIncident}
          userType="field_engineer"
          onClose={handleCloseEdit}
          onSave={handleCloseEdit}
        />
      )}
    </Container>
  )
}

export default FieldEngineerDashboard
