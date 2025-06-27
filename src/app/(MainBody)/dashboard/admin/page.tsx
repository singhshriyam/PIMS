// app/dashboard/admin/page.tsx - Updated Admin Dashboard
'use client'
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Badge, Table } from 'reactstrap'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getCurrentUser, isAuthenticated } from '../../../(MainBody)/services/userService'
import { fetchAssets } from '../../../(MainBody)/services/masterService'

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

// Mock data for incidents - temporary until admin incidents API is fixed
const mockIncidents = [
  {
    id: 1,
    asset_id: 1,
    asset: { id: 1, name: 'Rivers' },
    status: 'pending',
    impact: 'high',
    short_description: 'Water contamination detected',
    created_at: '2025-06-24T10:00:00Z'
  },
  {
    id: 2,
    asset_id: 1,
    asset: { id: 1, name: 'Rivers' },
    status: 'in_progress',
    impact: 'medium',
    short_description: 'River flow monitoring issue',
    created_at: '2025-06-24T09:30:00Z'
  },
  {
    id: 3,
    asset_id: 2,
    asset: { id: 2, name: 'Lakes' },
    status: 'resolved',
    impact: 'low',
    short_description: 'Lake level sensor calibration',
    created_at: '2025-06-24T08:15:00Z'
  },
  {
    id: 4,
    asset_id: 3,
    asset: { id: 3, name: 'Reservoirs' },
    status: 'pending',
    impact: 'high',
    short_description: 'Reservoir overflow risk',
    created_at: '2025-06-24T07:45:00Z'
  },
  {
    id: 5,
    asset_id: 4,
    asset: { id: 4, name: 'Water Treatment Plants (WTP)' },
    status: 'in_progress',
    impact: 'critical',
    short_description: 'Treatment plant filter malfunction',
    created_at: '2025-06-24T06:30:00Z'
  }
]

// Mock data for SLA conditions
const mockSLAConditions = [
  {
    id: 1,
    name: 'Response',
    type: 'SLA',
    target: 'Response',
    days: 0,
    hours: 0,
    minutes: 3,
    seconds: 0,
    createdAt: '2025-04-23 17:09:32',
    status: 'Inactive'
  },
  {
    id: 2,
    name: 'Resolution-Significant',
    type: 'SLA',
    target: 'Resolution',
    days: 0,
    hours: 0,
    minutes: 3,
    seconds: 0,
    createdAt: '2025-04-23 17:10:10',
    status: 'Active'
  },
  {
    id: 3,
    name: 'Resolution-Moderate',
    type: 'SLA',
    target: 'Resolution',
    days: 0,
    hours: 0,
    minutes: 3,
    seconds: 0,
    createdAt: '2025-04-23 17:10:31',
    status: 'Active'
  },
  {
    id: 4,
    name: 'Resolution-Low',
    type: 'SLA',
    target: 'Resolution',
    days: 0,
    hours: 0,
    minutes: 3,
    seconds: 0,
    createdAt: '2025-04-23 17:10:59',
    status: 'Active'
  }
]

// Mock data for active users
const mockActiveUsers = [
  { id: '1', name: 'John Smith', role: 'Administrator', isOnline: true },
  { id: '2', name: 'Jane Doe', role: 'Manager', isOnline: true },
  { id: '3', name: 'Bob Wilson', role: 'Handler', isOnline: false },
  { id: '4', name: 'Alice Cooper', role: 'Engineer', isOnline: true },
  { id: '5', name: 'Charlie Brown', role: 'User', isOnline: true }
]

interface Asset {
  id: string | number
  name: string
  priority?: string
  status?: string
  category?: string
}

interface MockIncident {
  id: string | number
  asset_id?: string | number
  asset?: {
    id: string | number
    name: string
  }
  status: string
  impact?: string
  short_description?: string
  created_at?: string
}

interface AssetsPieData {
  name: string
  value: number
  color: string
  percentage: number
}

