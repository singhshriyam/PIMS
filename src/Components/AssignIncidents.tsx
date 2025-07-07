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
  type Incident
} from '../app/(MainBody)/services/incidentService'

import EditIncident from './EditIncident'

type ExtendedIncident = Incident & {
  assigned_to?: {
    id: number
    name: string
    team_name?: string
  } | null
  assigned_by?: {
    id: number
    name: string
  } | null
}

interface AssignIncidentsProps {
  userType?: 'admin' | 'manager' | 'handler' | 'expert' | 'expert_team' | 'field_engineer'
  onBack?: () => void
}

const API_BASE_URL = 'https://apexwpc.apextechno.co.uk/api'
const ITEMS_PER_PAGE = 10

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
  const [assigning, setAssigning] = useState(false)

  // Incident details modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingIncident, setEditingIncident] = useState<ExtendedIncident | null>(null)

  // Assignment targets
  const [assignmentTargets, setAssignmentTargets] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [availableTeams, setAvailableTeams] = useState<string[]>([])
  const [loadingTargets, setLoadingTargets] = useState(false)

  // Search and pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Utility functions
  const getIncidentNumber = (incident: ExtendedIncident): string => {
    return incident.incident_no || `INC-${incident.id}`
  }

  const getCategoryName = (incident: ExtendedIncident): string => {
    return incident.category?.name || 'Uncategorized'
  }

  const getPriorityName = (incident: ExtendedIncident): string => {
    return incident.priority?.name || incident.urgency?.name || 'Medium'
  }

  const getStatus = (incident: ExtendedIncident): string => {
    const state = incident.incidentstate?.name?.toLowerCase()
    if (state === 'new') return 'Pending'
    if (state === 'inprogress') return 'In Progress'
    if (state === 'resolved') return 'Resolved'
    if (state === 'closed') return 'Closed'
    return 'Pending'
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

  // Check if user can assign incident
  const canAssignIncident = (incident: ExtendedIncident): boolean => {
    if (!user || activeTab !== 'active') return false

    const userTeam = user.team_name?.toLowerCase() || ''

    // Admin and Manager can assign any incident
    if (userTeam.includes('admin') || userTeam.includes('manager')) return true

    // Others can only assign incidents assigned to them
    if (userTeam.includes('handler') || userTeam.includes('field') || userTeam.includes('expert')) {
      return incident.assigned_to?.id === parseInt(user.id)
    }

    return false
  }

  // Fetch all incidents for "Assigned to Others" tab
  const fetchAllIncidents = async (): Promise<ExtendedIncident[]> => {
    const token = getStoredToken()
    if (!token) throw new Error('Authentication required')

    const response = await fetch(`${API_BASE_URL}/all-incidents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) throw new Error(`Failed to fetch all incidents: ${response.status}`)

    const result = await response.json()
    if (!result.success || !Array.isArray(result.data)) {
      throw new Error('Invalid response format from all-incidents API')
    }

    return result.data.map((incident: any) => ({
      id: incident.id,
      incident_no: incident.incident_no,
      created_at: incident.created_at,
      updated_at: incident.updated_at,
      assigned_to_id: incident.assigned_to_id,
      category: {
        id: incident.category_id,
        name: incident.category_name
      },
      priority: incident.priority_id ? {
        id: incident.priority_id,
        name: incident.priority_name
      } : null,
      urgency: incident.urgency_id ? {
        id: incident.urgency_id,
        name: incident.urgency_name
      } : null,
      incidentstate: {
        id: incident.incidentstate_id,
        name: incident.incidentstate_name
      },
      assigned_to: incident.assigned_to_id ? {
        id: incident.assigned_to_id,
        name: incident.assigned_to_name || `User ${incident.assigned_to_id}`,
        team_name: ''
      } : null,
      assigned_by: null
    }))
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

      if (!response.ok) throw new Error(`Failed to fetch users: ${response.status}`)

      const result = await response.json()
      const users = result.data || []

      if (!Array.isArray(users)) throw new Error('Invalid users data format')

      const userTeam = user?.team_name?.toLowerCase() || ''
      let assignableRoles: string[] = []

      // Define who can assign to whom
      if (userTeam.includes('admin') || userTeam.includes('manager')) {
        assignableRoles = ['handler', 'field', 'engineer', 'expert']
      } else if (userTeam.includes('handler')) {
        assignableRoles = ['handler', 'field', 'engineer', 'expert']
      } else if (userTeam.includes('field') || userTeam.includes('engineer')) {
        assignableRoles = ['handler', 'expert']
      } else if (userTeam.includes('expert')) {
        assignableRoles = ['handler', 'field', 'engineer']
      }

      const targets = users
        .filter((apiUser: any) => {
          if (!apiUser.first_name || apiUser.id === user?.id) return false
          const userTeamName = (apiUser.team_name || '').toLowerCase()
          return assignableRoles.some(role => userTeamName.includes(role))
        })
        .map((apiUser: any) => ({
          id: apiUser.id,
          user_id: apiUser.id,
          name: apiUser.first_name && apiUser.last_name
            ? `${apiUser.first_name} ${apiUser.last_name}`.trim()
            : apiUser.first_name,
          email: apiUser.email,
          team: apiUser.team_name || 'Unknown Team'
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
      setAvailableTeams([])
    } finally {
      setLoadingTargets(false)
    }
  }

  // Get assignment data
  const getAssignmentData = async (incidentId: string): Promise<any> => {
    const token = getStoredToken()
    if (!token) return null

    try {
      const response = await fetch(`${API_BASE_URL}/incident-handler/incident-assignment/${incidentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: new URLSearchParams()
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0) {
          const sortedAssignments = result.data.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          return { success: true, data: sortedAssignments[0] }
        }
      }
      return null
    } catch (error) {
      return null
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
      const userTeam = currentUser.team_name?.toLowerCase() || ''

      // Fetch incidents for "My Active Tasks" tab
      let myActiveIncidentsList: ExtendedIncident[] = []

      if (actualUserType.includes('expert')) {
        myActiveIncidentsList = await fetchExpertTeamIncidents() as ExtendedIncident[]
      } else if (actualUserType.includes('field') || actualUserType.includes('engineer')) {
        myActiveIncidentsList = await fetchFieldEngineerIncidents() as ExtendedIncident[]
      } else if (actualUserType.includes('manager') || actualUserType.includes('admin')) {
        myActiveIncidentsList = await fetchManagerIncidents() as ExtendedIncident[]
      } else if (actualUserType.includes('handler')) {
        myActiveIncidentsList = await fetchHandlerIncidents() as ExtendedIncident[]
      } else {
        myActiveIncidentsList = await fetchEndUserIncidents() as ExtendedIncident[]
      }

      // Sort by creation date (newest to oldest)
      const sortedActiveIncidents = myActiveIncidentsList.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      // Fetch incidents for "Assigned to Others" tab
      let assignedToOthersIncidentsList: ExtendedIncident[] = []

      if (userTeam.includes('handler') || userTeam.includes('field') || userTeam.includes('expert')) {
        try {
          const allIncidentsList = await fetchAllIncidents()
          // Filter for incidents assigned by current user to someone else
          assignedToOthersIncidentsList = allIncidentsList.filter(incident => {
            // This would need proper assignment data fetching logic
            // For now, just include incidents that are assigned to others
            return incident.assigned_to && incident.assigned_to.id !== currentUser.id
          }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        } catch (error) {
          console.error('Error fetching assigned to others incidents:', error)
          assignedToOthersIncidentsList = []
        }
      }

      // Set state based on user type
      if (userTeam.includes('admin') || userTeam.includes('manager')) {
        setMyActiveIncidents(sortedActiveIncidents)
        setAssignedToOthersIncidents([])
        setIncidents(sortedActiveIncidents)
        setFilteredIncidents(sortedActiveIncidents)
      } else {
        setMyActiveIncidents(sortedActiveIncidents)
        setAssignedToOthersIncidents(assignedToOthersIncidentsList)
        setIncidents([...sortedActiveIncidents, ...assignedToOthersIncidentsList])
        setFilteredIncidents(activeTab === 'active' ? sortedActiveIncidents : assignedToOthersIncidentsList)
      }

    } catch (error) {
      console.error('fetchData error:', error)
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

  // Handle viewing incident details
  const handleViewIncidentDetails = (incident: ExtendedIncident): void => {
    setEditingIncident(incident)
    setShowEditModal(true)
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
        user_id: parseInt(user.id),
        incident_id: parseInt(selectedIncident.id.toString()),
        from: parseInt(user.id),
        to: parseInt(assignee.user_id)
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
        throw new Error(`Assignment failed: ${response.status} - ${errorText}`)
      }

      const responseData = await response.json()
      if (responseData && responseData.success === false) {
        throw new Error(responseData.message || 'Assignment failed on server')
      }

      setShowAssignModal(false)
      setSelectedIncident(null)
      setSelectedAssignee('')

      setSuccess(`Incident ${getIncidentNumber(selectedIncident)} assigned to ${assignee.name}`)

      // Refresh data
      setTimeout(() => fetchData(false), 2000)
      setTimeout(() => setSuccess(null), 5000)

    } catch (error) {
      console.error('Assignment error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Assignment failed'
      setError(errorMessage)
    } finally {
      setAssigning(false)
    }
  }

  // Filter incidents by search term
  useEffect(() => {
    const baseIncidents = activeTab === 'active' ? myActiveIncidents : assignedToOthersIncidents
    let filtered = [...baseIncidents]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(incident =>
        getIncidentNumber(incident).toLowerCase().includes(term) ||
        getCategoryName(incident).toLowerCase().includes(term)
      )
    }

    setFilteredIncidents(filtered)
    setCurrentPage(1)
  }, [myActiveIncidents, assignedToOthersIncidents, activeTab, searchTerm])

  // Auto-clear alerts
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000)
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
  }

  const handleAssignIncident = (incident: ExtendedIncident): void => {
    if (!canAssignIncident(incident)) {
      setError('You do not have permission to assign this incident')
      return
    }

    setSelectedIncident(incident)
    setSelectedAssignee('')
    setSelectedTeam('')
    setError(null)
    setSuccess(null)
    setAssignmentTargets([])
    setShowAssignModal(true)

    if (allUsers.length === 0) {
      fetchAssignmentTargets()
    }
  }

  const handleTeamChange = (selectedTeam: string): void => {
    setSelectedTeam(selectedTeam)
    setSelectedAssignee('')

    if (selectedTeam) {
      const filteredUsers = allUsers.filter(user => user.team === selectedTeam)
      setAssignmentTargets(filteredUsers)
    } else {
      setAssignmentTargets([])
    }
  }

  // Pagination
  const totalPages = Math.ceil(filteredIncidents.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const currentIncidents = filteredIncidents.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const canAssign = !assigning && !loadingTargets && selectedAssignee && assignmentTargets.find(t => t.id === selectedAssignee)

  const showTabs = user?.team_name?.toLowerCase().includes('handler') ||
                   user?.team_name?.toLowerCase().includes('field') ||
                   user?.team_name?.toLowerCase().includes('expert')

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
                    <h4 className="mb-1">Incident Assignment</h4>
                  </div>
                  <div className="d-flex gap-2">
                    <Button color="secondary" size="sm" onClick={handleBackToDashboard}>
                      Back to Dashboard
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
                <strong>Success!</strong> {success}
              </Alert>
            </Col>
          </Row>
        )}

        {error && (
          <Row>
            <Col xs={12}>
              <Alert color="danger" toggle={() => setError(null)}>
                <strong>Error!</strong> {error}
              </Alert>
            </Col>
          </Row>
        )}

        {/* Tab Navigation */}
        {showTabs && (
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

        {/* Main Incidents Table */}
        <Row>
          <Col xs={12}>
            <Card>
              <CardHeader>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    {showTabs ? (activeTab === 'active' ? 'My Active Tasks' : 'Assigned to Others') : 'Incidents'}
                    ({filteredIncidents.length})
                  </h5>
                </div>
              </CardHeader>
              <CardBody>
                {filteredIncidents.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-muted">
                      {activeTab === 'active' ? 'No active incidents assigned to you' : 'No incidents assigned to others'}
                    </p>
                    <Button color="primary" onClick={handleRefresh}>Refresh</Button>
                  </div>
                ) : (
                  <div>
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>Incident Number</th>
                            <th>Category</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Assigned To</th>
                            <th>Created Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentIncidents.map((incident) => {
                            const canAssign = canAssignIncident(incident)
                            const isReadOnly = activeTab === 'assigned'

                            return (
                              <tr key={incident.id}>
                                <td>
                                  <div className="fw-medium">{getIncidentNumber(incident)}</div>
                                </td>
                                <td>
                                  <div>{getCategoryName(incident)}</div>
                                </td>
                                <td>
                                  <span className="fw-medium">
                                    {getPriorityName(incident)}
                                  </span>
                                </td>
                                <td>
                                  <span className="fw-medium">
                                    {getStatus(incident)}
                                  </span>
                                </td>
                                <td>
                                  <div>
                                    <span className="fw-medium">
                                      {getAssignedToName(incident)}
                                    </span>
                                    {incident.assigned_by && (
                                      <div>
                                        <small className="text-muted">
                                          Assigned by: {incident.assigned_by.name}
                                        </small>
                                      </div>
                                    )}
                                    {incident.assigned_to?.team_name && (
                                      <div>
                                        <small className="text-muted">
                                          Team: {incident.assigned_to.team_name}
                                        </small>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <small>{formatDate(incident.created_at)}</small>
                                </td>
                                <td>
                                  {canAssign && !isReadOnly ? (
                                    <Button
                                      color="primary"
                                      size="sm"
                                      onClick={() => handleAssignIncident(incident)}
                                      disabled={loadingTargets}
                                    >
                                      {loadingTargets ? (
                                        <div className="spinner-border spinner-border-sm"></div>
                                      ) : (
                                        'Assign'
                                      )}
                                    </Button>
                                  ) : isReadOnly ? (
                                    <Button
                                      color="info"
                                      size="sm"
                                      onClick={() => handleViewIncidentDetails(incident)}
                                    >
                                      View Details
                                    </Button>
                                  ) : (
                                    <span className="text-muted">No Permission</span>
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
          Assign Incident - {selectedIncident ? getIncidentNumber(selectedIncident) : ''}
        </ModalHeader>
        <ModalBody>
          {selectedIncident && (
            <div>
              <Form>
                <FormGroup>
                  <Label className="fw-bold">Select Team *</Label>
                  <Input
                    type="select"
                    value={selectedTeam}
                    onChange={(e) => handleTeamChange(e.target.value)}
                    disabled={loadingTargets}
                  >
                    <option value="">
                      {loadingTargets ? 'Loading teams...' : 'Select a team first...'}
                    </option>
                    {availableTeams.map(team => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </Input>
                </FormGroup>

                <FormGroup>
                  <Label className="fw-bold">Select Assignee *</Label>
                  {!selectedTeam ? (
                    <div className="text-center p-3 border rounded text-muted">
                      Please select a team first to see available members
                    </div>
                  ) : loadingTargets ? (
                    <div className="text-center p-3 border rounded">
                      <div className="spinner-border spinner-border-sm me-2"></div>
                      Loading available users...
                    </div>
                  ) : assignmentTargets.length === 0 ? (
                    <div className="text-center p-3 text-muted border rounded">
                      <div>No users available in {selectedTeam} team</div>
                      <Button color="outline-primary" size="sm" className="mt-2" onClick={fetchAssignmentTargets}>
                        Retry Loading Users
                      </Button>
                    </div>
                  ) : (
                    <Input
                      type="select"
                      value={selectedAssignee}
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                    >
                      <option value="">Select a member from {selectedTeam}...</option>
                      {assignmentTargets.map(target => (
                        <option key={target.id} value={target.id}>
                          {target.name}
                        </option>
                      ))}
                    </Input>
                  )}
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
              'Assign Incident'
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Incident Details Modal
      {showEditModal && editingIncident && (
        <EditIncident
          incident={editingIncident}
          userType={user?.team_name}
          onClose={() => {
            setShowEditModal(false)
            setEditingIncident(null)
          }}
          onSave={() => {
            setShowEditModal(false)
            setEditingIncident(null)
            fetchData(false)
          }}
          readOnly={true}
        />
      )} */}
    </div>
  )
}

export default AssignIncidents
