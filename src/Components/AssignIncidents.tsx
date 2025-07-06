'use client'
import React, { useState, useEffect, useCallback } from 'react'
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
  ButtonGroup,
  Nav,
  NavItem,
  NavLink
} from 'reactstrap'
import { useRouter } from 'next/navigation'
import {
  getCurrentUser,
  isAuthenticated,
  getUserDashboard,
  getStoredToken
} from '../app/(MainBody)/services/userService'
import {
  fetchHandlerIncidents,
  fetchManagerIncidents,
  fetchEndUserIncidents,
  fetchFieldEngineerIncidents,
  fetchExpertTeamIncidents,
  getStatusColor,
  getPriorityColor,
  type Incident
} from '../app/(MainBody)/services/incidentService'

type ExtendedIncident = Incident & {
  assigned_to?: {
    id: number
    name: string
    email?: string
    team_name?: string
    team_id?: number
  } | null
  assigned_by?: {
    id: number
    name: string
    email?: string
  } | null
}

interface AssignIncidentsProps {
  userType?: 'admin' | 'manager' | 'handler' | 'expert' | 'expert_team' | 'field_engineer'
  onBack?: () => void
}

const API_BASE_URL = 'https://apexwpc.apextechno.co.uk/api'
const ITEMS_PER_PAGE = 10
const REFRESH_INTERVAL = 30000

