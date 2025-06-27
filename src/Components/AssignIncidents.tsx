'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
  Alert,
  ButtonGroup
} from 'reactstrap'
import { useRouter } from 'next/navigation'
import {
  getCurrentUser,
  isAuthenticated,
  getUserDashboard,
  getStoredToken
} from '../app/(MainBody)/services/userService'
import {
  fetchAllIncidentsForAssignment,
  getStatusColor,
  getPriorityColor,
  type Incident
} from '../app/(MainBody)/services/incidentService'

// TODO: Remove this import when real API is implemented
import { EXPERT_TEAM_FAKE_DATA } from '../app/(MainBody)/dashboard/expert_team/page'

interface AssignIncidentsProps {
  userType?: 'admin' | 'manager' | 'handler' | 'expert' | 'expert_team'
  onBack?: () => void
}

interface AssignmentTarget {
  id: string
  name: string
  email: string
  team: string
  team_id: number
}

interface User {
  id: string
  team: string
  [key: string]: any
}

interface ApiUser {
  first_name: string
  last_name?: string | null
  email: string
  team_name: string
  team_id: number
  mobile?: string | null
  address?: string | null
  postcode?: string | null
  created_at: string
}

interface ApiResponse {
  success: boolean
  data: ApiUser[]
  message: string
}

interface AssignmentPayload {
  user_id: number
  incident_id: number
  from: number
  to: number
  assignee_email: string
  assignee_name: string
  notes: string | null
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://apexwpc.apextechno.co.uk/api'

const ASSIGNABLE_ROLES = ['handler', 'field', 'engineer', 'expert'] as const
const ITEMS_PER_PAGE = 10

const AssignIncidents: React.FC<AssignIncidentsProps> = ({ userType, onBack }) => {
  const router = useRouter()

  // State management
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [selectedAssignee, setSelectedAssignee] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('')
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Assignment targets
  const [assignmentTargets, setAssignmentTargets] = useState<AssignmentTarget[]>([])
  const [allUsers, setAllUsers] = useState<AssignmentTarget[]>([])
  const [availableTeams, setAvailableTeams] = useState<string[]>([])
  const [loadingTargets, setLoadingTargets] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Helper functions
  const getIncidentNumber = useCallback((incident: Incident): string => {
    return incident.incident_no
  }, [])

  const getShortDescription = useCallback((incident: Incident): string => {
    return incident.short_description
  }, [])

  const getCategoryName = useCallback((incident: Incident): string => {
    return incident.category?.name || 'Uncategorized'
  }, [])

  const getCallerName = useCallback((incident: Incident): string => {
    const fullName = incident.user.last_name
      ? `${incident.user.name} ${incident.user.last_name}`
      : incident.user.name
    return fullName
  }, [])

  const getPriorityName = useCallback((incident: Incident): string => {
    if (incident.priority?.name) return incident.priority.name
    if (incident.priority && typeof incident.priority === 'string') return incident.priority
    return incident.urgency?.name || 'Medium'
  }, [])

  const getStatus = useCallback((incident: Incident): 'pending' | 'in_progress' | 'resolved' | 'closed' => {
    if (incident.status) return incident.status
    const state = incident.incidentstate?.name?.toLowerCase()
    if (state === 'new') return 'pending'
    if (state === 'inprogress') return 'in_progress'
    if (state === 'resolved') return 'resolved'
    if (state === 'closed') return 'closed'
    return 'pending'
  }, [])

  const getAssignedToName = useCallback((incident: Incident): string => {
    if (!incident.assigned_to) return 'Unassigned'
    const fullName = incident.assigned_to.last_name
      ? `${incident.assigned_to.name} ${incident.assigned_to.last_name}`
      : incident.assigned_to.name
    return fullName
  }, [])

  const getCreatedAt = useCallback((incident: Incident): string => {
    return incident.created_at
  }, [])

  const isAssigned = useCallback((incident: Incident): boolean => {
    return !!(incident.assigned_to && incident.assigned_to.name)
  }, [])

  const formatDate = useCallback((dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB')
    } catch {
      return 'Invalid Date'
    }
  }, [])

  // Determine assignable roles based on current user
  const getAssignableRoles = useCallback((currentUserRole: string): readonly string[] => {
    const role = currentUserRole.toLowerCase()
    if (role.includes('handler') || role.includes('manager')) {
      return ASSIGNABLE_ROLES
    }
    return ASSIGNABLE_ROLES
  }, [])

