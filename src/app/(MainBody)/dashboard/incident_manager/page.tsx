'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Badge, Spinner } from 'reactstrap'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

// Components
import InteractiveIncidentMap from '../../../../Components/InteractiveIncidentMap'
import RequestForm from '../../../../Components/RequestForm'
import MyRequests from '../../../../Components/MyRequests'
import AllIncidents from '../../../../Components/AllIncidents'
import AssignIncidents from '../../../../Components/AssignIncidents'

// Services
import {
  fetchManagerIncidents,
  getIncidentStats,
  getStatusColor,
  getPriorityColor,
  type Incident
} from '../../services/incidentService'

import {
  getCurrentUser,
  isAuthenticated,
  clearUserData,
  type User
} from '../../services/userService'

// Dynamic imports
const Chart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => <Spinner color="primary" />
})

// Types
interface DashboardState {
  managedIncidents: Incident[]
  loading: boolean
  error: string | null
}

interface UserState {
  name: string
  team: string
  email: string
  userId: string
}

interface HandlerPerformanceData {
  handlers: string[]
  pending: number[]
  inProgress: number[]
  resolved: number[]
}

type ViewType = 'dashboard' | 'request-form' | 'my-requests' | 'all-incidents' | 'assign-incidents'

// Constants
const VIEWS = {
  DASHBOARD: 'dashboard' as const,
  REQUEST_FORM: 'request-form' as const,
  MY_REQUESTS: 'my-requests' as const,
  ALL_INCIDENTS: 'all-incidents' as const,
  ASSIGN_INCIDENTS: 'assign-incidents' as const,
}

