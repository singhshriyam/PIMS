'use client'
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Badge } from 'reactstrap'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  getIncidentStats,
  formatDate,
  getPriorityColor,
  getStatusColor,
  Incident
} from '../../services/incidentService'

import {
  getCurrentUser,
  getStoredToken,
  isAuthenticated,
  clearUserData,
  mapTeamToRole,
  User
} from '../../services/userService'

import {
  fetchCategories,
  fetchUrgencies,
  fetchImpacts,
  fetchIncidentStates
} from '../../services/masterService'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

interface SLADetails {
  incident_id: string
  sla_status: string
  response_time_sla: number
  resolution_time_sla: number
  actual_response_time: number
  actual_resolution_time: number
  sla_breach_count: number
  compliance_percentage: number
  created_at: string
  updated_at: string
}

interface SLADefinition {
  id: number
  name: string
  sla_type_id: number
  sla_target_id: number
  days: number
  hours: number
  minutes: number
  seconds: number
  created_at: string
  updated_at: string
  active: number
  cost: string
  sla_group_id: number
}

interface EnhancedIncident extends Incident {
  category_name: string
  priority_name?: string
  urgency_name?: string
  impact_name?: string
  state_name?: string
}

interface MasterData {
  categories: any[]
  urgencies: any[]
  impacts: any[]
  states: any[]
}

interface WeeklyMetrics {
  responseTimeCompliance: number
  resolutionTimeCompliance: number
  totalIncidents: number
  slaBreaches: number
}

interface MonthlyBreachStats {
  significant: number
  moderate: number
  low: number
  response: number
}