  // Fetch assignment targets from backend
  const fetchAssignmentTargets = useCallback(async (): Promise<void> => {
    const token = getStoredToken()
    if (!token) {
      setError('Authentication required')
      return
    }

    if (!user) {
      return
    }

    try {
      setLoadingTargets(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`)
      }

      const result: ApiResponse = await response.json()
      const users = result.data || []

      if (!Array.isArray(users)) {
        throw new Error('Invalid users data format from backend')
      }

      if (users.length === 0) {
        throw new Error('No users found in the system')
      }

      const assignableRoles = getAssignableRoles(user.team || '')

      // Map users to assignment targets with role filtering
      const targets: AssignmentTarget[] = users
        .filter((apiUser: ApiUser): boolean => {
          if (!apiUser.first_name || !apiUser.email) {
            return false
          }

          const userTeam = (apiUser.team_name || '').toLowerCase()
          return assignableRoles.some(role => userTeam.includes(role))
        })
        .map((apiUser: ApiUser): AssignmentTarget => {
          const fullName = apiUser.first_name && apiUser.last_name
            ? `${apiUser.first_name} ${apiUser.last_name}`.trim()
            : apiUser.first_name

          return {
            id: apiUser.email, // Using email as unique identifier
            name: fullName,
            email: apiUser.email,
            team: apiUser.team_name || 'Unknown Team',
            team_id: apiUser.team_id || 0
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name))

      setAssignmentTargets(targets)
      setAllUsers(targets)

      // Extract unique teams
      const teams = [...new Set(targets.map(user => user.team).filter(Boolean))].sort()
      setAvailableTeams(teams)

      if (targets.length === 0) {
        setError('No assignable users found for your role')
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(`Failed to load users: ${errorMessage}`)
      setAssignmentTargets([])
      setAllUsers([])
    } finally {
      setLoadingTargets(false)
    }
  }, [user, getAssignableRoles])

  // Fetch incidents data
  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const currentUser = getCurrentUser()
      if (!currentUser) {
        router.replace('/auth/login')
        return
      }

      setUser(currentUser)

      let fetchedIncidents: Incident[] = []

      if (userType?.includes('expert')) {
        // TODO: Replace with real API call when available
        fetchedIncidents = EXPERT_TEAM_FAKE_DATA
      } else {
        fetchedIncidents = await fetchAllIncidentsForAssignment()
      }

      // Sort by creation date - latest first
      const sortedIncidents = fetchedIncidents.sort((a, b) =>
        new Date(getCreatedAt(b)).getTime() - new Date(getCreatedAt(a)).getTime()
      )

      setIncidents(sortedIncidents)
      setFilteredIncidents(sortedIncidents)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(`Failed to load incidents: ${errorMessage}`)
      setIncidents([])
      setFilteredIncidents([])
    } finally {
      setLoading(false)
    }
  }, [router, userType, getCreatedAt])

  // Filter incidents based on current filters
  const applyFilters = useCallback((): void => {
    let filtered = [...incidents]

    // Apply assignment status filter
    if (statusFilter === 'unassigned') {
      filtered = filtered.filter(incident => !isAssigned(incident))
    } else if (statusFilter === 'assigned') {
      filtered = filtered.filter(incident => isAssigned(incident))
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(incident => getStatus(incident) === statusFilter)
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(incident =>
        getPriorityName(incident).toLowerCase() === priorityFilter.toLowerCase()
      )
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(incident =>
        getShortDescription(incident).toLowerCase().includes(term) ||
        getIncidentNumber(incident).toLowerCase().includes(term) ||
        getCategoryName(incident).toLowerCase().includes(term) ||
        getCallerName(incident).toLowerCase().includes(term)
      )
    }

    // Sort by creation date - latest first
    filtered.sort((a, b) => new Date(getCreatedAt(b)).getTime() - new Date(getCreatedAt(a)).getTime())

    setFilteredIncidents(filtered)
    setCurrentPage(1)
  }, [
    incidents,
    statusFilter,
    priorityFilter,
    searchTerm,
    isAssigned,
    getStatus,
    getPriorityName,
    getShortDescription,
    getIncidentNumber,
    getCategoryName,
    getCallerName,
    getCreatedAt
  ])

  // Handle team selection
  const handleTeamChange = useCallback((selectedTeam: string): void => {
    setSelectedTeam(selectedTeam)
    setSelectedAssignee('')

    if (!selectedTeam) {
      setAssignmentTargets(allUsers)
    } else {
      const filteredUsers = allUsers.filter(user => user.team === selectedTeam)
      setAssignmentTargets(filteredUsers)
    }
  }, [allUsers])

  // Handle assignment modal
  const handleAssignIncident = useCallback((incident: Incident): void => {
    setSelectedIncident(incident)
    setSelectedAssignee('')
    setSelectedTeam('')
    setAssignmentNotes('')
    setError(null)
    setSuccess(null)
    setAssignmentTargets(allUsers)
    setShowAssignModal(true)

    // Fetch users if not loaded
    if (allUsers.length === 0) {
      fetchAssignmentTargets()
    }
  }, [allUsers, fetchAssignmentTargets])

  // Handle assignment submission
  const handleSaveAssignment = useCallback(async (): Promise<void> => {
    if (!selectedIncident || !selectedAssignee || !user) {
      setError('Missing required assignment data')
      return
    }

    const assignee = assignmentTargets.find(target => target.id === selectedAssignee)
    if (!assignee) {
      setError('Invalid assignee selected')
      return
    }

    const token = getStoredToken()
    if (!token) {
      setError('Authentication required')
      return
    }

    try {
      setAssigning(true)
      setError(null)

      const fromUserId = parseInt(user.id)
      const incidentId = parseInt(selectedIncident.id.toString())

      if (isNaN(fromUserId) || isNaN(incidentId)) {
        throw new Error('Invalid user or incident ID')
      }

      const assignmentData: AssignmentPayload = {
        user_id: fromUserId,
        incident_id: incidentId,
        from: fromUserId,
        to: assignee.team_id,
        assignee_email: assignee.email,
        assignee_name: assignee.name,
        notes: assignmentNotes.trim() || null
      }

      const response = await fetch(`${API_BASE_URL}/incident-handler/assign-incident`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(assignmentData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Assignment failed: ${response.status}`

        try {
          const errorData = JSON.parse(errorText)
          if (errorData.message) {
            errorMessage = errorData.message
          }
          if (errorData.data) {
            const validationErrors = Object.entries(errorData.data)
              .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
              .join('; ')
            errorMessage += ` - ${validationErrors}`
          }
        } catch {
          errorMessage += ` - ${errorText}`
        }

        throw new Error(errorMessage)
      }

      // Update local state
      const updatedIncident: Incident = {
        ...selectedIncident,
        assigned_to: {
          ...selectedIncident.assigned_to,
          id: assignee.team_id,
          name: assignee.name.split(' ')[0],
          last_name: assignee.name.split(' ').slice(1).join(' ') || null,
          email: assignee.email,
          team_id: assignee.team_id
        } as any,
        status: 'in_progress',
        updated_at: new Date().toISOString()
      }

      const updatedIncidents = incidents
        .map(incident => incident.id === selectedIncident.id ? updatedIncident : incident)
        .sort((a, b) => new Date(getCreatedAt(b)).getTime() - new Date(getCreatedAt(a)).getTime())

      setIncidents(updatedIncidents)
      setShowAssignModal(false)
      setSelectedIncident(null)
      setSelectedAssignee('')
      setAssignmentNotes('')

      setSuccess(`Incident ${getIncidentNumber(selectedIncident)} successfully assigned to ${assignee.name}`)

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Assignment failed'
      setError(errorMessage)
    } finally {
      setAssigning(false)
    }
  }, [
    selectedIncident,
    selectedAssignee,
    user,
    assignmentTargets,
    assignmentNotes,
    incidents,
    getCreatedAt,
    getIncidentNumber
  ])

