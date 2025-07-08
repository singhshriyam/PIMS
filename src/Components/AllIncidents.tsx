'use client'
import React, { useState, useEffect } from 'react'
import {
  Container, Row, Col, Card, CardBody, CardHeader,
  Button, Input, Badge, Alert, Nav, NavItem, NavLink, TabContent, TabPane
} from 'reactstrap'
import { useRouter } from 'next/navigation'
import {
  getCurrentUser,
  isAuthenticated,
  getUserDashboard,
  User,
  getStoredToken
} from '../app/(MainBody)/services/userService'
import {
  fetchHandlerIncidents,
  fetchManagerIncidents,
  fetchEndUserIncidents,
  fetchFieldEngineerIncidents,
  fetchExpertTeamIncidents,
  getIncidentStats,
  getStatusColor,
  getPriorityColor,
  type Incident
} from '../app/(MainBody)/services/incidentService'
import {
  fetchCategories,
  fetchContactTypes,
  fetchImpacts,
  fetchUrgencies,
  fetchIncidentStates,
  fetchUsers
} from '../app/(MainBody)/services/masterService'
import EditIncident from './EditIncident'
import ViewIncident from './ViewIncident'

interface AllIncidentsProps {
  userType?: 'enduser' | 'handler' | 'admin' | 'manager' | 'field_engineer' | 'expert_team'
  onBack?: () => void
  initialStatusFilter?: string | null
}