const SLAManagerDashboard = () => {
  const router = useRouter()
  const [incidents, setIncidents] = useState<EnhancedIncident[]>([])
  const [slaDetails, setSlaDetails] = useState<SLADetails[]>([])
  const [slaDefinitions, setSlaDefinitions] = useState<SLADefinition[]>([])
  const [masterData, setMasterData] = useState<MasterData>({
    categories: [],
    urgencies: [],
    impacts: [],
    states: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState({
    name: '',
    team: '',
    email: '',
    userId: ''
  })

  const isWithinLastWeek = (dateString: string): boolean => {
    const date = new Date(dateString)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    return date >= oneWeekAgo
  }

  const isWithinCurrentMonth = (dateString: string): boolean => {
    const date = new Date(dateString)
    const now = new Date()
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }

  const fetchMasterData = async (): Promise<MasterData> => {
    try {
      const [categoriesData, urgenciesData, impactsData, statesData] = await Promise.all([
        fetchCategories(),
        fetchUrgencies(),
        fetchImpacts(),
        fetchIncidentStates()
      ])

      return {
        categories: categoriesData.data || [],
        urgencies: urgenciesData.data || [],
        impacts: impactsData.data || [],
        states: statesData.data || []
      }
    } catch (error) {
      console.error('Error fetching master data:', error)
      return {
        categories: [],
        urgencies: [],
        impacts: [],
        states: []
      }
    }
  }

  const fetchIncidents = async (): Promise<Incident[]> => {
    try {
      const token = getStoredToken()

      const response = await fetch("https://apexwpc.apextechno.co.uk/api/all-incidents", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch incidents: ${response.status}`)
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Error fetching incidents:', error)
      throw error
    }
  }

  const fetchSLADefinitions = async (): Promise<SLADefinition[]> => {
    try {
      const token = getStoredToken()

      const response = await fetch("https://apexwpc.apextechno.co.uk/api/sla-definitions", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch SLA definitions: ${response.status}`)
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Error fetching SLA definitions:', error)
      return []
    }
  }

  const fetchIncidentSLADetails = async (incidentId: string): Promise<SLADetails | null> => {
    try {
      const token = getStoredToken()

      const myHeaders = new Headers()
      myHeaders.append("Authorization", `Bearer ${token}`)

      const formdata = new FormData()
      formdata.append("incident_id", incidentId)

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: formdata,
      }

      const response = await fetch("https://apexwpc.apextechno.co.uk/api/incident-sla-details", requestOptions)

      if (!response.ok) {
        console.warn(`Failed to fetch SLA details for incident ${incidentId}: ${response.status}`)
        return null
      }

      const result = await response.json()
      return result.data || null
    } catch (error) {
      console.error(`Error fetching SLA details for incident ${incidentId}:`, error)
      return null
    }
  }

  const enhanceIncidentsWithMasterData = (incidentsList: Incident[], masterData: MasterData): EnhancedIncident[] => {
    return incidentsList.map(incident => {
      const category = masterData.categories.find(c => c.id === incident.category_id)
      const urgency = masterData.urgencies.find(u => u.id === incident.urgency_id)
      const impact = masterData.impacts.find(i => i.id === incident.impact_id)
      const state = masterData.states.find(s => s.id === incident.incidentstate_id)

      return {
        ...incident,
        category_name: category?.name || 'Unknown',
        priority_name: urgency?.name || incident.priority || 'Unknown',
        urgency_name: urgency?.name || 'Unknown',
        impact_name: impact?.name || 'Unknown',
        state_name: state?.name || incident.incidentstate || 'Unknown'
      }
    })
  }

  const enhanceSLADefinitionsWithMasterData = (slaDefList: SLADefinition[], masterData: MasterData): SLADefinition[] => {
    return slaDefList
  }

  const fetchAllSLADetails = async (incidentsList: Incident[]) => {
    const slaPromises = incidentsList.map(async (incident) => {
      try {
        return await fetchIncidentSLADetails(incident.id.toString())
      } catch (error) {
        console.warn(`Failed to fetch SLA for incident ${incident.id}:`, error)
        return null
      }
    })

    const slaResults = await Promise.all(slaPromises)
    const validSLADetails = slaResults.filter(detail => detail !== null) as SLADetails[]

    setSlaDetails(validSLADetails)
    return validSLADetails
  }

  const calculateWeeklyMetrics = (incidentsList: EnhancedIncident[], slaData: SLADetails[]): WeeklyMetrics => {
    const weeklyIncidents = incidentsList.filter(incident => isWithinLastWeek(incident.created_at))

    if (weeklyIncidents.length === 0) {
      return {
        responseTimeCompliance: 0,
        resolutionTimeCompliance: 0,
        totalIncidents: 0,
        slaBreaches: 0
      }
    }

    const weeklySLAData = slaData.filter(sla =>
      weeklyIncidents.some(incident => incident.id.toString() === sla.incident_id)
    )

    const responseTimeCompliant = weeklySLAData.filter(sla =>
      sla.actual_response_time <= sla.response_time_sla
    ).length

    const resolutionTimeCompliant = weeklySLAData.filter(sla =>
      sla.actual_resolution_time <= sla.resolution_time_sla
    ).length

    const totalBreaches = weeklySLAData.reduce((sum, sla) => sum + sla.sla_breach_count, 0)

    return {
      responseTimeCompliance: weeklySLAData.length > 0 ? Math.round((responseTimeCompliant / weeklySLAData.length) * 100) : 0,
      resolutionTimeCompliance: weeklySLAData.length > 0 ? Math.round((resolutionTimeCompliant / weeklySLAData.length) * 100) : 0,
      totalIncidents: weeklyIncidents.length,
      slaBreaches: totalBreaches
    }
  }

  const calculateMonthlyBreachStats = (incidentsList: EnhancedIncident[], slaData: SLADetails[]): MonthlyBreachStats => {
    const monthlyIncidents = incidentsList.filter(incident => isWithinCurrentMonth(incident.created_at))
    const monthlySLAData = slaData.filter(sla =>
      monthlyIncidents.some(incident => incident.id.toString() === sla.incident_id)
    )

    const stats = {
      significant: 0,
      moderate: 0,
      low: 0,
      response: 0
    }

    monthlySLAData.forEach(sla => {
      const incident = monthlyIncidents.find(inc => inc.id.toString() === sla.incident_id)
      if (!incident) return

      if (sla.actual_response_time > sla.response_time_sla) {
        stats.response++
      }

      if (sla.actual_resolution_time > sla.resolution_time_sla) {
        const priorityName = incident.priority_name?.toLowerCase() || incident.priority?.toLowerCase() || ''
        if (priorityName.includes('critical') || priorityName.includes('high') || priorityName.includes('urgent')) {
          stats.significant++
        } else if (priorityName.includes('medium') || priorityName.includes('normal')) {
          stats.moderate++
        } else if (priorityName.includes('low')) {
          stats.low++
        }
      }
    })

    return stats
  }

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!isAuthenticated()) {
          router.replace('/auth/login')
          return
        }

        const currentUser = getCurrentUser()
        setUserInfo({
          name: currentUser.first_name || 'SLA Manager',
          team: currentUser.team_name || 'SLA Management',
          email: currentUser.email || '',
          userId: currentUser.id?.toString() || ''
        })

        const masterDataResult = await fetchMasterData()
        setMasterData(masterDataResult)

        const [incidentsData, slaDefinitionsData] = await Promise.all([
          fetchIncidents(),
          fetchSLADefinitions()
        ])

        const enhancedIncidents = enhanceIncidentsWithMasterData(incidentsData, masterDataResult)

        const sortedIncidents = enhancedIncidents.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        const enhancedSLADefinitions = slaDefinitionsData

        setIncidents(sortedIncidents)
        setSlaDefinitions(enhancedSLADefinitions)

        if (sortedIncidents.length > 0) {
          await fetchAllSLADetails(sortedIncidents)
        }

      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [router])

  const weeklyMetrics = calculateWeeklyMetrics(incidents, slaDetails)
  const monthlyBreachStats = calculateMonthlyBreachStats(incidents, slaDetails)

  const generateDonutChartData = () => {
    const { significant, moderate, low, response } = monthlyBreachStats
    const total = significant + moderate + low + response

    if (total === 0) {
      return {
        series: [],
        options: {}
      }
    }

    const options = {
      chart: {
        type: 'donut' as const,
        height: 350
      },
      labels: [
        'Response',
        'Resolution Significant',
        'Resolution Moderate',
        'Resolution Low'
      ],
      colors: ['#dc3545', '#fd7e14', '#ffc107', '#6f42c1'],
      legend: {
        position: 'bottom' as const
      },
      dataLabels: {
        enabled: true,
        formatter: function (val: number) {
          return Math.round(val) + '%'
        }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%'
          }
        }
      }
    }

    const series = [response, significant, moderate, low]
    return { options, series }
  }

  const chartData = generateDonutChartData()

  if (loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">Loading SLA Manager dashboard...</p>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container fluid>
        <div className="alert alert-danger mt-3">
          <strong>Error:</strong> {error}
        </div>
      </Container>
    )
  }

  return (
    <Container fluid>
      <Row>
        <Col xs={12}>
          <Card className="mb-4 mt-4">
            <CardBody>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-1">Welcome back, {userInfo.name}!</h4>
                </div>
                <div>
                  <Button color="primary" size="sm" onClick={() => window.location.reload()}>
                    Refresh
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col lg={3} md={6}>
          <Card className="mb-4">
            <CardBody>
              <div className="d-flex align-items-center">
                <div className="ms-3">
                  <h5 className="mb-1">{weeklyMetrics.responseTimeCompliance}%</h5>
                  <p className="text-muted mb-0">Response SLA</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="mb-4">
            <CardBody>
              <div className="d-flex align-items-center">
                <div className="ms-3">
                  <h5 className="mb-1">{weeklyMetrics.resolutionTimeCompliance}%</h5>
                  <p className="text-muted mb-0">Resolution SLA</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="mb-4">
            <CardBody>
              <div className="d-flex align-items-center">
                <div className="ms-3">
                  <h5 className="mb-1">{weeklyMetrics.totalIncidents}</h5>
                  <p className="text-muted mb-0">Incidents</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="mb-4">
            <CardBody>
              <div className="d-flex align-items-center">
                <div className="ms-3">
                  <h5 className="mb-1">{weeklyMetrics.slaBreaches}</h5>
                  <p className="text-muted mb-0">SLA Breaches</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col lg={5}>
          <Card>
            <CardHeader>
              <h5 className="mb-0">Monthly SLA Breaches</h5>
              <p className="text-muted mb-0 small">Current month breakdown</p>
            </CardHeader>
            <CardBody>
              {chartData.series.length > 0 ? (
                <Chart
                  options={chartData.options}
                  series={chartData.series}
                  type="donut"
                  height={300}
                />
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-check-circle text-success" style={{ fontSize: '36px' }}></i>
                  <h6 className="mt-3">No Breaches This Month</h6>
                  <p className="text-muted small">All SLAs are being met!</p>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>

        <Col lg={7}>
          <Card>
            <CardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Active SLA Definitions</h5>
                <Badge color="success">{slaDefinitions.filter(sla => sla.active === 1).length} Active</Badge>
              </div>
            </CardHeader>
            <CardBody>
              {slaDefinitions.filter(sla => sla.active === 1).length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-hover">
                    <thead>
                      <tr>
                        <th className="text-dark">Name</th>
                        <th className="text-dark">Type</th>
                        <th className="text-dark">Target</th>
                        <th className="text-dark">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slaDefinitions
                        .filter(sla => sla.active === 1)
                        .sort((a, b) => b.id - a.id)
                        .map((sla) => (
                          <tr key={sla.id}>
                            <td className="text-dark fw-medium">
                              {sla.name}
                            </td>
                            <td className="text-dark">
                              {sla.sla_type_id === 1 ? 'SLA' : sla.sla_type_id === 2 ? 'OLA' : 'Unknown'}
                            </td>
                            <td className="text-dark">
                              <small>
                                {sla.sla_target_id === 1 ? 'Response' : sla.sla_target_id === 2 ? 'Resolution' : 'Unknown'}<br/>
                                {sla.days > 0 && `${sla.days}d `}
                                {sla.hours > 0 && `${sla.hours}h `}
                                {sla.minutes > 0 && `${sla.minutes}m `}
                                {sla.seconds > 0 && `${sla.seconds}s`}
                              </small>
                            </td>
                            <td>
                              <Badge color="success" className="small">Active</Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-cog text-muted" style={{ fontSize: '36px' }}></i>
                  <h6 className="mt-3 text-dark">No SLA Definitions</h6>
                  <p className="text-muted small">No active SLA definitions found.</p>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col xs={12}>
          <Card>
            <CardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Recent Incidents & SLA Status</h5>
              </div>
            </CardHeader>
            <CardBody>
              {incidents.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover table-sm">
                    <thead>
                      <tr>
                        <th className="text-dark">ID</th>
                        <th className="text-dark">Category</th>
                        <th className="text-dark">Priority</th>
                        <th className="text-dark">Status</th>
                        <th className="text-dark">Created</th>
                        <th className="text-dark">SLA Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incidents.slice(0, 5).map((incident) => {
                        const slaData = slaDetails.find(sla => sla.incident_id === incident.id.toString())
                        const slaStatus = slaData ? slaData.sla_status : 'Unknown'

                        return (
                          <tr key={incident.id}>
                            <td><strong className="text-dark">{incident.id}</strong></td>
                            <td><p className="text-dark">{incident.category_name}</p></td>
                            <td><p className="text-dark">{incident.priority_name}</p></td>
                            <td><p className="text-dark">{incident.state_name}</p></td>
                            <td className="text-dark">{formatDate(incident.created_at)}</td>
                            <td>
                              <Badge
                                color={
                                  slaStatus === 'Within SLA' ? 'success' :
                                  slaStatus === 'Breached' ? 'danger' :
                                  'secondary'
                                }
                              >
                                {slaStatus}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-inbox text-muted" style={{ fontSize: '48px' }}></i>
                  <h5 className="mt-3 text-dark">No Incidents Found</h5>
                  <p className="text-muted">No incidents are currently available to display.</p>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default SLAManagerDashboard