const AdminDashboard = () => {
  const router = useRouter()

  const [dashboardData, setDashboardData] = useState({
    assets: [] as Asset[],
    incidents: mockIncidents as MockIncident[],
    assetsLoading: false,
    incidentsLoading: false,
    assetsError: null as string | null,
    incidentsError: null as string | null,
    slaConditions: mockSLAConditions,
    activeUsers: mockActiveUsers,
    loading: false,
    error: null as string | null
  })

  const [user, setUser] = useState({
    name: '',
    team: '',
    email: '',
    userId: ''
  })

  // Load user data and assets on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login')
      return
    }

    const currentUser = getCurrentUser()
    setUser({
      name: currentUser?.name || 'Administrator',
      team: currentUser?.team || 'Administrator',
      email: currentUser?.email || '',
      userId: currentUser?.id || ''
    })

    // Load assets data
    loadAssets()
  }, [router])

  const loadAssets = async () => {
    setDashboardData(prev => ({ ...prev, assetsLoading: true, assetsError: null }))

    try {
      const response = await fetchAssets()
      const assets = response.data || []

      setDashboardData(prev => ({
        ...prev,
        assets,
        assetsLoading: false
      }))
    } catch (error: any) {
      console.error('Error loading assets:', error)
      setDashboardData(prev => ({
        ...prev,
        assetsLoading: false,
        assetsError: error.message || 'Failed to load assets'
      }))
    }
  }

  // Process incidents data for pie chart - group by assets affected
  const getAssetsPieData = (): AssetsPieData[] => {
    const { incidents, assets } = dashboardData

    if (!incidents.length) {
      return []
    }

    // Create a map of asset_id to asset_name for lookup
    const assetMap = assets.reduce((acc: any, asset) => {
      acc[asset.id] = asset.name
      return acc
    }, {})

    // Group incidents by asset_id/asset_name
    const incidentsByAsset = incidents.reduce((acc: any, incident) => {
      // Try to get asset name from incident.asset.name or lookup from assets
      let assetName: string | undefined

      // First try to get from nested asset object
      if (incident.asset && incident.asset.name) {
        assetName = incident.asset.name
      }
      // Then try to lookup using asset_id
      else if (incident.asset_id && assetMap[incident.asset_id]) {
        assetName = assetMap[incident.asset_id]
      }

      // If still no asset name, use a default
      if (!assetName) {
        assetName = 'Unknown Asset'
      }

      acc[assetName] = (acc[assetName] || 0) + 1
      return acc
    }, {})

    // Define colors like enduser dashboard - clean, consistent colors
    const assetColors: { [key: string]: string } = {
      'Rivers': '#3b82f6',                    // Blue
      'Lakes': '#ef4444',                     // Red
      'Reservoirs': '#10b981',                // Green
      'Water Treatment Plants (WTP)': '#f59e0b', // Orange
      'Chemical Feed System': '#8b5cf6',      // Purple
      'Sedimentation and Filtration Units': '#ec4899', // Pink
      'Pumping Stations': '#06b6d4',          // Cyan
      'Distribution Network': '#f59e0b',      // Orange
      'Storage Tanks': '#6b7280',             // Gray
      'Monitoring Systems': '#06b6d4',        // Cyan
      'Unknown Asset': '#6b7280'              // Gray for unknown
    }

    const totalIncidents = incidents.length
    const pieData = Object.entries(incidentsByAsset)
      .map(([assetName, count]) => ({
        name: assetName,
        value: count as number,
        color: assetColors[assetName] || `#${Math.floor(Math.random()*16777215).toString(16)}`,
        percentage: Math.round(((count as number) / totalIncidents) * 100)
      }))
      .sort((a, b) => b.value - a.value)

    return pieData
  }

  // Get pie chart configuration
  const getIncidentsByAssetChart = () => {
    const pieData = getAssetsPieData()

    if (!pieData.length) {
      return {
        series: [1],
        options: {
          chart: {
            type: 'pie' as const,
            height: 300
          },
          labels: ['No Data'],
          colors: ['#6b7280'],
          legend: {
            position: 'bottom' as const
          }
        }
      }
    }

    const series = pieData.map(item => item.value)
    const labels = pieData.map(item => item.name)
    const colors = pieData.map(item => item.color)

    const options = {
      chart: {
        type: 'pie' as const,
        height: 300
      },
      labels: labels,
      colors: colors,
      legend: {
        position: 'bottom' as const
      },
      responsive: [{
        breakpoint: 480,
        options: {
          chart: {
            width: 200
          },
          legend: {
            position: 'bottom' as const
          }
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

    return { series, options }
  }

  // Show loading state
  if (dashboardData.loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading admin dashboard...</span>
          </div>
        </div>
      </Container>
    )
  }

  // Show main admin dashboard
  return (
    <Container fluid>
      {/* Welcome Header */}
      <Row>
        <Col xs={12}>
          <Card className="mb-4 mt-4">
            <CardBody>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-1">Welcome {user.name}!</h4>
                  <p className="text-muted mb-0">Admin Dashboard - Manage your system</p>
                </div>
                {/* Quick Access Buttons */}
                <div className="d-flex gap-2">
                  <Button
                    color="primary"
                    size="sm"
                    onClick={() => router.push('/dashboard/admin/all-roles')}
                  >
                    Manage Roles
                  </Button>
                  <Button
                    color="success"
                    size="sm"
                    onClick={() => router.push('/dashboard/admin/all-users')}
                  >
                    Manage Users
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* System Stats Cards */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          <Card className="border-left-primary h-100">
            <CardBody>
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total Users
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    156
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col lg={3} md={6} className="mb-3">
          <Card className="border-left-info h-100">
            <CardBody>
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Total Assets
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {dashboardData.assetsLoading ? (
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    ) : (
                      dashboardData.assets.length
                    )}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col lg={3} md={6} className="mb-3">
          <Card className="border-left-warning h-100">
            <CardBody>
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Total Incidents
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {dashboardData.incidents.length}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col lg={3} md={6} className="mb-3">
          <Card className="border-left-success h-100">
            <CardBody>
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    SLA Conditions
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {dashboardData.slaConditions.filter(sla => sla.status === 'Active').length}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Active Users and Incidents by Asset */}
      <Row className="mb-4">
        {/* Active users */}
        <Col lg={6}>
          <Card className="h-100">
            <CardHeader className="pb-0">
              <h5>Currently Active Users</h5>
            </CardHeader>
            <CardBody>
              <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <Table hover className="table-borderless table-sm">
                  <thead className="table-light">
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.activeUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="fw-medium">{user.name}</td>
                        <td>
                          <Badge color="info" size="sm">{user.role}</Badge>
                        </td>
                        <td>
                          <Badge
                            color={user.isOnline ? 'success' : 'secondary'}
                            size="sm"
                          >
                            {user.isOnline ? 'Online' : 'Offline'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Incidents by Asset Chart */}
        <Col lg={6}>
          <Card className="h-100">
            <CardHeader className="pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5>Asset effected</h5>
                {(dashboardData.assetsLoading) && (
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardBody>
              {(dashboardData.assetsError) ? (
                <div className="text-center py-4">
                  <p className="text-danger mb-2">Error loading assets</p>
                  <small className="text-muted">
                    {dashboardData.assetsError}
                  </small>
                  <br />
                  <div className="mt-2">
                    <Button
                      color="outline-primary"
                      size="sm"
                      onClick={loadAssets}
                    >
                      Retry Assets
                    </Button>
                  </div>
                </div>
              ) : (dashboardData.assetsLoading) ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading data...</span>
                  </div>
                  <p className="mt-2 text-muted">Loading assets...</p>
                </div>
              ) : !dashboardData.incidents.length ? (
                <div className="text-center py-4">
                  <p className="text-muted mb-0">No incidents found</p>
                  <small className="text-muted">No incidents are currently recorded in the system</small>
                </div>
              ) : (
                <div style={{ minHeight: '300px' }}>
                  <Chart
                    options={getIncidentsByAssetChart().options}
                    series={getIncidentsByAssetChart().series}
                    type="pie"
                    height={300}
                    key={`incidents-by-asset-${dashboardData.incidents.length}`}
                  />
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* SLA Conditions */}
      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <h5>SLA Conditions</h5>
                <Button
                  color="outline-primary"
                  size="sm"
                  onClick={() => router.push('/dashboard/admin/sla-conditions')}
                >
                  Manage SLA
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="table-responsive">
                <Table hover className="table-borderless">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Target</th>
                      <th>Days</th>
                      <th>Hours</th>
                      <th>Minutes</th>
                      <th>Seconds</th>
                      <th>Created At</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.slaConditions.map((sla) => (
                      <tr key={sla.id}>
                        <td>
                          <span className="fw-medium text-primary">{sla.id}</span>
                        </td>
                        <td className="fw-medium">{sla.name}</td>
                        <td>
                          <Badge color="secondary">{sla.type}</Badge>
                        </td>
                        <td>{sla.target}</td>
                        <td>{sla.days}</td>
                        <td>{sla.hours}</td>
                        <td>{sla.minutes}</td>
                        <td>{sla.seconds}</td>
                        <td>{sla.createdAt}</td>
                        <td>
                          <Badge
                            color={sla.status === 'Active' ? 'success' : 'secondary'}
                          >
                            {sla.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default AdminDashboard