const IncidentManagerDashboard: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [currentView, setCurrentView] = useState<ViewType>(
    (searchParams.get('view') as ViewType) || VIEWS.DASHBOARD
  )
  const [dashboardData, setDashboardData] = useState<DashboardState>({
    managedIncidents: [],
    loading: true,
    error: null
  })
  const [user, setUser] = useState<UserState>({
    name: '',
    team: '',
    email: '',
    userId: ''
  })
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [handlerPerformanceData, setHandlerPerformanceData] = useState<HandlerPerformanceData>({
    handlers: [],
    pending: [],
    inProgress: [],
    resolved: []
  })

  // Helper functions
  const getIncidentNumber = useCallback((incident: Incident): string => {
    return incident.incident_no || incident.id?.toString() || 'Unknown'
  }, [])

  const getCategoryName = useCallback((incident: Incident): string => {
    if (incident.category && typeof incident.category === 'object' && incident.category.name) {
      return incident.category.name
    }
    return 'Uncategorized'
  }, [])

  const getPriorityName = useCallback((incident: Incident): string => {
    if (incident.priority && typeof incident.priority === 'object' && incident.priority.name) {
      return incident.priority.name
    }
    if (incident.urgency && typeof incident.urgency === 'object' && incident.urgency.name) {
      return incident.urgency.name
    }
    return 'Medium'
  }, [])

  const getStatusName = useCallback((incident: Incident): 'pending' | 'in_progress' | 'resolved' | 'closed' => {
    if (incident.incidentstate && typeof incident.incidentstate === 'string') {
      return incident.incidentstate as 'pending' | 'in_progress' | 'resolved' | 'closed'
    }
    if (incident.incidentstate && typeof incident.incidentstate === 'object' && incident.incidentstate.name) {
      const state = incident.incidentstate.name.toLowerCase()
      switch (state) {
        case 'new': return 'pending'
        case 'inprogress': return 'in_progress'
        case 'resolved': return 'resolved'
        case 'closed': return 'closed'
        default: return 'pending'
      }
    }
    return 'pending'
  }, [])

  const getAssignedToName = useCallback((incident: Incident): string => {
    if (!incident.assigned_to) return 'Unassigned'
    const firstName = incident.assigned_to.name || ''
    const lastName = incident.assigned_to.last_name || ''
    return firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || 'Unassigned'
  }, [])

  const getCreatedAt = useCallback((incident: Incident): string => {
    return incident.created_at || new Date().toISOString()
  }, [])

  const getCallerName = useCallback((incident: Incident): string => {
    if (!incident.user) return 'Unknown User'
    const firstName = incident.user.name || ''
    const lastName = incident.user.last_name || ''
    return firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || 'Unknown User'
  }, [])

  const formatDateLocal = useCallback((dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return 'Unknown'
    }
  }, [])

  // Data fetching functions
  const fetchData = useCallback(async (): Promise<void> => {
    try {
      console.log('=== INCIDENT MANAGER DASHBOARD DEBUG START ===');

      setDashboardData(prev => ({ ...prev, loading: true, error: null }))

      if (!isAuthenticated()) {
        console.log('User not authenticated, redirecting to login');
        router.replace('/auth/login')
        return
      }

      const currentUser = getCurrentUser()
      console.log('getCurrentUser() result:', currentUser);

      if (!currentUser.id) {
        throw new Error('User ID not found. Please log in again.')
      }

      setUser({
        name: currentUser.first_name || 'Manager',
        team: currentUser.team_name || 'Incident Manager',
        email: currentUser.email || '',
        userId: currentUser.id.toString()
      })

      console.log('About to fetch manager incidents...');
      const managerIncidents = await fetchManagerIncidents()
      console.log('Fetched manager incidents:', managerIncidents);

      setDashboardData({
        managedIncidents: managerIncidents,
        loading: false,
        error: null
      })

      console.log('=== INCIDENT MANAGER DASHBOARD DEBUG END ===');
    } catch (error: any) {
      console.error('Manager Dashboard fetch error:', error)
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load dashboard data'
      }))
    }
  }, [router])

  const getHandlerPerformanceData = useCallback(async (): Promise<HandlerPerformanceData> => {
    if (dashboardData.managedIncidents.length === 0) {
      return { handlers: [], pending: [], inProgress: [], resolved: [] }
    }

    const handlerMap = new Map<string, { pending: number; inProgress: number; resolved: number }>()

    dashboardData.managedIncidents.forEach(incident => {
      let handlerName = getAssignedToName(incident)

      if (!handlerName || handlerName.trim() === '' || handlerName.toLowerCase() === 'unassigned') {
        handlerName = 'Unassigned'
      } else if (handlerName.includes('@')) {
        handlerName = handlerName.split('@')[0]
      }

      if (!handlerMap.has(handlerName)) {
        handlerMap.set(handlerName, { pending: 0, inProgress: 0, resolved: 0 })
      }

      const handlerStats = handlerMap.get(handlerName)!
      const status = getStatusName(incident)

      if (status === 'resolved' || status === 'closed') {
        handlerStats.resolved++
      } else if (status === 'in_progress') {
        handlerStats.inProgress++
      } else {
        handlerStats.pending++
      }
    })

    const sortedHandlers = Array.from(handlerMap.entries())
      .map(([name, stats]) => ({
        name,
        ...stats,
        total: stats.pending + stats.inProgress + stats.resolved
      }))
      .filter(h => h.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10) // Limit to top 10 handlers

    return {
      handlers: sortedHandlers.map(h => h.name),
      pending: sortedHandlers.map(h => h.pending),
      inProgress: sortedHandlers.map(h => h.inProgress),
      resolved: sortedHandlers.map(h => h.resolved)
    }
  }, [dashboardData.managedIncidents, getAssignedToName, getStatusName])

  // Navigation handlers
  const handleBackToDashboard = useCallback((): void => {
    setCurrentView(VIEWS.DASHBOARD)
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.delete('view')
    window.history.pushState({}, '', newUrl.toString())
  }, [])

  const handleViewAllIncidents = useCallback((): void => {
    setCurrentView(VIEWS.ALL_INCIDENTS)
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('view', VIEWS.ALL_INCIDENTS)
    window.history.pushState({}, '', newUrl.toString())
  }, [])

  const handleViewAssignIncidents = useCallback((): void => {
    setCurrentView(VIEWS.ASSIGN_INCIDENTS)
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('view', VIEWS.ASSIGN_INCIDENTS)
    window.history.pushState({}, '', newUrl.toString())
  }, [])

  const handlePinClick = useCallback((incident: Incident): void => {
    setSelectedIncident(incident)
  }, [])

  const closeIncidentDetails = useCallback((): void => {
    setSelectedIncident(null)
  }, [])

  const handleLogout = useCallback((): void => {
    clearUserData()
    router.replace('/auth/login')
  }, [router])

  const handleRefreshData = useCallback(async (): Promise<void> => {
    await fetchData()
  }, [fetchData])

  // Effects
  useEffect(() => {
    const currentViewParam = searchParams.get('view') as ViewType
    setCurrentView(currentViewParam || VIEWS.DASHBOARD)
  }, [searchParams])

  useEffect(() => {
    if (currentView === VIEWS.DASHBOARD) {
      fetchData()
    }
  }, [currentView, fetchData])

  useEffect(() => {
    const loadHandlerData = async (): Promise<void> => {
      const data = await getHandlerPerformanceData()
      setHandlerPerformanceData(data)
    }

    if (dashboardData.managedIncidents.length > 0 && currentView === VIEWS.DASHBOARD) {
      loadHandlerData()
    }
  }, [dashboardData.managedIncidents, currentView, getHandlerPerformanceData])

  // View routing
  if (currentView === VIEWS.REQUEST_FORM) {
    return <RequestForm userType="manager" onBack={handleBackToDashboard} initialView="form" />
  }

  if (currentView === VIEWS.MY_REQUESTS) {
    return <MyRequests userType="manager" onBack={handleBackToDashboard} />
  }

  if (currentView === VIEWS.ALL_INCIDENTS) {
    return <AllIncidents userType="manager" onBack={handleBackToDashboard} />
  }

  if (currentView === VIEWS.ASSIGN_INCIDENTS) {
    return <AssignIncidents userType="manager" onBack={handleBackToDashboard} />
  }

  // Loading state
  if (dashboardData.loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <Spinner color="warning" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted">Loading manager dashboard...</p>
        </div>
      </Container>
    )
  }

  // Error state
  if (dashboardData.error) {
    return (
      <Container fluid>
        <div className="alert alert-danger mt-3">
          <strong>Error:</strong> {dashboardData.error}
          <div className="mt-2">
            <Button color="primary" onClick={handleRefreshData} className="me-2">
              Try again
            </Button>
            <Button color="secondary" onClick={handleLogout}>
              Logout & Login Again
            </Button>
          </div>
        </div>
      </Container>
    )
  }

  // Get statistics
  const stats = getIncidentStats(dashboardData.managedIncidents)

  // Chart configurations
  const statusOverviewSeries = [stats.pending, stats.inProgress, stats.resolved, stats.closed]
  const statusOverviewLabels = ['Pending', 'In Progress', 'Resolved', 'Closed']
  const statusOverviewColors = ['#f59e0b', '#3b82f6', '#10b981', '#6b7280']

  const statusOverviewOptions = {
    chart: { type: 'donut' as const, height: 280 },
    labels: statusOverviewLabels,
    colors: statusOverviewColors,
    legend: { position: 'bottom' as const },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Math.round(val)}%`
    },
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              formatter: () => `${stats.total}`
            }
          }
        }
      }
    }
  }

  const barChartOptions = {
    chart: { type: 'bar' as const, height: 400 },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%'
      }
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: {
      categories: handlerPerformanceData.handlers,
      title: { text: 'Team Members' },
      labels: {
        rotate: -45,
        style: { fontSize: '12px' }
      }
    },
    yaxis: {
      title: { text: 'Number of Incidents' },
      min: 0
    },
    fill: { opacity: 1 },
    colors: ['#ffc107', '#3b82f6', '#10b981'],
    legend: {
      position: 'top' as const,
      horizontalAlign: 'center' as const
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val} incidents`
      }
    }
  }

  const barChartSeries = [
    { name: 'Pending', data: handlerPerformanceData.pending },
    { name: 'In Progress', data: handlerPerformanceData.inProgress },
    { name: 'Resolved', data: handlerPerformanceData.resolved }
  ]

  return (
    <>
      <Container fluid>
        {/* Welcome Header */}
        <Row>
          <Col xs={12}>
            <Card className="mb-4 mt-4">
              <CardBody>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h4 className="mb-1">Welcome back, {user.name}!</h4>
                    <small className="text-muted">
                      Incident Manager Dashboard - Team Oversight & Performance Management (User ID: {user.userId})
                    </small>
                  </div>
                  <div>
                    <Button color="outline-primary" size="sm" onClick={handleRefreshData}>
                      🔄 Refresh
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Quick Actions */}
        <Row>
          <Col xs={12}>
            <Card className="mb-4">
              <CardBody>
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">🚀 Quick Management Actions</h6>
                  <div className="d-flex gap-2">
                    <Button color="primary" size="sm" onClick={handleViewAllIncidents}>
                      📋 All Incidents
                    </Button>
                    <Button color="warning" size="sm" onClick={handleViewAssignIncidents}>
                      🎯 Assign Incidents
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Statistics Cards */}
        <Row className="mb-4">
          {[
            { value: stats.total, label: 'Total Incidents', color: 'primary', border: 'border-primary' },
            { value: stats.resolved, label: 'Resolved', color: 'success', border: 'border-success' },
            { value: stats.inProgress, label: 'In Progress', color: 'info', border: 'border-info' },
            { value: stats.pending, label: 'Pending', color: 'warning', border: 'border-warning' }
          ].map((stat, index) => (
            <Col xl={3} md={6} key={index}>
              <Card className={`${stat.border} h-100`}>
                <CardBody className="text-center py-4">
                  <h3 className={`mb-0 text-${stat.color}`}>{stat.value}</h3>
                  <p className="text-muted mb-0">{stat.label}</p>
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Status Overview and Map */}
        <Row className="mb-4">
          <Col lg={4}>
            <Card className="h-100">
              <CardHeader>
                <h5 className="mb-0">📊 Status Overview</h5>
              </CardHeader>
              <CardBody>
                {stats.total > 0 ? (
                  <Chart
                    options={statusOverviewOptions}
                    series={statusOverviewSeries}
                    type="donut"
                    height={280}
                  />
                ) : (
                  <div className="text-center py-5">
                    <div className="text-muted mb-3">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                        <line x1="9" y1="9" x2="9.01" y2="9"/>
                        <line x1="15" y1="9" x2="15.01" y2="9"/>
                      </svg>
                    </div>
                    <p className="text-muted">No incident data available</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>

          <Col lg={8}>
            <Card className="h-100">
              <CardHeader>
                <h5 className="mb-0">🗺️ Interactive Incident Map</h5>
              </CardHeader>
              <CardBody>
                <InteractiveIncidentMap
                  incidents={dashboardData.managedIncidents}
                  onPinClick={handlePinClick}
                  height="280px"
                />
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Team Performance */}
        <Row className="mb-4">
          <Col lg={12}>
            <Card>
              <CardHeader>
                <h5 className="mb-0">👥 Team Performance Overview</h5>
              </CardHeader>
              <CardBody>
                {stats.total > 0 && handlerPerformanceData.handlers.length > 0 ? (
                  <Chart
                    options={barChartOptions}
                    series={barChartSeries}
                    type="bar"
                    height={400}
                  />
                ) : (
                  <div className="text-center py-5">
                    <div className="text-muted mb-3">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <p className="text-muted">No team performance data available</p>
                    <small className="text-muted">Performance data will appear as incidents are assigned</small>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Recent Incidents */}
        <Row>
          <Col lg={12}>
            <Card>
              <CardHeader>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">📋 Recent Incidents ({dashboardData.managedIncidents.length} total)</h5>
                  <div>
                    <Button color="outline-primary" size="sm" onClick={handleViewAllIncidents} className="me-2">
                      View All Incidents
                    </Button>
                    <Button color="outline-warning" size="sm" onClick={handleViewAssignIncidents}>
                      Assign Incidents
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                {dashboardData.managedIncidents.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Incident</th>
                          <th>Category</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Assigned To</th>
                          <th>Created</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.managedIncidents
                          .sort((a, b) => new Date(getCreatedAt(b)).getTime() - new Date(getCreatedAt(a)).getTime())
                          .slice(0, 5)
                          .map((incident) => (
                            <tr key={incident.id}>
                              <td>
                                <span className="fw-medium text-primary">{getIncidentNumber(incident)}</span>
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
                                  backgroundColor: getStatusColor(getStatusName(incident)),
                                  color: 'white'
                                }}>
                                  {getStatusName(incident).replace('_', ' ')}
                                </Badge>
                              </td>
                              <td>
                                <small className="text-muted">{getAssignedToName(incident)}</small>
                              </td>
                              <td>
                                <small>{formatDateLocal(getCreatedAt(incident))}</small>
                              </td>
                              <td>
                                <Button
                                  color="outline-primary"
                                  size="sm"
                                  onClick={() => handlePinClick(incident)}
                                >
                                  View
                                </Button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <div className="text-muted mb-3">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                    </div>
                    <p className="text-muted mb-0">No incidents found</p>
                    <small className="text-muted">Incidents will appear here as they are created and assigned</small>
                    <div className="mt-3">
                      <Button color="primary" onClick={handleRefreshData}>Refresh Data</Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Incident Details Modal */}
      {selectedIncident && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999
          }}
          onClick={closeIncidentDetails}
        >
          <div
            className="bg-white rounded shadow-lg"
            style={{
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="m-0">
              <CardHeader className="bg-warning text-white">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 text-white">📍 Incident Details</h5>
                  <Button
                    color="link"
                    className="text-white p-0"
                    onClick={closeIncidentDetails}
                    style={{ fontSize: '24px', textDecoration: 'none' }}
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                <Row>
                  <Col md={6}>
                    <div className="mb-3">
                      <strong>Incident ID:</strong>
                      <div className="text-primary fs-5 fw-bold">{getIncidentNumber(selectedIncident)}</div>
                    </div>
                    <div className="mb-3">
                      <strong>Category:</strong>
                      <div>{getCategoryName(selectedIncident)}</div>
                    </div>
                    <div className="mb-3">
                      <strong>Priority:</strong>
                      <div>
                        <Badge
                          style={{
                            backgroundColor: getPriorityColor(getPriorityName(selectedIncident)),
                            color: 'white'
                          }}
                          className="fs-6"
                        >
                          {getPriorityName(selectedIncident)}
                        </Badge>
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="mb-3">
                      <strong>Status:</strong>
                      <div>
                        <Badge
                          style={{
                            backgroundColor: getStatusColor(getStatusName(selectedIncident)),
                            color: 'white'
                          }}
                          className="fs-6"
                        >
                          {getStatusName(selectedIncident).replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="mb-3">
                      <strong>Assigned To:</strong>
                      <div>{getAssignedToName(selectedIncident)}</div>
                    </div>
                    <div className="mb-3">
                      <strong>Created:</strong>
                      <div>{formatDateLocal(getCreatedAt(selectedIncident))}</div>
                    </div>
                  </Col>
                </Row>

                <div className="mb-3">
                  <strong>Description:</strong>
                  <div className="mt-1 p-2 bg-light rounded">
                    {selectedIncident.short_description || 'No description available'}
                  </div>
                </div>

                {selectedIncident.description &&
                 selectedIncident.description !== selectedIncident.short_description && (
                  <div className="mb-3">
                    <strong>Detailed Description:</strong>
                    <div className="mt-1 p-2 bg-light rounded">
                      {selectedIncident.description}
                    </div>
                  </div>
                )}

                {(selectedIncident.address || selectedIncident.lat || selectedIncident.lng) && (
                  <div className="mb-3">
                    <strong>Location:</strong>
                    <div className="mt-1 p-2 bg-light rounded">
                      <div>{selectedIncident.address || 'Address not specified'}</div>
                      {(selectedIncident.lat && selectedIncident.lng) && (
                        <div>
                          <strong>GPS Coordinates:</strong> {selectedIncident.lat.toString().substring(0,8)}, {selectedIncident.lng.toString().substring(0,8)}
                          <span className="text-success ms-2">📍 Precise Location</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Row>
                  <Col md={6}>
                    <div className="mb-3">
                      <strong>Reported By:</strong>
                      <div>{getCallerName(selectedIncident)}</div>
                      <small className="text-muted">
                        {selectedIncident.reported_by || selectedIncident.user?.email || ''}
                      </small>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="mb-3">
                      <strong>Contact Type:</strong>
                      <div>{selectedIncident.contact_type?.name || 'Not specified'}</div>
                    </div>
                  </Col>
                </Row>

                <div className="text-center mt-4">
                  <Button
                    color="warning"
                    className="me-2"
                    onClick={() => {
                      closeIncidentDetails();
                      handleViewAssignIncidents();
                    }}
                  >
                    Assign Handler
                  </Button>
                  <Button
                    color="primary"
                    className="me-2"
                    onClick={() => {
                      closeIncidentDetails();
                      handleViewAllIncidents();
                    }}
                  >
                    View All Incidents
                  </Button>
                  <Button color="outline-secondary" onClick={closeIncidentDetails}>Close</Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}

export default IncidentManagerDashboard