interface AssignmentRecord {
  id: number
  incident_id: number
  from: number
  to: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

interface EnrichedAssignment extends AssignmentRecord {
  incident?: Incident
  fromUser?: User
  toUser?: User
}

const AllIncidents: React.FC<AllIncidentsProps> = ({
  userType,
  onBack,
  initialStatusFilter
}) => {
  const router = useRouter()

  // State Management
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([])
  const [assignedIncidents, setAssignedIncidents] = useState<EnrichedAssignment[]>([])
  const [filteredAssignedIncidents, setFilteredAssignedIncidents] = useState<EnrichedAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [assignedLoading, setAssignedLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  // Tab Management for Handler
  const [activeTab, setActiveTab] = useState('my_incidents')

  // Master data for ID to name mapping
  const [masterData, setMasterData] = useState({
    categories: [] as Array<{id: number, name: string}>,
    contactTypes: [] as Array<{id: number, name: string}>,
    impacts: [] as Array<{id: number, name: string}>,
    urgencies: [] as Array<{id: number, name: string}>,
    incidentStates: [] as Array<{id: number, name: string}>,
    users: [] as Array<{id: number, first_name: string, last_name: string | null, email: string}>,
    loaded: false
  })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [assignedCurrentPage, setAssignedCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filters
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || 'all')
  const [searchTerm, setSearchTerm] = useState('')
  const [assignedSearchTerm, setAssignedSearchTerm] = useState('')

  // Modals
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [editingIncident, setEditingIncident] = useState<any>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  // Permission Helpers
  const isEndUser = () => userType?.toLowerCase().includes('enduser')
  const isFieldEngineer = () => userType?.toLowerCase().includes('field_engineer')
  const isHandler = () => userType?.toLowerCase().includes('handler')
  const hasFullEditPermissions = () => {
    const type = userType?.toLowerCase() || ''
    return type.includes('handler') || type.includes('manager') ||
           type.includes('admin') || type.includes('expert_team')
  }

  // Data Helpers - Using master data to map IDs to names
  const getCategoryName = (incident: Incident): string => {
    const category = masterData.categories.find(cat => cat.id === incident.category_id);
    return category?.name || '';
  };

  const getPriorityName = (incident: Incident): string => {
    if (incident.priority_id) {
      const priority = masterData.impacts.find(imp => imp.id === incident.priority_id)
      return priority?.name || ''
    }
    if (incident.urgency_id) {
      const urgency = masterData.urgencies.find(urg => urg.id === incident.urgency_id)
      return urgency?.name || ''
    }
    return ''
  }

  const getCallerName = (incident: Incident): string => {
    if (!incident.user_id) return ''
    const user = masterData.users.find(u => u.id === incident.user_id)
    if (user) {
      const fullName = user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.first_name
      return fullName || user.email || ''
    }
    return ''
  }

  const getUserName = (userId: number): string => {
    const user = masterData.users.find(u => u.id === userId)
    if (user) {
      const fullName = user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.first_name
      return fullName || user.email || ''
    }
    return 'Unknown User'
  }

  const getIncidentNumber = (incident: Incident): string => {
    return incident.incident_no || ''
  }

  const getAssignedTo = (incident: Incident): string => {
    if (!incident.assigned_to_id) return 'Unassigned'
    const user = masterData.users.find(u => u.id === incident.assigned_to_id)
    if (user) {
      const fullName = user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.first_name
      return fullName || user.email || ''
    }
    return ''
  }

  const getStatus = (incident: Incident): string => {
    if (!incident.incidentstate_id) return ''
    const state = masterData.incidentStates.find(st => st.id === incident.incidentstate_id)
    return state?.name || ''
  }

  const formatDateOnly = (dateString: string) => {
    if (!dateString) return ''
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return ''
    }
  }

  // Load master data for ID to name mapping
  const loadMasterData = async () => {
    try {
      const [categoriesRes, contactTypesRes, impactsRes, urgenciesRes, incidentStatesRes, usersRes] =
        await Promise.all([
          fetchCategories(),
          fetchContactTypes(),
          fetchImpacts(),
          fetchUrgencies(),
          fetchIncidentStates(),
          fetchUsers()
        ])

      setMasterData({
        categories: categoriesRes.data || [],
        contactTypes: contactTypesRes.data || [],
        impacts: impactsRes.data || [],
        urgencies: urgenciesRes.data || [],
        incidentStates: incidentStatesRes.data || [],
        users: usersRes.data || [],
        loaded: true
      })
    } catch (error) {
      setMasterData(prev => ({ ...prev, loaded: true }))
    }
  }

  // Fetch Handler's Assigned Incidents using all-incidents API
  const fetchHandlerAssignedIncidents = async () => {
    if (!isHandler() || !user?.id) return

    try {
      setAssignedLoading(true)
      const token = getStoredToken()
      if (!token) return

      // Fetch all incidents from the API endpoint
      const response = await fetch('https://apexwpc.apextechno.co.uk/api/all-incidents', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch all incidents: ${response.status}`)
      }

      const result = await response.json()
      const allIncidents = result.success ? (result.data || []) : []

      const assignedIncidentsList: EnrichedAssignment[] = []

      // Check assignment history for each incident
      for (const incident of allIncidents) {
        try {
          const assignmentResponse = await fetch(`https://apexwpc.apextechno.co.uk/api/incident-handler/incident-assignment/${incident.id}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: new URLSearchParams()
          })

          if (assignmentResponse.ok) {
            const assignmentResult = await assignmentResponse.json()

            if (assignmentResult.success && assignmentResult.data && Array.isArray(assignmentResult.data) && assignmentResult.data.length > 0) {
              // Get the latest assignment
              const latestAssignment = assignmentResult.data
                .sort((a: AssignmentRecord, b: AssignmentRecord) =>
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0]

              // If handler made the latest assignment and it's assigned to someone else
              if (latestAssignment && latestAssignment.from === user.id && latestAssignment.to !== user.id) {
                assignedIncidentsList.push({
                  ...latestAssignment,
                  incident,
                  fromUser: masterData.users.find(u => u.id === latestAssignment.from),
                  toUser: masterData.users.find(u => u.id === latestAssignment.to)
                })
              }
            }
          }
        } catch (error) {
          // Silently continue on individual assignment check failures
          continue
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 20))
      }

      // Sort by assignment date (newest first)
      assignedIncidentsList.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setAssignedIncidents(assignedIncidentsList)
      setFilteredAssignedIncidents(assignedIncidentsList)

    } catch (error) {
      setError('Failed to load assigned incidents')
    } finally {
      setAssignedLoading(false)
    }
  }

  // Data Fetching - Show only ACTIVE incidents (1=New, 2=InProgress, 3=OnHold)
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const currentUser = getCurrentUser()
      if (!currentUser) {
        router.replace('/auth/login')
        return
      }

      setUser(currentUser)

      const actualUserType = userType || currentUser?.team_name?.toLowerCase() || 'enduser'
      let fetchedIncidents: Incident[] = []

      if (actualUserType.includes('expert')) {
        fetchedIncidents = await fetchExpertTeamIncidents()
      } else if (actualUserType.includes('field') || actualUserType.includes('engineer')) {
        fetchedIncidents = await fetchFieldEngineerIncidents()
      } else if (actualUserType.includes('manager') || actualUserType.includes('admin')) {
        fetchedIncidents = await fetchManagerIncidents()
      } else if (actualUserType.includes('handler')) {
        fetchedIncidents = await fetchHandlerIncidents()
      } else {
        fetchedIncidents = await fetchEndUserIncidents()
      }

      // Filter to show ONLY active incidents (1=New, 2=InProgress, 3=OnHold)
      const activeIncidents = fetchedIncidents.filter(incident => {
        return incident.incidentstate_id === 1 || incident.incidentstate_id === 2 || incident.incidentstate_id === 3
      })

      activeIncidents.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setIncidents(activeIncidents)
      setFilteredIncidents(activeIncidents)
      setCurrentPage(1)

    } catch (error: any) {
      setError(error.message || 'Failed to load incidents')
      setIncidents([])
      setFilteredIncidents([])
    } finally {
      setLoading(false)
    }
  }

  // Filtering for My Incidents
  useEffect(() => {
    let filtered = [...incidents]

    if (statusFilter !== 'all') {
      filtered = filtered.filter(incident => {
        const state = masterData.incidentStates.find(st => st.id === incident.incidentstate_id)
        return state?.name?.toLowerCase() === statusFilter.toLowerCase()
      })
    }

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
  }, [incidents, statusFilter, searchTerm])

  // Filtering for Assigned Incidents
  useEffect(() => {
    let filtered = [...assignedIncidents]

    if (assignedSearchTerm) {
      const term = assignedSearchTerm.toLowerCase()
      filtered = filtered.filter(assignment =>
        getIncidentNumber(assignment.incident || {} as Incident).toLowerCase().includes(term) ||
        getCategoryName(assignment.incident || {} as Incident).toLowerCase().includes(term) ||
        assignment.incident?.short_description?.toLowerCase().includes(term) ||
        getUserName(assignment.to).toLowerCase().includes(term)
      )
    }

    setFilteredAssignedIncidents(filtered)
    setAssignedCurrentPage(1)
  }, [assignedIncidents, assignedSearchTerm])

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter)
    }
  }, [initialStatusFilter])

  // Load assigned incidents when master data is loaded
  useEffect(() => {
    if (masterData.loaded && isHandler() && user?.id) {
      fetchHandlerAssignedIncidents()
    }
  }, [masterData.loaded, user?.id])

  // Pagination for My Incidents
  const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentIncidents = filteredIncidents.slice(startIndex, startIndex + itemsPerPage)

  // Pagination for Assigned Incidents
  const assignedTotalPages = Math.ceil(filteredAssignedIncidents.length / itemsPerPage)
  const assignedStartIndex = (assignedCurrentPage - 1) * itemsPerPage
  const currentAssignedIncidents = filteredAssignedIncidents.slice(assignedStartIndex, assignedStartIndex + itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleAssignedPageChange = (page: number) => {
    setAssignedCurrentPage(page)
  }

  const renderPaginationButtons = (currentPage: number, totalPages: number, onPageChange: (page: number) => void) => {
    const buttons = []
    const maxVisibleButtons = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisibleButtons / 2))
    let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1)

    if (endPage - startPage + 1 < maxVisibleButtons) {
      startPage = Math.max(1, endPage - maxVisibleButtons + 1)
    }

    if (currentPage > 1) {
      buttons.push(
        <Button
          key="prev"
          color="outline-primary"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          className="me-1"
        >
          ‹
        </Button>
      )
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <Button
          key={i}
          color={i === currentPage ? "primary" : "outline-primary"}
          size="sm"
          onClick={() => onPageChange(i)}
          className="me-1"
        >
          {i}
        </Button>
      )
    }

    if (currentPage < totalPages) {
      buttons.push(
        <Button
          key="next"
          color="outline-primary"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          className="me-1"
        >
          ›
        </Button>
      )
    }

    return buttons
  }

  // Event Handlers
  const handleBackToDashboard = () => {
    if (onBack) {
      onBack()
    } else {
      const dashboardRoute = getUserDashboard(user?.team_name || 'user')
      router.push(dashboardRoute)
    }
  }

  const handleViewIncident = (incident: Incident) => {
    setSelectedIncident(incident)
    setShowViewModal(true)
  }

  const handleEditIncident = (incident: Incident, readOnly: boolean = false) => {
    try {
      setEditingIncident(null)

      setEditingIncident({
        id: incident.id,
        user_id: incident.user_id,
        site_id: incident.site_id,
        asset_id: incident.asset_id,
        category_id: incident.category_id,
        subcategory_id: incident.subcategory_id,
        contact_type_id: incident.contact_type_id,
        impact_id: incident.impact_id,
        priority_id: incident.priority_id,
        urgency_id: incident.urgency_id,
        assigned_to_id: incident.assigned_to_id,
        incidentstate_id: incident.incidentstate_id,
        incident_no: incident.incident_no || '',
        opened_at: incident.opened_at || '',
        closed_at: incident.closed_at || '',
        short_description: incident.short_description || '',
        description: incident.description || '',
        reported_by: incident.reported_by || '',
        address: incident.address || '',
        lat: incident.lat,
        lng: incident.lng,
        narration: incident.narration || '',
        root_cause_analysis: incident.root_cause_analysis || '',
        conclusion: incident.conclusion || '',
        created_by_id: incident.created_by_id,
        updated_by_id: incident.updated_by_id,
        created_at: incident.created_at || '',
        updated_at: incident.updated_at || '',
        deleted_at: incident.deleted_at || '',
        readOnly: readOnly
      })
      setShowEditModal(true)
    } catch (error) {
      setError('Failed to open incident for editing')
    }
  }

  const handleCloseEdit = () => {
    setEditingIncident(null)
    setShowEditModal(false)
    fetchData()
  }

  const handleCloseView = () => {
    setShowViewModal(false)
    setSelectedIncident(null)
  }

  // Action Buttons
  const renderActionButtons = (incident: Incident, readOnly: boolean = false) => {
    if (readOnly) {
      return (
        <Button
          color="outline-info"
          size="sm"
          onClick={() => handleEditIncident(incident, true)}
        >
          View Details
        </Button>
      )
    }

    if (hasFullEditPermissions()) {
      return (
        <Button
          color="primary"
          size="sm"
          onClick={() => handleEditIncident(incident)}
        >
          Edit
        </Button>
      )
    } else if (isFieldEngineer()) {
      return (
        <Button
          color="warning"
          size="sm"
          onClick={() => handleEditIncident(incident)}
        >
          Update
        </Button>
      )
    } else if (isEndUser()) {
      return (
        <div className="d-flex gap-1">
          <Button
            color="outline-info"
            size="sm"
            onClick={() => handleViewIncident(incident)}
          >
            View
          </Button>
        </div>
      )
    } else {
      return (
        <Button
          color="outline-primary"
          size="sm"
          onClick={() => handleEditIncident(incident)}
        >
          Edit
        </Button>
      )
    }
  }

  // Initialization
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login')
      return
    }

    const initializeData = async () => {
      await loadMasterData()
      await fetchData()
    }

    initializeData()
  }, [router, userType])

  // Loading State
  if (loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading incidents...</span>
          </div>
          <p className="mt-3 text-muted">Loading incidents...</p>
        </div>
      </Container>
    )
  }

  // Error State
  if (error) {
    return (
      <Container fluid>
        <Alert color="danger" className="mt-3">
          <strong>Error:</strong> {error}
          <div className="mt-2">
            <Button color="primary" onClick={fetchData} className="me-2">
              Try again
            </Button>
            <Button color="secondary" onClick={handleBackToDashboard}>
              Back to Dashboard
            </Button>
          </div>
        </Alert>
      </Container>
    )
  }

  // Main Render - Edit Modal Route
  if (editingIncident && showEditModal) {
    return (
      <EditIncident
        incident={editingIncident}
        userType={userType}
        onClose={handleCloseEdit}
        onSave={handleCloseEdit}
        readOnly={editingIncident.readOnly || false}
      />
    )
  }

  const stats = getIncidentStats(filteredIncidents)

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
                    <h4 className="mb-1">Active Incidents</h4>
                    <small className="text-muted">
                      View and track active incidents (New, InProgress, OnHold)
                    </small>
                  </div>
                  <div>
                    <Button
                      color="secondary"
                      size="sm"
                      onClick={handleBackToDashboard}
                    >
                      ← Back to Dashboard
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Tabs for Handler */}
        {isHandler() && (
          <Row>
            <Col xs={12}>
              <Nav tabs className="mb-3">
                <NavItem>
                  <NavLink
                    className={activeTab === 'my_incidents' ? 'active' : ''}
                    onClick={() => setActiveTab('my_incidents')}
                    style={{ cursor: 'pointer' }}
                  >
                    My Incidents ({filteredIncidents.length})
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={activeTab === 'assigned_incidents' ? 'active' : ''}
                    onClick={() => setActiveTab('assigned_incidents')}
                    style={{ cursor: 'pointer' }}
                  >
                    Assigned to Others ({filteredAssignedIncidents.length})
                  </NavLink>
                </NavItem>
              </Nav>
            </Col>
          </Row>
        )}

        <TabContent activeTab={isHandler() ? activeTab : 'my_incidents'}>
          {/* My Incidents Tab */}
          <TabPane tabId="my_incidents">
            {/* Filters */}
            <Row>
              <Col xs={12}>
                <Card>
                  <CardHeader>
                    <div className="d-flex justify-content-between align-items-center">
                      <h5>Filter Active Incidents</h5>
                      <Button
                        color="outline-primary"
                        size="sm"
                        onClick={fetchData}
                      >
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <Row>
                      <Col md={6}>
                        <label>Search</label>
                        <Input
                          type="text"
                          placeholder="Search by number, caller, description..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </Col>
                      <Col md={6}>
                        <label>Status</label>
                        <Input
                          type="select"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option value="all">All Active Statuses</option>
                          <option value="new">New</option>
                          <option value="inprogress">InProgress</option>
                          <option value="onhold">OnHold</option>
                        </Input>
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
                    <div className="d-flex justify-content-between align-items-center">
                      <h5>
                        {hasFullEditPermissions() ? 'All Active Incidents' : 'My Active Incidents'} ({filteredIncidents.length})
                      </h5>
                      <div>
                        <small className="text-muted">
                          Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredIncidents.length)} of {filteredIncidents.length}
                        </small>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody>
                    {filteredIncidents.length === 0 ? (
                      <div className="text-center py-4">
                        <h6 className="text-muted">No active incidents found</h6>
                        <p className="text-muted">No active incidents match your current criteria.</p>
                        <Button color="primary" onClick={fetchData}>
                          Refresh Data
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="table-responsive">
                          <table className="table table-hover">
                            <thead>
                              <tr>
                                <th>Incident</th>
                                <th>Category</th>
                                <th>Status</th>
                                {hasFullEditPermissions() && <th>Priority</th>}
                                {hasFullEditPermissions() && <th>Caller</th>}
                                {isFieldEngineer() && <th>Location</th>}
                                {!hasFullEditPermissions() && !isFieldEngineer() && <th>Assigned</th>}
                                <th>Created</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentIncidents.map((incident) => (
                                <tr key={incident.id}>
                                  <td>
                                    <span className="fw-medium text-primary">
                                      {getIncidentNumber(incident)}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="fw-medium text-dark">
                                      {getCategoryName(incident)}
                                    </div>
                                  </td>
                                  <td>
                                    <Badge
                                      style={{
                                        backgroundColor: getStatusColor(getStatus(incident)),
                                        color: 'white'
                                      }}
                                    >
                                      {getStatus(incident)}
                                    </Badge>
                                  </td>
                                  {hasFullEditPermissions() && (
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
                                  )}
                                  {hasFullEditPermissions() && (
                                    <td>
                                      <div className="fw-medium text-dark">
                                        {getCallerName(incident)}
                                      </div>
                                    </td>
                                  )}
                                  {isFieldEngineer() && (
                                    <td>
                                      <small className="text-muted">
                                        {incident.address || ''}
                                      </small>
                                    </td>
                                  )}
                                  {!hasFullEditPermissions() && !isFieldEngineer() && (
                                    <td>
                                      <small className="text-muted">
                                        {getAssignedTo(incident)}
                                      </small>
                                    </td>
                                  )}
                                  <td>
                                    <small className="text-dark">
                                      {formatDateOnly(incident.created_at)}
                                    </small>
                                  </td>
                                  <td>
                                    {renderActionButtons(incident)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {totalPages > 1 && (
                          <div className="d-flex justify-content-between align-items-center mt-3">
                            <div>
                              <small className="text-muted">
                                Page {currentPage} of {totalPages}
                              </small>
                            </div>
                            <div>{renderPaginationButtons(currentPage, totalPages, handlePageChange)}</div>
                          </div>
                        )}
                      </>
                    )}
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* Assigned Incidents Tab (Handler Only) */}
          {isHandler() && (
            <TabPane tabId="assigned_incidents">
              {/* Filters for Assigned Incidents */}
              <Row>
                <Col xs={12}>
                  <Card>
                    <CardHeader>
                      <div className="d-flex justify-content-between align-items-center">
                        <h5>Filter Assigned Incidents</h5>
                        <Button
                          color="outline-primary"
                          size="sm"
                          onClick={fetchHandlerAssignedIncidents}
                          disabled={assignedLoading}
                        >
                          {assignedLoading ? 'Loading...' : 'Refresh'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardBody>
                      <Row>
                        <Col md={6}>
                          <label>Search</label>
                          <Input
                            type="text"
                            placeholder="Search by incident number, category, assigned to..."
                            value={assignedSearchTerm}
                            onChange={(e) => setAssignedSearchTerm(e.target.value)}
                          />
                        </Col>
                                  <Col md={6}>
                          <div className="d-flex align-items-end h-100">
                            <small className="text-muted">
                              Incidents you have assigned to other team members (read-only access)
                            </small>
                          </div>
                        </Col>
                      </Row>
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              {/* Assigned Incidents Table */}
              <Row>
                <Col xs={12}>
                  <Card>
                    <CardHeader>
                      <div className="d-flex justify-content-between align-items-center">
                        <h5>
                          Incidents Assigned to Others ({filteredAssignedIncidents.length})
                        </h5>
                        <div>
                          <small className="text-muted">
                            Showing {assignedStartIndex + 1}-{Math.min(assignedStartIndex + itemsPerPage, filteredAssignedIncidents.length)} of {filteredAssignedIncidents.length}
                          </small>
                        </div>
                      </div>
                    </CardHeader>
                    <CardBody>
                      {assignedLoading ? (
                        <div className="text-center py-4">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading assigned incidents...</span>
                          </div>
                          <p className="mt-3 text-muted">Loading assigned incidents...</p>
                        </div>
                      ) : filteredAssignedIncidents.length === 0 ? (
                        <div className="text-center py-4">
                          <h6 className="text-muted">No assigned incidents found</h6>
                          <p className="text-muted">
                            You haven't assigned any incidents to other team members yet.
                          </p>
                          <Button color="primary" onClick={fetchHandlerAssignedIncidents}>
                            Refresh Data
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="table-responsive">
                            <table className="table table-hover">
                              <thead>
                                <tr>
                                  <th>Incident Number</th>
                                  <th>Category</th>
                                  <th>Assigned To</th>
                                  <th>Assignment Date</th>
                                  <th>Current Status</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {currentAssignedIncidents.map((assignment) => (
                                  <tr key={assignment.id}>
                                    <td>
                                      <span className="fw-medium text-primary">
                                        {assignment.incident ? getIncidentNumber(assignment.incident) : 'N/A'}
                                      </span>
                                    </td>
                                    <td>
                                      <div className="fw-medium text-dark">
                                        {assignment.incident ? getCategoryName(assignment.incident) : 'No category available'}
                                      </div>
                                      {assignment.incident?.short_description && (
                                        <small className="text-muted">
                                          {assignment.incident.short_description.length > 50
                                            ? `${assignment.incident.short_description.substring(0, 50)}...`
                                            : assignment.incident.short_description
                                          }
                                        </small>
                                      )}
                                    </td>
                                    <td>
                                      <div className="fw-medium text-dark">
                                        {getUserName(assignment.to)}
                                      </div>
                                    </td>
                                    <td>
                                      <small className="text-dark">
                                        {formatDateOnly(assignment.created_at)}
                                      </small>
                                    </td>
                                    <td>
                                      {assignment.incident && (
                                        <Badge
                                          style={{
                                            backgroundColor: getStatusColor(getStatus(assignment.incident)),
                                            color: 'white'
                                          }}
                                        >
                                          {getStatus(assignment.incident)}
                                        </Badge>
                                      )}
                                    </td>
                                    <td>
                                      {assignment.incident && renderActionButtons(assignment.incident, true)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {assignedTotalPages > 1 && (
                            <div className="d-flex justify-content-between align-items-center mt-3">
                              <div>
                                <small className="text-muted">
                                  Page {assignedCurrentPage} of {assignedTotalPages}
                                </small>
                              </div>
                              <div>{renderPaginationButtons(assignedCurrentPage, assignedTotalPages, handleAssignedPageChange)}</div>
                            </div>
                          )}
                        </>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              </Row>
            </TabPane>
          )}
        </TabContent>
      </Container>

      {/* View Modal */}
      {showViewModal && selectedIncident && isEndUser() && (
        <ViewIncident
          incident={selectedIncident}
          onClose={handleCloseView}
          userType={userType}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingIncident && (
        <EditIncident
          incident={editingIncident}
          userType={userType}
          onClose={handleCloseEdit}
          onSave={handleCloseEdit}
          readOnly={editingIncident.readOnly || false}
        />
      )}
    </>
  )
}

export default AllIncidents
