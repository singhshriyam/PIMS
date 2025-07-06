'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Container, Row, Col, Card, CardBody, Button, Spinner } from 'reactstrap'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

// Components
import RequestForm from '../../../../Components/RequestForm'
import MyRequests from '../../../../Components/MyRequests'
import AllIncidents from '../../../../Components/AllIncidents'
import AssignIncidents from '../../../../Components/AssignIncidents'

// Services
import {
  getCurrentUser,
  isAuthenticated,
  clearUserData,
  type User
} from '../../services/userService'

import {
  fetchExpertTeamIncidents,
  getIncidentStats,
  getStatusColor,
  getPriorityColor,
  type Incident
} from '../../services/incidentService'

// Dynamic imports
const Chart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => <Spinner color="primary" />
})

// Types
interface DashboardState {
  myIncidents: Incident[]
  loading: boolean
  error: string | null
}

interface UserState {
  name: string
  team: string
  email: string
  userId: string
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

const ExpertTeamDashboard: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [currentView, setCurrentView] = useState<ViewType>(
    (searchParams.get('view') as ViewType) || VIEWS.DASHBOARD
  )
  const [filterByStatus, setFilterByStatus] = useState<string | null>(
    searchParams.get('status')
  )
  const [dashboardData, setDashboardData] = useState<DashboardState>({
    myIncidents: [],
    loading: true,
    error: null
  })
  const [user, setUser] = useState<UserState>({
    name: '',
    team: '',
    email: '',
    userId: ''
  })

  // Helper functions
  const getStatus = useCallback((incident: Incident): string => {
    if (incident.incidentstate && typeof incident.incidentstate === 'string') {
      return incident.incidentstate.toLowerCase().replace('_', ' ');
    }

    if (incident.incidentstate && typeof incident.incidentstate === 'object' && incident.incidentstate.name) {
      const state = incident.incidentstate.name.toLowerCase();
      if (state === 'new') return 'pending';
      if (state === 'inprogress') return 'in_progress';
      if (state === 'resolved') return 'resolved';
      if (state === 'closed') return 'closed';
      return state;
    }

    return 'pending';
  }, [])

  const getCategoryName = useCallback((incident: Incident): string => {
    return incident.category?.name || 'Uncategorized'
  }, [])

  const getPriorityName = useCallback((incident: Incident): string => {
    return incident.priority?.name || incident.urgency?.name || 'Medium'
  }, [])

  const getCallerName = useCallback((incident: Incident): string => {
    if (!incident.user) return 'Unknown User'
    const fullName = incident.user.last_name
      ? `${incident.user.name} ${incident.user.last_name}`
      : incident.user.name
    return fullName || 'Unknown User'
  }, [])

  const getIncidentNumber = useCallback((incident: Incident): string => {
    return incident.incident_no || incident.id?.toString() || 'Unknown'
  }, [])

  const getCreatedAt = useCallback((incident: Incident): string => {
    return incident.created_at || new Date().toISOString()
  }, [])

  const getAssignedTo = useCallback((incident: Incident): string => {
    if (!incident.assigned_to) return 'Unassigned'
    const fullName = incident.assigned_to.last_name
      ? `${incident.assigned_to.name} ${incident.assigned_to.last_name}`
      : incident.assigned_to.name
    return fullName || 'Unassigned'
  }, [])