const AssignIncidents: React.FC<AssignIncidentsProps> = ({ userType, onBack }) => {
  const router = useRouter()

  // Core state
  const [incidents, setIncidents] = useState<ExtendedIncident[]>([])
  const [myActiveIncidents, setMyActiveIncidents] = useState<ExtendedIncident[]>([])
  const [assignedToOthersIncidents, setAssignedToOthersIncidents] = useState<ExtendedIncident[]>([])
  const [filteredIncidents, setFilteredIncidents] = useState<ExtendedIncident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Tab management
  const [activeTab, setActiveTab] = useState('active')

  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<ExtendedIncident | null>(null)
  const [selectedAssignee, setSelectedAssignee] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('')
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Assignment targets
  const [assignmentTargets, setAssignmentTargets] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [availableTeams, setAvailableTeams] = useState<string[]>([])
  const [loadingTargets, setLoadingTargets] = useState(false)

  // Search
  const [searchTerm, setSearchTerm] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Utility functions
  const getIncidentNumber = (incident: ExtendedIncident): string => {
    return incident.incident_no || `INC-${incident.id}`
  }

  const getCategoryName = (incident: ExtendedIncident): string => {
    return incident.category?.name || 'Uncategorized'
  }

  const getCallerName = (incident: ExtendedIncident): string => {
    if (!incident.user) return 'Unknown User'
    const fullName = incident.user.last_name
      ? `${incident.user.name} ${incident.user.last_name}`
      : incident.user.name
    return fullName || 'Unknown User'
  }

  const getPriorityName = (incident: ExtendedIncident): string => {
    return incident.priority?.name || incident.urgency?.name || 'Medium'
  }

  const getStatus = (incident: ExtendedIncident): string => {
    const state = incident.incidentstate?.name?.toLowerCase()
    if (state === 'new') return 'pending'
    if (state === 'inprogress') return 'in_progress'
    if (state === 'resolved') return 'resolved'
    if (state === 'closed') return 'closed'
    return 'pending'
  }

  const getAssignedToName = (incident: ExtendedIncident): string => {
    if (!incident.assigned_to) return 'Unassigned'
    return incident.assigned_to.name || 'Unknown User'
  }

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB')
    } catch {
      return 'Invalid Date'
    }
  }

  const canManageIncident = (incident: ExtendedIncident): boolean => {
    if (!user) return false

    const userTeam = user.team_name?.toLowerCase() || ''

    // Admin can manage all incidents
    if (userTeam.includes('admin')) return true

    // Handler can assign any incident they see
    if (userTeam.includes('handler')) {
      return true
    }

    // Field Engineers and Experts can assign incidents assigned to them
    if (userTeam.includes('field') || userTeam.includes('expert')) {
      return incident.assigned_to?.id === user.id
    }

    return false
  }

  // Get assignment data for an incident
  const getAssignmentData = async (incidentId: string): Promise<any> => {
    const token = getStoredToken()
    if (!token) return null

    try {
      const formData = new FormData()
      formData.append('incident_id', incidentId)

      const response = await fetch(`${API_BASE_URL}/incident-handler/incident-assignment/${incidentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        return result
      }
    } catch (error) {
      console.warn(`Assignment API failed for incident ${incidentId}:`, error)
    }

    return null
  }

  // Fetch assignment targets
  const fetchAssignmentTargets = async (): Promise<void> => {
    const token = getStoredToken()
    if (!token) {
      setError('Authentication required')
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
        throw new Error(`Failed to fetch users: ${response.status}`)
      }

      const result = await response.json()
      const users = result.data || []

      if (!Array.isArray(users)) {
        throw new Error('Invalid users data format')
      }

      const userTeam = user?.team_name?.toLowerCase() || ''
      let assignableRoles: string[] = []

      if (userTeam.includes('handler')) {
        assignableRoles = ['field', 'engineer', 'expert']
      } else if (userTeam.includes('field') || userTeam.includes('expert')) {
        assignableRoles = ['handler']
      } else if (userTeam.includes('admin')) {
        assignableRoles = ['handler', 'field', 'engineer', 'expert']
      }

      const targets = users
        .filter((apiUser: any) => {
          if (!apiUser.first_name || !apiUser.email || apiUser.id === user?.id) return false
          const userTeamName = (apiUser.team_name || '').toLowerCase()
          return assignableRoles.some(role => userTeamName.includes(role))
        })
        .map((apiUser: any) => ({
          id: apiUser.email,
          user_id: apiUser.id,
          name: apiUser.first_name && apiUser.last_name
            ? `${apiUser.first_name} ${apiUser.last_name}`.trim()
            : apiUser.first_name,
          email: apiUser.email,
          team: apiUser.team_name || 'Unknown Team',
          team_id: apiUser.team_id || 0
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      setAssignmentTargets(targets)
      setAllUsers(targets)

      const teams = [...new Set(targets.map(user => user.team).filter(Boolean))].sort()
      setAvailableTeams(teams)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load users'
      setError(errorMessage)
      setAssignmentTargets([])
      setAllUsers([])
    } finally {
      setLoadingTargets(false)
    }
  }

  // Main data fetching
  const fetchData = async (showLoader: boolean = true): Promise<void> => {
    try {
      if (showLoader) setLoading(true)
      setError(null)

      const currentUser = getCurrentUser()
      if (!currentUser?.id) {
        router.replace('/auth/login')
        return
      }

      setUser(currentUser)

      const actualUserType = userType || currentUser?.team_name?.toLowerCase() || 'enduser'
      let fetchedIncidents: ExtendedIncident[] = []

      // Fetch incidents based on user type
      if (actualUserType.includes('expert')) {
        fetchedIncidents = await fetchExpertTeamIncidents() as ExtendedIncident[]
      } else if (actualUserType.includes('field') || actualUserType.includes('engineer')) {
        fetchedIncidents = await fetchFieldEngineerIncidents() as ExtendedIncident[]
      } else if (actualUserType.includes('manager') || actualUserType.includes('admin')) {
        fetchedIncidents = await fetchManagerIncidents() as ExtendedIncident[]
      } else if (actualUserType.includes('handler')) {
        fetchedIncidents = await fetchHandlerIncidents() as ExtendedIncident[]
      } else {
        fetchedIncidents = await fetchEndUserIncidents() as ExtendedIncident[]
      }

      // Sort by creation date
      const sortedIncidents = fetchedIncidents.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      // Enhance with assignment data
      const enhancedIncidents = await Promise.all(
        sortedIncidents.map(async (incident): Promise<ExtendedIncident> => {
          const assignmentInfo = await getAssignmentData(incident.id.toString())

          let assignedTo = null
          let assignedBy = null

          if (assignmentInfo?.success && assignmentInfo.data) {
            if (assignmentInfo.data.to) {
              assignedTo = {
                id: assignmentInfo.data.to,
                name: assignmentInfo.data.assignee_name || 'Unknown User',
                email: assignmentInfo.data.assignee_email || '',
                team_name: assignmentInfo.data.assignee_team || '',
                team_id: assignmentInfo.data.assignee_team_id || 0
              }
            }

            if (assignmentInfo.data.from) {
              assignedBy = {
                id: assignmentInfo.data.from,
                name: assignmentInfo.data.assigner_name || 'Unknown User'
              }
            }
          } else {
            // Fallback to basic incident data
            if (incident.assigned_to_id && incident.assigned_to_id !== 0) {
              assignedTo = {
                id: incident.assigned_to_id,
                name: incident.assigned_to?.name || `User ${incident.assigned_to_id}`,
                email: incident.assigned_to?.email || '',
                team_name: incident.assigned_to?.team_name || '',
                team_id: incident.assigned_to?.team_id || 0
              }
            }
          }

          return {
            ...incident,
            assigned_to: assignedTo,
            assigned_by: assignedBy
          }
        })
      )

      setIncidents(enhancedIncidents)

      const userTeam = currentUser.team_name?.toLowerCase() || ''

      if (userTeam.includes('handler')) {
        // Handler logic
        const myActive = enhancedIncidents.filter(incident => {
          const isUnassigned = !incident.assigned_to
          const isAssignedToMe = incident.assigned_to?.id === currentUser.id
          const wasAssignedByMe = incident.assigned_by?.id === currentUser.id
          return isAssignedToMe || (isUnassigned && wasAssignedByMe)
        })

        const assignedToOthers = enhancedIncidents.filter(incident => {
          const wasAssignedByMe = incident.assigned_by?.id === currentUser.id
          const isAssignedToSomeoneElse = incident.assigned_to && incident.assigned_to.id !== currentUser.id
          return wasAssignedByMe && isAssignedToSomeoneElse
        })

        setMyActiveIncidents(myActive)
        setAssignedToOthersIncidents(assignedToOthers)
        setFilteredIncidents(activeTab === 'active' ? myActive : assignedToOthers)
      } else {
        // Field Engineer / Expert logic
        setMyActiveIncidents(enhancedIncidents)
        setAssignedToOthersIncidents([])
        setFilteredIncidents(enhancedIncidents)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load incidents'
      setError(errorMessage)
      setIncidents([])
      setFilteredIncidents([])
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab === 'active') {
      setFilteredIncidents(myActiveIncidents)
    } else {
      setFilteredIncidents(assignedToOthersIncidents)
    }
    setCurrentPage(1)
  }

  // Handle assignment submission
  const handleSaveAssignment = async (): Promise<void> => {
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

      const assignmentData = {
        user_id: user.id,
        incident_id: parseInt(selectedIncident.id.toString()),
        from: user.id,
        to: assignee.user_id
      }

      const response = await fetch(`${API_BASE_URL}/incident-handler/assign-incident`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(assignmentData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Assignment failed: ${response.status}`)
      }

      setShowAssignModal(false)
      setSelectedIncident(null)
      setSelectedAssignee('')
      setAssignmentNotes('')

      setSuccess(`Incident ${getIncidentNumber(selectedIncident)} successfully assigned to ${assignee.name}`)

      // Refresh data
      setTimeout(() => fetchData(false), 500)
      setTimeout(() => fetchData(true), 2000)
      setTimeout(() => setSuccess(null), 5000)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Assignment failed'
      setError(errorMessage)
    } finally {
      setAssigning(false)
    }
  }

  // Filter incidents (search only)
  useEffect(() => {
    const baseIncidents = activeTab === 'active' ? myActiveIncidents : assignedToOthersIncidents
    let filtered = [...baseIncidents]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(incident =>
        incident.short_description?.toLowerCase().includes(term) ||
        getIncidentNumber(incident).toLowerCase().includes(term) ||
        getCategoryName(incident).toLowerCase().includes(term) ||
        getCallerName(incident).toLowerCase().includes(term)
      )
    }

    setFilteredIncidents(filtered)
    setCurrentPage(1)
  }, [myActiveIncidents, assignedToOthersIncidents, activeTab, searchTerm])

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
  }, [])

  // Auto-refresh data
  useEffect(() => {
    if (!user || loading) return

    const interval = setInterval(() => {
      fetchData(false)
    }, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [user, loading])

  // Fetch assignment targets when user is loaded
  useEffect(() => {
    if (user && !loadingTargets && allUsers.length === 0) {
      fetchAssignmentTargets()
    }
  }, [user, loadingTargets, allUsers.length])

  // Navigation handlers
  const handleBackToDashboard = (): void => {
    if (onBack) {
      onBack()
    } else if (user && user.team_name) {
      const dashboardRoute = getUserDashboard(user.team_name)
      router.push(dashboardRoute)
    }
  }

  const handleRefresh = (): void => {
    fetchData()
    if (allUsers.length === 0) {
      fetchAssignmentTargets()
    }
  }

  const handleAssignIncident = (incident: ExtendedIncident): void => {
    if (!canManageIncident(incident)) {
      setError('You do not have permission to assign this incident')
      return
    }

    setSelectedIncident(incident)
    setSelectedAssignee('')
    setSelectedTeam('')
    setAssignmentNotes('')
    setError(null)
    setSuccess(null)
    setAssignmentTargets(allUsers)
    setShowAssignModal(true)

    if (allUsers.length === 0) {
      fetchAssignmentTargets()
    }
  }

  const handleTeamChange = (selectedTeam: string): void => {
    setSelectedTeam(selectedTeam)
    setSelectedAssignee('')

    if (!selectedTeam) {
      setAssignmentTargets(allUsers)
    } else {
      const filteredUsers = allUsers.filter(user => user.team === selectedTeam)
      setAssignmentTargets(filteredUsers)
    }
  }

  // Pagination
  const totalPages = Math.ceil(filteredIncidents.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const currentIncidents = filteredIncidents.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const selectedAssigneeData = assignmentTargets.find(t => t.id === selectedAssignee)
  const canAssign = !assigning && !loadingTargets && selectedAssignee && selectedAssignee !== 'undefined' && !!selectedAssigneeData

  const isHandler = user?.team_name?.toLowerCase().includes('handler')

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
    <div>
      <Container fluid>
        <Row>
          <Col xs={12}>
            <Card className="mb-4 mt-4">
              <CardBody>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h4 className="mb-1">Incident Management</h4>
                    <small className="text-muted">
                      {user?.team_name && `Role: ${user.team_name}`}
                    </small>
                  </div>
                  <div className="d-flex gap-2">
                    <Button color="outline-primary" size="sm" onClick={handleRefresh}>
                      🔄 Refresh
                    </Button>
                    <Button color="secondary" size="sm" onClick={handleBackToDashboard}>
                      ← Back to Dashboard
                    </Button>
                  </div>
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

        {/* Tab Navigation for Handlers */}
        {isHandler && (
          <Row>
            <Col xs={12}>
              <Card>
                <CardHeader>
                  <Nav tabs>
                    <NavItem>
                      <NavLink
                        className={activeTab === 'active' ? 'active' : ''}
                        onClick={() => handleTabChange('active')}
                        href="#"
                        style={{ cursor: 'pointer' }}
                      >
                        My Active Tasks ({myActiveIncidents.length})
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={activeTab === 'assigned' ? 'active' : ''}
                        onClick={() => handleTabChange('assigned')}
                        href="#"
                        style={{ cursor: 'pointer' }}
                      >
                        Assigned to Others ({assignedToOthersIncidents.length})
                      </NavLink>
                    </NavItem>
                  </Nav>
                </CardHeader>
              </Card>
            </Col>
          </Row>
        )}

        {/* Search Only */}
        <Row>
          <Col xs={12}>
            <Card className="mb-3">
              <CardBody>
                <div className="row g-3">
                  <div className="col-md-6">
                    <Label className="form-label">🔍 Search Incidents</Label>
                    <Input
                      type="text"
                      placeholder="Search by incident number, description, category, or caller name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6 d-flex align-items-end">
                    {searchTerm && (
                      <Button
                        color="outline-secondary"
                        size="sm"
                        onClick={() => setSearchTerm('')}
                      >
                        ✕ Clear Search
                      </Button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Main Incidents Table */}
        <Row>
          <Col xs={12}>
            <Card>
              <CardHeader>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    📋 {activeTab === 'active' ? 'My Active Tasks' : 'Assigned to Others'}
                    ({filteredIncidents.length} of {activeTab === 'active' ? myActiveIncidents.length : assignedToOthersIncidents.length})
                  </h5>
                  {activeTab === 'assigned' && (
                    <Badge color="info" className="p-2">
                      👁️ Read-Only Mode
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardBody>
                {filteredIncidents.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-muted">
                      {activeTab === 'active' ? 'No active incidents assigned to you' : 'No incidents assigned to others'}
                    </p>
                    <Button color="primary" onClick={handleRefresh}>🔄 Refresh</Button>
                  </div>
                ) : (
                  <div>
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>Incident</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Assigned To</th>
                            <th>Created</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentIncidents.map((incident) => {
                            const canManage = canManageIncident(incident)
                            const isReadOnly = activeTab === 'assigned'
                            const assignedToName = getAssignedToName(incident)

                            return (
                              <tr key={incident.id}>
                                <td>
                                  <div>
                                    <div className="fw-medium">{getIncidentNumber(incident)}</div>
                                    <small className="text-muted">👤 {getCallerName(incident)}</small>
                                  </div>
                                </td>
                                <td>
                                  <div className="text-truncate" style={{ maxWidth: '200px' }}>
                                    {incident.short_description || 'No description'}
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
                                  <div>
                                    <span className={`fw-medium ${incident.assigned_to ? 'text-success' : 'text-warning'}`}>
                                      {assignedToName}
                                    </span>
                                    {incident.assigned_by && (
                                      <div>
                                        <small className="text-muted">
                                          By: {incident.assigned_by.name}
                                        </small>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <small>{formatDate(incident.created_at)}</small>
                                </td>
                                <td>
                                  {canManage ? (
                                    <Button
                                      color="primary"
                                      size="sm"
                                      onClick={() => handleAssignIncident(incident)}
                                      disabled={loadingTargets}
                                    >
                                      {loadingTargets ? (
                                        <div className="spinner-border spinner-border-sm"></div>
                                      ) : (
                                        '📋 Assign'
                                      )}
                                    </Button>
                                  ) : isReadOnly ? (
                                    <Badge color="info" className="p-2">
                                      👁️ Read Only
                                    </Badge>
                                  ) : (
                                    <Badge color="secondary" className="p-2">
                                      🔒 No Permission
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
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
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Assignment Modal */}
      <Modal isOpen={showAssignModal} toggle={() => setShowAssignModal(false)} size="lg">
        <ModalHeader toggle={() => setShowAssignModal(false)}>
          🎯 Assign Incident - {selectedIncident ? getIncidentNumber(selectedIncident) : ''}
        </ModalHeader>
        <ModalBody>
          {selectedIncident && (
            <div>
              {/* Incident Details */}
              <div className="bg-light p-3 rounded mb-4">
                <h6 className="fw-bold mb-2">📋 Incident Details</h6>
                <div className="row">
                  <div className="col-md-6">
                    <small className="text-muted">Incident Number:</small>
                    <div className="fw-medium">{getIncidentNumber(selectedIncident)}</div>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted">Category:</small>
                    <div className="fw-medium">{getCategoryName(selectedIncident)}</div>
                  </div>
                  <div className="col-md-6 mt-2">
                    <small className="text-muted">Priority:</small>
                    <div>
                      <Badge style={{
                        backgroundColor: getPriorityColor(getPriorityName(selectedIncident)),
                        color: 'white'
                      }}>
                        {getPriorityName(selectedIncident)}
                      </Badge>
                    </div>
                  </div>
                  <div className="col-md-6 mt-2">
                    <small className="text-muted">Description:</small>
                    <div className="fw-medium">{selectedIncident.short_description || 'No description'}</div>
                  </div>
                </div>
              </div>

              <Form>
                <FormGroup>
                  <Label className="fw-bold">
                    🏢 Select Team First (Optional)
                  </Label>
                  <Input
                    type="select"
                    value={selectedTeam}
                    onChange={(e) => handleTeamChange(e.target.value)}
                    disabled={loadingTargets}
                  >
                    <option value="">
                      {loadingTargets ? 'Loading teams...' : `All Teams (${allUsers.length} users)`}
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
                </FormGroup>

                <FormGroup>
                  <Label className="fw-bold">
                    👤 Select Assignee *
                  </Label>
                  {loadingTargets ? (
                    <div className="text-center p-3 border rounded">
                      <div className="spinner-border spinner-border-sm me-2"></div>
                      Loading users...
                    </div>
                  ) : assignmentTargets.length === 0 ? (
                    <div className="text-center p-3 text-muted border rounded">
                      <div>❌ No users available for assignment</div>
                      <div className="small mt-1">
                        Your role ({user?.team_name}) can only assign to specific teams
                      </div>
                      <Button color="outline-primary" size="sm" className="mt-2" onClick={fetchAssignmentTargets}>
                        🔄 Retry Loading Users
                      </Button>
                    </div>
                  ) : (
                    <Input
                      type="select"
                      value={selectedAssignee}
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                    >
                      <option value="">
                        {selectedTeam
                          ? `Select from ${selectedTeam} team (${assignmentTargets.length} users)...`
                          : `Select an assignee (${assignmentTargets.length} users)...`}
                      </option>
                      {assignmentTargets.map(target => (
                        <option key={target.id} value={target.id}>
                          {target.name} - {target.team} ({target.email})
                        </option>
                      ))}
                    </Input>
                  )}
                </FormGroup>

                {selectedAssigneeData && (
                  <div className="bg-success bg-opacity-10 p-3 rounded mb-3">
                    <h6 className="text-success mb-2">✅ Selected Assignee</h6>
                    <div><strong>Name:</strong> {selectedAssigneeData.name}</div>
                    <div><strong>Team:</strong> {selectedAssigneeData.team}</div>
                    <div><strong>Email:</strong> {selectedAssigneeData.email}</div>
                  </div>
                )}

                <FormGroup>
                  <Label>📝 Assignment Notes (Optional)</Label>
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
              </Form>
            </div>
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
              <div>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Assigning...
              </div>
            ) : (
              '🎯 Assign Incident'
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

export default AssignIncidents