  const handleBackToDashboard = useCallback((): void => {
    if (onBack) {
      onBack()
    } else if (user) {
      const dashboardRoute = getUserDashboard(user.team)
      router.push(dashboardRoute)
    }
  }, [onBack, user, router])

  const handleRefresh = useCallback((): void => {
    fetchData()
    fetchAssignmentTargets()
  }, [fetchData, fetchAssignmentTargets])

  // Auto-clear alerts
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Initial data fetch
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login')
      return
    }
    fetchData()
  }, [router, fetchData])

  // Fetch assignment targets when user is loaded
  useEffect(() => {
    if (user && !loadingTargets && allUsers.length === 0) {
      fetchAssignmentTargets()
    }
  }, [user, loadingTargets, allUsers.length, fetchAssignmentTargets])

  // Apply filters when dependencies change
  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  // Memoized values
  const totalPages = useMemo(() =>
    Math.ceil(filteredIncidents.length / ITEMS_PER_PAGE),
    [filteredIncidents.length]
  )

  const currentIncidents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredIncidents.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredIncidents, currentPage])

  const selectedAssigneeData = useMemo(() =>
    assignmentTargets.find(t => t.id === selectedAssignee),
    [assignmentTargets, selectedAssignee]
  )

  const canAssign = useMemo(() =>
    !assigning &&
    !loadingTargets &&
    selectedAssignee &&
    selectedAssignee !== 'undefined' &&
    !!selectedAssigneeData,
    [assigning, loadingTargets, selectedAssignee, selectedAssigneeData]
  )

  if (loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="text-muted">Loading Incidents</h5>
        </div>
      </Container>
    )
  }

  return (
    <>
      <Container fluid>
        {/* Header */}
        <Row>
          <Col xs={12}>
            <Card className="mb-4 mt-4">
              <CardBody>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h4 className="mb-1">🎯 Assign Incidents</h4>
                    <small className="text-muted">
                      {loadingTargets ?
                        'Loading users...' :
                        `${allUsers.length} users available for assignment`
                      }
                    </small>
                  </div>
                  <Button color="secondary" size="sm" onClick={handleBackToDashboard}>
                    ← Back to Dashboard
                  </Button>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Alerts */}
        {success && (
          <Row>
            <Col xs={12}>
              <Alert color="success" toggle={() => setSuccess(null)}>
                <strong>✅ Success!</strong> {success}
              </Alert>
            </Col>
          </Row>
        )}

        {error && (
          <Row>
            <Col xs={12}>
              <Alert color="danger" toggle={() => setError(null)}>
                <strong>❌ Error!</strong> {error}
              </Alert>
            </Col>
          </Row>
        )}

        {loadingTargets && (
          <Row>
            <Col xs={12}>
              <Alert color="info">
                <div className="d-flex align-items-center">
                  <div className="spinner-border spinner-border-sm me-2"></div>
                  <strong>Loading assignment targets...</strong>
                </div>
              </Alert>
            </Col>
          </Row>
        )}

        {/* Filters */}
        <Row>
          <Col xs={12}>
            <Card>
              <CardHeader>
                <div className="d-flex justify-content-between align-items-center">
                  <h5>🔍 Filter Incidents</h5>
                  <Button color="outline-primary" size="sm" onClick={handleRefresh}>
                    🔄 Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                <Row>
                  <Col md={4}>
                    <FormGroup>
                      <Label>Search</Label>
                      <Input
                        type="text"
                        placeholder="Search incidents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </FormGroup>
                  </Col>
                  <Col md={4}>
                    <FormGroup>
                      <Label>Assignment Status</Label>
                      <Input
                        type="select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="all">All Incidents</option>
                        <option value="unassigned">Unassigned Only</option>
                        <option value="assigned">Assigned Only</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md={4}>
                    <FormGroup>
                      <Label>Priority</Label>
                      <Input
                        type="select"
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                      >
                        <option value="all">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                        <option value="critical">Critical</option>
                      </Input>
                    </FormGroup>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Incidents Table */}
        <Row>
          <Col xs={12}>
            <Card>
              <CardHeader>
                <h5>📋 Incidents ({filteredIncidents.length} of {incidents.length})</h5>
              </CardHeader>
              <CardBody>
                {filteredIncidents.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-muted">
                      {incidents.length === 0 ? 'No incidents found' : 'No incidents match the current filters'}
                    </p>
                    <Button color="primary" onClick={handleRefresh}>🔄 Refresh</Button>
                  </div>
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>Incident</th>
                            <th>Category</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Assignment</th>
                            <th>Created</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentIncidents.map((incident) => (
                            <tr key={incident.id}>
                              <td>
                                <div>
                                  <div className="fw-medium">{getIncidentNumber(incident)}</div>
                                  <small className="text-muted">👤 {getCallerName(incident)}</small>
                                </div>
                              </td>
                              <td>
                                <div className="fw-medium">{getCategoryName(incident)}</div>
                              </td>
                              <td>
                                <Badge style={{
                                  backgroundColor: getPriorityColor(getPriorityName(incident)),
                                  color: 'white'
                                }}>
                                  {getPriorityName(incident)}
                                </Badge>
                              </td>
                              <td>
                                <Badge style={{
                                  backgroundColor: getStatusColor(getStatus(incident)),
                                  color: 'white'
                                }}>
                                  {getStatus(incident).replace('_', ' ')}
                                </Badge>
                              </td>
                              <td>
                                {isAssigned(incident) ? (
                                  <div>
                                    <span className="fw-medium text-success">{getAssignedToName(incident)}</span>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="text-danger fw-medium">❌ Unassigned</span>
                                    <br />
                                    <small className="text-muted">Needs assignment</small>
                                  </div>
                                )}
                              </td>
                              <td>
                                <small>{formatDate(getCreatedAt(incident))}</small>
                              </td>
                              <td>
                                <Button
                                  color={isAssigned(incident) ? "warning" : "primary"}
                                  size="sm"
                                  onClick={() => handleAssignIncident(incident)}
                                  disabled={loadingTargets}
                                >
                                  {loadingTargets ? (
                                    <div className="spinner-border spinner-border-sm"></div>
                                  ) : (
                                    isAssigned(incident) ? 'Reassign' : 'Assign'
                                  )}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="d-flex justify-content-center mt-4">
                        <ButtonGroup>
                          <Button
                            outline
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            let pageNum: number
                            if (totalPages <= 5) {
                              pageNum = i + 1
                            } else if (currentPage <= 3) {
                              pageNum = i + 1
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = currentPage - 2 + i
                            }

                            return (
                              <Button
                                key={pageNum}
                                color={currentPage === pageNum ? "primary" : "outline-primary"}
                                onClick={() => setCurrentPage(pageNum)}
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                          <Button
                            outline
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </ButtonGroup>
                      </div>
                    )}
                  </>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Assignment Modal */}
      <Modal isOpen={showAssignModal} toggle={() => setShowAssignModal(false)} size="lg">
        <ModalHeader toggle={() => setShowAssignModal(false)}>
          Assign Incident - {selectedIncident ? getIncidentNumber(selectedIncident) : ''}
        </ModalHeader>
        <ModalBody>
          {selectedIncident && (
            <>
              {/* Incident Details Summary */}
              <div className="mb-3 p-3 bg-light rounded">
                <h6 className="mb-2">Incident Details:</h6>
                <div><strong>Number:</strong> {getIncidentNumber(selectedIncident)}</div>
                <div><strong>Description:</strong> {getShortDescription(selectedIncident)}</div>
                <div><strong>Caller:</strong> {getCallerName(selectedIncident)}</div>
                <div><strong>Priority:</strong>
                  <Badge
                    className="ms-1"
                    style={{
                      backgroundColor: getPriorityColor(getPriorityName(selectedIncident)),
                      color: 'white'
                    }}
                  >
                    {getPriorityName(selectedIncident)}
                  </Badge>
                </div>
                {isAssigned(selectedIncident) && (
                  <div><strong>Currently Assigned To:</strong> {getAssignedToName(selectedIncident)}</div>
                )}
              </div>

              <Form>
                <FormGroup>
                  <Label className="fw-bold">Select Team First (Optional)</Label>
                  <Input
                    type="select"
                    value={selectedTeam}
                    onChange={(e) => handleTeamChange(e.target.value)}
                    disabled={loadingTargets}
                  >
                    <option value="">
                      {loadingTargets ?
                        'Loading teams...' :
                        `All Teams (${allUsers.length} users)`
                      }
                    </option>
                    {availableTeams.map(team => {
                      const teamUserCount = allUsers.filter(user => user.team === team).length
                      return (
                        <option key={team} value={team}>
                          {team} ({teamUserCount} users)
                        </option>
                      )
                    })}
                  </Input>
                  <small className="text-muted mt-1">
                    Filter by team to narrow down assignee options
                  </small>
                </FormGroup>

                <FormGroup>
                  <Label className="fw-bold">Select Assignee *</Label>
                  {loadingTargets ? (
                    <div className="text-center p-3 border rounded">
                      <div className="spinner-border spinner-border-sm me-2"></div>
                      Loading users...
                    </div>
                  ) : assignmentTargets.length === 0 ? (
                    <div className="text-center p-3 text-muted border rounded">
                      {selectedTeam ? (
                        <>
                          <div>❌ No users found in "{selectedTeam}" team</div>
                          <Button
                            color="outline-secondary"
                            size="sm"
                            className="mt-2"
                            onClick={() => handleTeamChange('')}
                          >
                            Show All Teams
                          </Button>
                        </>
                      ) : allUsers.length === 0 ? (
                        <>
                          <div>❌ No users available for assignment</div>
                          <div className="mt-2">
                            <small className="text-muted">
                              This could happen if:
                              <ul className="mt-1 text-start">
                                <li>No users with assignable roles exist</li>
                                <li>API returned empty user list</li>
                                <li>Network connection issue</li>
                              </ul>
                            </small>
                          </div>
                          <Button
                            color="outline-primary"
                            size="sm"
                            className="mt-2"
                            onClick={fetchAssignmentTargets}
                          >
                            🔄 Retry Loading Users
                          </Button>
                        </>
                      ) : (
                        <>
                          <div>❌ No assignable users found for your role</div>
                          <div className="mt-2">
                            <small className="text-muted">
                              {allUsers.length} users loaded but none match assignable roles
                            </small>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      <Input
                        type="select"
                        value={selectedAssignee}
                        onChange={(e) => setSelectedAssignee(e.target.value)}
                      >
                        <option value="">
                          {selectedTeam ?
                            `Select from ${selectedTeam} team (${assignmentTargets.length} users)...` :
                            `Select an assignee (${assignmentTargets.length} users)...`
                          }
                        </option>
                        {assignmentTargets.map(target => (
                          <option key={target.id} value={target.id}>
                            {target.name} - {target.team} ({target.email})
                          </option>
                        ))}
                      </Input>
                      <small className="text-muted mt-1">
                        {assignmentTargets.length} users available
                        {selectedTeam && ` in ${selectedTeam} team`}
                      </small>
                    </>
                  )}
                </FormGroup>

                <FormGroup>
                  <Label>Assignment Notes (Optional)</Label>
                  <Input
                    type="textarea"
                    rows={3}
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                    placeholder="Add any notes about this assignment..."
                    maxLength={500}
                  />
                  <small className="text-muted">
                    {assignmentNotes.length}/500 characters
                  </small>
                </FormGroup>

                {/* Assignment Summary */}
                {selectedAssigneeData && (
                  <div className="mt-3 p-3 bg-success bg-opacity-10 border border-success rounded">
                    <h6 className="text-success mb-2">✅ Assignment Summary:</h6>
                    <div>
                      <strong>Incident:</strong> {getIncidentNumber(selectedIncident)} will be assigned to
                    </div>
                    <div>
                      <strong>Assignee:</strong> {selectedAssigneeData.name}
                    </div>
                    <div>
                      <strong>Team:</strong> {selectedAssigneeData.team}
                    </div>
                    <div>
                      <strong>Email:</strong> {selectedAssigneeData.email}
                    </div>
                    {assignmentNotes.trim() && (
                      <div>
                        <strong>Notes:</strong> {assignmentNotes.trim()}
                      </div>
                    )}
                  </div>
                )}

                {/* No users warning */}
                {!loadingTargets && allUsers.length === 0 && (
                  <div className="mt-3 p-3 bg-warning bg-opacity-10 border border-warning rounded">
                    <h6 className="text-warning mb-2">⚠️ No Users Available</h6>
                    <p className="mb-2">
                      Unable to load users for assignment. This could be due to:
                    </p>
                    <ul className="mb-2">
                      <li>Network connectivity issues</li>
                      <li>API authentication problems</li>
                      <li>No users with assignable roles in the system</li>
                      <li>API endpoint returning empty data</li>
                    </ul>
                    <Button
                      color="warning"
                      size="sm"
                      onClick={fetchAssignmentTargets}
                      disabled={loadingTargets}
                    >
                      {loadingTargets ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1"></span>
                          Retrying...
                        </>
                      ) : (
                        '🔄 Retry Loading Users'
                      )}
                    </Button>
                  </div>
                )}
              </Form>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="secondary"
            onClick={() => setShowAssignModal(false)}
            disabled={assigning}
          >
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={handleSaveAssignment}
            disabled={!canAssign}
          >
            {assigning ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Assigning...
              </>
            ) : (
              'Assign Incident'
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

export default AssignIncidents