  const formatDateLocal = useCallback((dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return 'Unknown'
    }
  }, [])

  // Data fetching
  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true, error: null }))

      if (!isAuthenticated()) {
        router.replace('/auth/login')
        return
      }

      const currentUser = getCurrentUser()

      if (!currentUser.id) {
        throw new Error('User ID not found. Please log in again.')
      }

      setUser({
        name: currentUser.first_name || 'Expert Team Member',
        team: currentUser.team_name || 'Expert Team',
        email: currentUser.email || '',
        userId: currentUser.id.toString()
      })

      const expertIncidents = await fetchExpertTeamIncidents()

      setDashboardData({
        myIncidents: expertIncidents,
        loading: false,
        error: null
      })

    } catch (error: any) {
      console.error('Expert Team Dashboard fetch error:', error)
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load dashboard data'
      }))
    }
  }, [router])

  const handleRefreshData = useCallback(async (): Promise<void> => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true, error: null }))
      const expertIncidents = await fetchExpertTeamIncidents()
      setDashboardData({
        myIncidents: expertIncidents,
        loading: false,
        error: null
      })
    } catch (error: any) {
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to refresh data'
      }))
    }
  }, [])

  // Navigation handlers
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

  const handleBackToDashboard = useCallback((): void => {
    setCurrentView(VIEWS.DASHBOARD)
    setFilterByStatus(null)
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.delete('view')
    newUrl.searchParams.delete('status')
    window.history.pushState({}, '', newUrl.toString())
  }, [])

  const handleLogout = useCallback((): void => {
    clearUserData()
    router.replace('/auth/login')
  }, [router])

  // Chart data calculations
  const getMonthlyTrends = useCallback(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']

    const monthlyData = months.map((month, index) => {
      const monthIncidents = dashboardData.myIncidents.filter(incident => {
        try {
          const incidentMonth = new Date(getCreatedAt(incident)).getMonth()
          return incidentMonth === index
        } catch {
          return false
        }
      })

      return {
        assigned: monthIncidents.length,
        completed: monthIncidents.filter(i => getStatus(i) === 'resolved').length,
        inProgress: monthIncidents.filter(i => getStatus(i) === 'in_progress').length
      }
    })

    return {
      months,
      assigned: monthlyData.map(d => d.assigned),
      completed: monthlyData.map(d => d.completed),
      inProgress: monthlyData.map(d => d.inProgress)
    }
  }, [dashboardData.myIncidents, getCreatedAt, getStatus])

  // Effects
  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const currentViewParam = searchParams.get('view') as ViewType
    const currentStatusParam = searchParams.get('status')
    setCurrentView(currentViewParam || VIEWS.DASHBOARD)
    setFilterByStatus(currentStatusParam)
  }, [searchParams])

  // View routing
  if (currentView === VIEWS.REQUEST_FORM) {
    return <RequestForm userType="expert_team" onBack={handleBackToDashboard} initialView="form" />
  }

  if (currentView === VIEWS.MY_REQUESTS) {
    return <MyRequests userType="expert_team" onBack={handleBackToDashboard} />
  }

  if (currentView === VIEWS.ALL_INCIDENTS) {
    return (
      <AllIncidents
        userType="expert_team"
        onBack={handleBackToDashboard}
        initialStatusFilter={filterByStatus}
      />
    )
  }

  if (currentView === VIEWS.ASSIGN_INCIDENTS) {
    return <AssignIncidents userType="expert_team" onBack={handleBackToDashboard} />
  }

  // Loading state
  if (dashboardData.loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted">Loading expert team assignments...</p>
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

  // Get statistics and chart data
  const stats = getIncidentStats(dashboardData.myIncidents)
  const { months, assigned, completed, inProgress } = getMonthlyTrends()

  // Chart configurations
  const pieChartSeries = [stats.resolved, stats.inProgress, stats.pending, stats.closed]

  const nonZeroData: number[] = []
  const nonZeroLabels: string[] = []
  const allLabels = ['Completed', 'In Progress', 'Pending', 'Closed']
  const allColors = ['#10b981', '#3b82f6', '#f59e0b', '#6b7280']
  const nonZeroColors: string[] = []

  pieChartSeries.forEach((value, index) => {
    if (value > 0) {
      nonZeroData.push(value)
      nonZeroLabels.push(allLabels[index])
      nonZeroColors.push(allColors[index])
    }
  })

  const pieChartOptions = {
    chart: {
      type: 'pie' as const,
      height: 350,
      events: {
        dataPointSelection: function(event: any, chartContext: any, config: any) {
          try {
            const selectedLabel = nonZeroLabels[config.dataPointIndex]
            let statusToFilter = ''

            switch(selectedLabel) {
              case 'Completed':
                statusToFilter = 'resolved'
                break
              case 'In Progress':
                statusToFilter = 'in_progress'
                break
              case 'Pending':
                statusToFilter = 'pending'
                break
              case 'Closed':
                statusToFilter = 'closed'
                break
            }

            if (statusToFilter) {
              setCurrentView(VIEWS.ALL_INCIDENTS)
              setFilterByStatus(statusToFilter)
              const newUrl = new URL(window.location.href)
              newUrl.searchParams.set('view', VIEWS.ALL_INCIDENTS)
              newUrl.searchParams.set('status', statusToFilter)
              window.history.pushState({}, '', newUrl.toString())
            }
          } catch (error) {
            console.warn('Chart interaction error:', error)
          }
        }
      }
    },
    labels: nonZeroLabels.length > 0 ? nonZeroLabels : ['No Data'],
    colors: nonZeroColors.length > 0 ? nonZeroColors : ['#6b7280'],
    legend: { position: 'bottom' as const },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: { width: 200 },
        legend: { position: 'bottom' as const }
      }
    }],
    tooltip: {
      y: {
        formatter: (val: number) => `${val} cases`
      }
    }
  }

  const barChartOptions = {
    chart: { type: 'bar' as const, height: 350 },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%'
      }
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: { categories: months },
    yaxis: { title: { text: 'Number of Expert Cases' } },
    fill: { opacity: 1 },
    colors: ['#3b82f6', '#10b981', '#f59e0b']
  }

  const barChartSeries = [
    { name: 'Assigned', data: assigned },
    { name: 'Completed', data: completed },
    { name: 'In Progress', data: inProgress }
  ]

  return (
    <Container fluid>
      {/* Welcome Header */}
      <Row>
        <Col xs={12}>
          <Card className="mb-4 mt-4">
            <CardBody>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-1">Welcome back, {user.name}!</h4>
                  <small className="text-muted">Expert Team Dashboard - Advanced Analysis & Technical Resolution (User ID: {user.userId})</small>
                </div>
                <div className="d-flex gap-2">
                  <Button color="outline-primary" size="sm" onClick={handleRefreshData}>
                    🔄 Refresh
                  </Button>
                  <Button color="primary" size="sm" onClick={handleViewAssignIncidents}>
                    📋 Assign Incidents
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row>
        {[
          { value: stats.total, label: 'Expert Cases', color: 'primary', icon: '🧠' },
          { value: stats.resolved, label: 'Completed', color: 'success', icon: '✅' },
          { value: stats.inProgress, label: 'In Progress', color: 'info', icon: '🔬' },
          { value: stats.pending, label: 'Pending Review', color: 'warning', icon: '⏳' }
        ].map((stat, index) => (
          <Col xl={3} md={6} className="box-col-6 mt-3" key={index}>
            <Card className="o-hidden">
              <CardBody className="b-r-4 card-body">
                <div className="media static-top-widget">
                  <div className="align-self-center text-center">
                    <div className="d-inline-block">
                      <div className="fs-4 mb-2">{stat.icon}</div>
                      <h5 className="mb-0 counter">{stat.value}</h5>
                      <span className="f-light">{stat.label}</span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Main Content */}
      <Row>
        <Col lg={8}>
          <Card>
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5>🔬 Recent Expert Assignments</h5>
                <div className="d-flex gap-2">
                  {stats.total > 0 && (
                    <Button color="outline-primary" size="sm" onClick={handleViewAllIncidents}>
                      View All Cases
                    </Button>
                  )}
                  <Button color="primary" size="sm" onClick={handleViewAssignIncidents}>
                    📋 Assign Tasks
                  </Button>
                </div>
              </div>

              {dashboardData.myIncidents.length === 0 ? (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                  </div>
                  <h6 className="text-muted">No expert cases assigned yet</h6>
                  <p className="text-muted">
                    You don't have any expert assignments at the moment. Complex cases requiring specialized analysis will appear here.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordernone">
                    <thead>
                      <tr>
                        <th scope="col">Case ID</th>
                        <th scope="col">Expertise Area</th>
                        <th scope="col">Priority</th>
                        <th scope="col">Status</th>
                        <th scope="col">Assigned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.myIncidents
                        .sort((a, b) => new Date(getCreatedAt(b)).getTime() - new Date(getCreatedAt(a)).getTime())
                        .slice(0, 5)
                        .map((incident) => (
                        <tr key={incident.id}>
                          <td>
                            <span className="fw-medium text-primary">{getIncidentNumber(incident)}</span>
                          </td>
                          <td>
                            <div>
                              <div className="fw-medium">{getCategoryName(incident)}</div>
                              <small className="text-muted">Reported by: {getCallerName(incident)}</small>
                            </div>
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                backgroundColor: getPriorityColor(getPriorityName(incident)),
                                color: 'white'
                              }}
                            >
                              {getPriorityName(incident)}
                            </span>
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                backgroundColor: getStatusColor(getStatus(incident)),
                                color: 'white'
                              }}
                            >
                              {(getStatus(incident) || 'pending').toString().replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <small>{formatDateLocal(getCreatedAt(incident))}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>

        <Col lg={4}>
          <Card>
            <CardBody>
              <h5 className="mb-3">📊 Expert Workload</h5>
              {stats.total > 0 ? (
                <div style={{ minHeight: '300px' }}>
                  <Chart
                    options={pieChartOptions}
                    series={nonZeroData.length > 0 ? nonZeroData : [1]}
                    type="pie"
                    height={300}
                    key={`expert-pie-chart-${stats.total}-${nonZeroData.join('-')}`}
                  />
                </div>
              ) : (
                <div
                  className="text-center py-4"
                  style={{
                    minHeight: '300px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column'
                  }}
                >
                  <p className="text-muted">No expert cases to display</p>
                  <small className="text-muted">Workload distribution will appear here</small>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Monthly Expert Performance */}
      <Row>
        <Col lg={12}>
          <Card>
            <CardBody>
              <h5 className="mb-3">📈 Monthly Expert Performance</h5>
              {stats.total > 0 ? (
                <div style={{ minHeight: '350px' }}>
                  <Chart
                    options={barChartOptions}
                    series={barChartSeries}
                    type="bar"
                    height={350}
                    key={`expert-bar-chart-${stats.total}-${assigned.join('-')}`}
                  />
                </div>
              ) : (
                <div
                  className="text-center py-5"
                  style={{
                    minHeight: '350px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column'
                  }}
                >
                  <p className="text-muted">No performance data available yet</p>
                  <small className="text-muted">Expert case trends will appear here as work is completed</small>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default ExpertTeamDashboard
