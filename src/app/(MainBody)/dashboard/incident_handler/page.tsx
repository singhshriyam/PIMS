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
  fetchHandlerIncidents,
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

const IncidentHandlerDashboard: React.FC = () => {
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
    return incident.category?.name || ''
  }, [])

  const getPriorityName = useCallback((incident: Incident): string => {
    return incident.priority?.name || incident.urgency?.name || ''
  }, [])

  const getCallerName = useCallback((incident: Incident): string => {
    if (!incident.user) return ''
    const fullName = incident.user.last_name
      ? `${incident.user.name} ${incident.user.last_name}`
      : incident.user.name
    return fullName || ''
  }, [])

  const getIncidentNumber = useCallback((incident: Incident): string => {
    return incident.incident_no || incident.id?.toString() || ''
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
    if (!dateString) return ''
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return ''
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
        name: currentUser.first_name || 'Handler',
        team: currentUser.team_name || 'Incident Handler',
        email: currentUser.email || '',
        userId: currentUser.id.toString()
      })

      const handlerIncidents = await fetchHandlerIncidents()

      setDashboardData({
        myIncidents: handlerIncidents,
        loading: false,
        error: null
      })

    } catch (error: any) {
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
      const userIncidents = await fetchHandlerIncidents()
      setDashboardData({
        myIncidents: userIncidents,
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

  // const handleViewAssignIncidents = useCallback((): void => {
  //   setCurrentView(VIEWS.ASSIGN_INCIDENTS)
  //   const newUrl = new URL(window.location.href)
  //   newUrl.searchParams.set('view', VIEWS.ASSIGN_INCIDENTS)
  //   window.history.pushState({}, '', newUrl.toString())
  // }, [])

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
    return <RequestForm userType="handler" onBack={handleBackToDashboard} initialView="form" />
  }

  if (currentView === VIEWS.MY_REQUESTS) {
    return <MyRequests userType="handler" onBack={handleBackToDashboard} />
  }

  if (currentView === VIEWS.ALL_INCIDENTS) {
    return (
      <AllIncidents
        userType="handler"
        onBack={handleBackToDashboard}
        initialStatusFilter={filterByStatus}
      />
    )
  }

  if (currentView === VIEWS.ASSIGN_INCIDENTS) {
    return <AssignIncidents userType="handler" onBack={handleBackToDashboard} />
  }

  // Loading state
  if (dashboardData.loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted">Loading incidents assigned to you...</p>
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
            // Silent error handling
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
        formatter: (val: number) => `${val} incidents`
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
    yaxis: { title: { text: 'Number of Incidents' } },
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
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row>
        {[
          { value: stats.total, label: 'My Total Assignments', color: 'primary' },
          { value: stats.resolved, label: 'Completed', color: 'success' },
          { value: stats.inProgress, label: 'In Progress', color: 'info' },
          { value: stats.pending, label: 'Pending', color: 'warning' }
        ].map((stat, index) => (
          <Col xl={3} md={6} className="box-col-6 mt-3" key={index}>
            <Card className="o-hidden">
              <CardBody className="b-r-4 card-body">
                <div className="media static-top-widget">
                  <div className="align-self-center text-center">
                    <div className="d-inline-block">
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
                <h5>My Recent Assigned Incidents</h5>
                <div>
                  {stats.total > 0 && (
                    <Button color="outline-primary" size="sm" onClick={handleViewAllIncidents}>
                      View All
                    </Button>
                  )}
                </div>
              </div>

              {dashboardData.myIncidents.length === 0 ? (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                  </div>
                  <h6 className="text-muted">No incidents assigned yet</h6>
                  <p className="text-muted">
                    You don't have any assigned incidents at the moment. Check back later for new assignments.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordernone">
                    <thead>
                      <tr>
                        <th scope="col">Incident</th>
                        <th scope="col">Category</th>
                        <th scope="col">Priority</th>
                        <th scope="col">Status</th>
                        <th scope="col">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.myIncidents
                        .sort((a, b) => new Date(getCreatedAt(b)).getTime() - new Date(getCreatedAt(a)).getTime())
                        .slice(0, 4)
                        .map((incident) => (
                        <tr key={incident.id}>
                          <td>
                            <div className="fw-medium">{getIncidentNumber(incident)}</div>
                          </td>
                          <td>
                            <div className="fw-medium">{getCategoryName(incident)}</div>
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
                          <td>{formatDateLocal(getCreatedAt(incident))}</td>
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
              <h5 className="mb-3">Task Overview</h5>
              {stats.total > 0 ? (
                <div style={{ minHeight: '300px' }}>
                  <Chart
                    options={pieChartOptions}
                    series={nonZeroData.length > 0 ? nonZeroData : [1]}
                    type="pie"
                    height={300}
                    key={`pie-chart-${stats.total}-${nonZeroData.join('-')}`}
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
                  <p className="text-muted">No data to display</p>
                  <small className="text-muted">No incidents assigned yet</small>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Monthly Trends */}
      <Row>
        <Col lg={12}>
          <Card>
            <CardBody>
              <h5 className="mb-3">My Monthly Performance Trends</h5>
              {stats.total > 0 ? (
                <div style={{ minHeight: '350px' }}>
                  <Chart
                    options={barChartOptions}
                    series={barChartSeries}
                    type="bar"
                    height={350}
                    key={`bar-chart-${stats.total}-${assigned.join('-')}`}
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
                  <p className="text-muted">No trend data available yet</p>
                  <small className="text-muted">No assignments to show trends</small>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default IncidentHandlerDashboard
