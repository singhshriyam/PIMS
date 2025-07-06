'use client'
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Card, CardBody, Button } from 'reactstrap'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  getCurrentUser,
  isAuthenticated,
  clearUserData,
  getStoredToken
} from '../../services/userService'
import {
  fetchEndUserIncidents,
  getIncidentStats,
  getStatusColor,
  getPriorityColor,
  type Incident
} from '../../services/incidentService'
import AllIncidents from '../../../../Components/AllIncidents'

// Dynamic chart import
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

// ============ INTERFACES ============
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

// ============ MAIN COMPONENT ============
const EndUserDashboard = () => {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check if we should show all incidents
  const viewParam = searchParams.get('view')
  const statusParam = searchParams.get('status')
  const [showAllIncidents, setShowAllIncidents] = useState(viewParam === 'all-incidents')
  const [filterByStatus, setFilterByStatus] = useState<string | null>(statusParam)

  // State management
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

  // ============ DATA HELPERS ============
  const getCategoryName = (incident: Incident): string => {
    if (typeof incident.category === 'string') return incident.category
    if (typeof incident.category === 'object' && incident.category?.name) return incident.category.name
    return 'Uncategorized'
  }

  const getAssignedToName = (incident: Incident): string => {
    if (typeof incident.assigned_to === 'string') return incident.assigned_to
    if (typeof incident.assigned_to === 'object' && incident.assigned_to?.name) {
      const fullName = incident.assigned_to.last_name
        ? `${incident.assigned_to.name} ${incident.assigned_to.last_name}`
        : incident.assigned_to.name;
      return fullName || 'Unassigned';
    }
    return 'Unassigned'
  }

  const getIncidentId = (incident: Incident): string => {
    if (incident.incident_no) return incident.incident_no
    if (typeof incident.id === 'string') return incident.id
    if (typeof incident.id === 'number') return incident.id.toString()
    return 'Unknown'
  }

  const getStatus = (incident: Incident): string => {
    // Handle different possible status formats from the backend
    if (typeof incident.incidentstate === 'string') {
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

    // Fallback
    return 'pending';
  }

  const formatDateLocal = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch (error) {
      return 'Unknown'
    }
  }

  // ============ DATA FETCHING ============
  const fetchData = async () => {
    try {
      console.log('=== DASHBOARD DEBUG START ===');
      console.log('authToken exists:', !!getStoredToken());

      setDashboardData(prev => ({ ...prev, loading: true, error: null }))

      // Check authentication first
      if (!isAuthenticated()) {
        console.log('User not authenticated, redirecting to login');
        router.replace('/auth/login')
        return
      }

      // Get current user data
      const currentUser = getCurrentUser()
      console.log('getCurrentUser() result:', currentUser);

      if (!currentUser.id) {
        throw new Error('User ID not found. Please log in again.');
      }

      // Set user state using direct user ID
      setUser({
        name: currentUser.first_name || 'User',
        team: currentUser.team_name || 'End User',
        email: currentUser.email || '',
        userId: currentUser.id.toString()
      })

      console.log('About to fetch end user incidents...');
      const userIncidents = await fetchEndUserIncidents()
      console.log('Fetched incidents:', userIncidents);

      setDashboardData({
        myIncidents: userIncidents,
        loading: false,
        error: null
      })

      console.log('=== DASHBOARD DEBUG END ===');

    } catch (error: any) {
      console.error('Dashboard fetch error:', error)
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load dashboard data'
      }))
    }
  }

  // ============ CHART DATA ============
  const getMonthlyTrends = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']

    const monthlyData = months.map((month, index) => {
      const monthIncidents = dashboardData.myIncidents.filter(incident => {
        try {
          const incidentMonth = new Date(incident.created_at).getMonth()
          return incidentMonth === index
        } catch (error) {
          return false
        }
      })

      return {
        reported: monthIncidents.length,
        resolved: monthIncidents.filter(i => getStatus(i) === 'resolved').length,
        inProgress: monthIncidents.filter(i => getStatus(i) === 'in_progress').length
      }
    })

    return {
      months,
      reported: monthlyData.map(d => d.reported),
      resolved: monthlyData.map(d => d.resolved),
      inProgress: monthlyData.map(d => d.inProgress)
    }
  }

  // ============ EVENT HANDLERS ============
  const handleCreateIncident = () => {
    router.push('/dashboard?tab=create-incident')
  }

  const handleViewAllIncidents = () => {
    setShowAllIncidents(true)
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('view', 'all-incidents')
    window.history.pushState({}, '', newUrl.toString())
  }

  const handleBackToDashboard = () => {
    setShowAllIncidents(false)
    setFilterByStatus(null)
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.delete('view')
    newUrl.searchParams.delete('status')
    window.history.pushState({}, '', newUrl.toString())
  }

  const handleRefreshData = async () => {
    await fetchData()
  }

  const handleLogout = () => {
    clearUserData()
    router.replace('/auth/login')
  }

  // ============ CHART INTERACTIONS ============
  const handleChartClick = (statusToFilter: string) => {
    setShowAllIncidents(true)
    setFilterByStatus(statusToFilter)

    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('view', 'all-incidents')
    newUrl.searchParams.set('status', statusToFilter)
    window.history.pushState({}, '', newUrl.toString())
  }

  // ============ INITIALIZATION ============
  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const currentViewParam = searchParams.get('view')
    const currentStatusParam = searchParams.get('status')
    setShowAllIncidents(currentViewParam === 'all-incidents')
    setFilterByStatus(currentStatusParam)
  }, [searchParams])

  // ============ LOADING STATE ============
  if (dashboardData.loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading your dashboard...</span>
          </div>
          <p className="mt-3 text-muted">Loading dashboard data...</p>
        </div>
      </Container>
    )
  }

  // ============ ERROR STATE ============
  if (dashboardData.error) {
    return (
      <Container fluid>
        <div className="alert alert-danger mt-3">
          <strong>Error:</strong> {dashboardData.error}
          <div className="mt-2">
            <Button color="danger" onClick={handleRefreshData} className="me-2">
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

  // ============ ALL INCIDENTS VIEW ============
  if (showAllIncidents) {
    return (
      <AllIncidents
        userType="enduser"
        onBack={handleBackToDashboard}
        initialStatusFilter={filterByStatus}
      />
    )
  }

  // ============ MAIN DASHBOARD VIEW ============
  const stats = getIncidentStats(dashboardData.myIncidents)
  const { months, reported, resolved, inProgress } = getMonthlyTrends()

  // Debug info for development
  console.log('Dashboard render - incidents count:', dashboardData.myIncidents.length);
  console.log('Dashboard render - stats:', stats);

  // Pie chart data
  const pieChartSeries = [stats.resolved, stats.inProgress, stats.pending, stats.closed]
  const nonZeroData: number[] = []
  const nonZeroLabels: string[] = []
  const allLabels = ['Resolved', 'In Progress', 'Pending', 'Closed']
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
          if (!config || typeof config.dataPointIndex === 'undefined') return

          try {
            if (config.dataPointIndex < 0 || config.dataPointIndex >= nonZeroLabels.length) return

            const selectedLabel = nonZeroLabels[config.dataPointIndex]
            let statusToFilter = ''

            switch(selectedLabel) {
              case 'Resolved':
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
              setTimeout(() => {
                handleChartClick(statusToFilter)
              }, 0)
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
        formatter: function(val: number) {
          return val + ' incidents'
        }
      }
    }
  }

  // Bar chart options
  const barChartOptions = {
    chart: { type: 'bar' as const, height: 350 },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: { categories: months },
    yaxis: { title: { text: 'Number of Incidents' } },
    fill: { opacity: 1 },
    colors: ['#3b82f6', '#10b981', '#f59e0b']
  }

  const barChartSeries = [
    { name: 'Reported', data: reported },
    { name: 'Resolved', data: resolved },
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
                <div>
                  <Button color="primary" onClick={handleCreateIncident}>
                    + Report Incident
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
          { value: stats.total, label: 'My Total Incidents', color: 'primary' },
          { value: stats.resolved, label: 'Resolved', color: 'success' },
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
                <h5>My Recent Incidents</h5>
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
                  <h6 className="text-muted">No incidents reported yet</h6>
                  <p className="text-muted">You haven't reported any incidents yet. Click below to report your first incident.</p>
                  <Button color="primary" onClick={handleCreateIncident}>
                    Report Your First Incident
                  </Button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordernone">
                    <thead>
                      <tr>
                        <th scope="col">Incident</th>
                        <th scope="col">Category</th>
                        <th scope="col">Status</th>
                        <th scope="col">Assigned To</th>
                        <th scope="col">Reported Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.myIncidents
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .slice(0, 4)
                        .map((incident) => (
                        <tr key={incident.id}>
                          <td>
                            <span className="fw-medium text-primary">{getIncidentId(incident)}</span>
                          </td>
                          <td>
                            <div className="fw-medium">{getCategoryName(incident)}</div>
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{ backgroundColor: getStatusColor(getStatus(incident)), color: 'white' }}
                            >
                              {getStatus(incident).replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <span className="text-muted">{getAssignedToName(incident)}</span>
                          </td>
                          <td>{formatDateLocal(incident.created_at)}</td>
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
              <h5 className="mb-3">Status Overview</h5>
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
                <div className="text-center py-4" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <p className="text-muted">No data to display</p>
                  <small className="text-muted">Report your first incident to see status overview</small>
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
              <h5 className="mb-3">My Monthly Incident Trends</h5>
              {stats.total > 0 ? (
                <div style={{ minHeight: '350px' }}>
                  <Chart
                    options={barChartOptions}
                    series={barChartSeries}
                    type="bar"
                    height={350}
                    key={`bar-chart-${stats.total}-${reported.join('-')}`}
                  />
                </div>
              ) : (
                <div className="text-center py-5" style={{ minHeight: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <p className="text-muted">No trend data available yet</p>
                  <small className="text-muted">Report incidents to see monthly trends</small>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default EndUserDashboard
