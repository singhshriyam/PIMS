'use client'
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Card, CardBody, CardHeader, Button, Badge } from 'reactstrap'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import InteractiveIncidentMap from '../../../../Components/InteractiveIncidentMap';
import RequestForm from '../../../../Components/RequestForm'

import {
  fetchAllIncidents,
  fetchEndUserIncidents,
  fetchHandlerIncidents,
  getIncidentStats,
  getStatusColor,
  getPriorityColor,
  type Incident
} from '../../services/incidentService';

import {
  getCurrentUser,
  isAuthenticated,
  getStoredToken
} from '../../services/userService';

import AllIncidents from '../../../../Components/AllIncidents';
import AssignIncidents from '../../../../Components/AssignIncidents';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

// Define API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const IncidentManagerDashboard = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const viewParam = searchParams.get('view');
  const [currentView, setCurrentView] = useState(viewParam || 'dashboard');

  const [dashboardData, setDashboardData] = useState({
    managedIncidents: [] as Incident[],
    loading: true,
    error: null as string | null
  });

  const [user, setUser] = useState({
    name: '',
    team: '',
    email: '',
    userId: ''
  });

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // State for SLA breach data
  const [slaBreachData, setSlaBreachData] = useState({
    data: [] as number[],
    labels: [] as string[],
    colors: [] as string[]
  });

  // State for handler performance data
  const [handlerPerformanceData, setHandlerPerformanceData] = useState({
    handlers: [] as string[],
    pending: [] as number[],
    breached: [] as number[],
    resolved: [] as number[]
  });

  // Safe helper functions to prevent object rendering errors
  const getIncidentNumber = (incident: Incident): string => {
    if (incident.incident_no) return incident.incident_no;
    if (typeof incident.id === 'number') return incident.id.toString();
    return 'Unknown';
  };

  const getCategoryName = (incident: Incident): string => {
    if (incident.category && typeof incident.category === 'object' && incident.category.name) {
      return incident.category.name;
    }
    return 'Uncategorized';
  };

  const getPriorityName = (incident: Incident): string => {
    if (incident.priority && typeof incident.priority === 'object' && incident.priority.name) {
      return incident.priority.name;
    }
    if (incident.urgency && typeof incident.urgency === 'object' && incident.urgency.name) {
      return incident.urgency.name;
    }
    return 'Medium';
  };

  const getStatusName = (incident: Incident): 'pending' | 'in_progress' | 'resolved' | 'closed' => {
    if (incident.status) return incident.status;
    if (incident.incidentstate && typeof incident.incidentstate === 'object' && incident.incidentstate.name) {
      const state = incident.incidentstate.name.toLowerCase();
      if (state === 'new') return 'pending';
      if (state === 'inprogress') return 'in_progress';
      if (state === 'resolved') return 'resolved';
      if (state === 'closed') return 'closed';
    }
    return 'pending';
  };

  const getAssignedToName = (incident: Incident): string => {
    if (!incident.assigned_to) return 'Unassigned';

    const firstName = incident.assigned_to.name || '';
    const lastName = incident.assigned_to.last_name || '';

    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return firstName || lastName || 'Unassigned';
  };

  const getShortDescription = (incident: Incident): string => {
    return incident.short_description || 'No description';
  };

  const getCreatedAt = (incident: Incident): string => {
    return incident.created_at || new Date().toISOString();
  };

  const getCallerName = (incident: Incident): string => {
    if (!incident.user) return 'Unknown User';

    const firstName = incident.user.name || '';
    const lastName = incident.user.last_name || '';

    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return firstName || lastName || 'Unknown User';
  };

  const getSLAStatus = (incident: Incident): string => {
    const createdTime = new Date(getCreatedAt(incident));
    const now = new Date();
    const hoursSinceCreated = (now.getTime() - createdTime.getTime()) / (1000 * 60 * 60);

    let slaLimit = 24; // default for low priority
    const priority = getPriorityName(incident).toLowerCase();
    if (priority.includes('critical')) {
      slaLimit = 4;
    } else if (priority.includes('high')) {
      slaLimit = 8;
    } else if (priority.includes('medium')) {
      slaLimit = 12;
    }

    const status = getStatusName(incident);
    if (status === 'resolved' || status === 'closed') {
      return 'Within SLA';
    }

    return hoursSinceCreated > slaLimit ? 'SLA Breached' : 'Within SLA';
  };

  // Fetch data
  const fetchData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true, error: null }));

      if (!isAuthenticated()) {
        router.replace('/auth/login');
        return;
      }

      const currentUser = getCurrentUser();
      setUser({
        name: currentUser?.name || 'Manager',
        team: currentUser?.team || 'Incident Manager',
        email: currentUser?.email || '',
        userId: currentUser?.id || ''
      });

      console.log('🔍 Manager Dashboard: Fetching incidents...');
      console.log('👤 Current user:', currentUser);

      const allIncidents = await fetchAllIncidents();

      console.log('📊 Manager Dashboard: Received incidents:', allIncidents);
      console.log('📊 Total incidents count:', allIncidents.length);

      setDashboardData({
        managedIncidents: allIncidents,
        loading: false,
        error: null
      });

      console.log('✅ Manager Dashboard data updated successfully');

    } catch (error: any) {
      console.error('❌ Manager Dashboard fetch error:', error);
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load dashboard data'
      }));
    }
  };

  // SLA Breach Distribution data for donut chart
  const getSLABreachData = async () => {
    if (dashboardData.managedIncidents.length === 0) {
      return { data: [], labels: [], colors: [] };
    }

    try {
      const token = getStoredToken();
      if (token) {
        console.log('🔍 Fetching SLA details from API endpoint...');

        const response = await fetch(`${API_BASE_URL}/incident-sla-details`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          const slaDetails = result.data || result;

          console.log('📊 SLA Details from API:', slaDetails);

          if (slaDetails && typeof slaDetails === 'object') {
            const data = [];
            const labels = [];
            const colors = ['#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4'];

            if (slaDetails.responseTime && slaDetails.responseTime > 0) {
              data.push(slaDetails.responseTime);
              labels.push('Response Time');
            }
            if (slaDetails.resolutionTime && slaDetails.resolutionTime > 0) {
              data.push(slaDetails.resolutionTime);
              labels.push('Resolution Time');
            }
            if (slaDetails.availability && slaDetails.availability > 0) {
              data.push(slaDetails.availability);
              labels.push('Availability');
            }
            if (slaDetails.quality && slaDetails.quality > 0) {
              data.push(slaDetails.quality);
              labels.push('Quality');
            }

            if (data.length === 0) {
              return {
                data: [1],
                labels: ['No SLA Breaches'],
                colors: ['#10b981']
              };
            }

            return {
              data,
              labels,
              colors: colors.slice(0, data.length)
            };
          }
        } else {
          console.warn('⚠️ SLA API endpoint not ready:', response.status);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching SLA details:', error);
    }

    // Fallback: Calculate SLA breaches from incident data
    console.log('📊 Using fallback: calculating SLA breaches from incident data');
    const breachedIncidents = dashboardData.managedIncidents.filter(incident =>
      getSLAStatus(incident) === 'SLA Breached'
    );
    const withinSLAIncidents = dashboardData.managedIncidents.filter(incident =>
      getSLAStatus(incident) === 'Within SLA'
    );

    if (breachedIncidents.length === 0 && withinSLAIncidents.length === 0) {
      return {
        data: [1],
        labels: ['No Data Available'],
        colors: ['#6b7280']
      };
    }

    return {
      data: [withinSLAIncidents.length, breachedIncidents.length],
      labels: ['Within SLA', 'SLA Breached'],
      colors: ['#10b981', '#ef4444']
    };
  };

  // Handler Performance data for bar chart
  const getHandlerPerformanceData = async () => {
    if (dashboardData.managedIncidents.length === 0) {
      return { handlers: [], pending: [], breached: [], resolved: [] };
    }

    try {
      const token = getStoredToken();
      if (token) {
        console.log('🔍 Fetching all users for handler performance chart...');

        const response = await fetch(`${API_BASE_URL}/users`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          const allUsers = result.data || result.users || result;

          console.log('📊 Total users from API:', allUsers.length);

          const handlerUsers = allUsers.filter((user: any) => {
            const userTeam = (user.team_name || user.team || '').toLowerCase();
            return userTeam.includes('handler') ||
                   userTeam.includes('field') ||
                   userTeam.includes('engineer') ||
                   userTeam.includes('expert') ||
                   userTeam.includes('water') ||
                   userTeam.includes('pollution');
          });

          console.log('📊 Found handlers from API:', handlerUsers.length);

          const handlerMap = new Map();

          handlerUsers.forEach((user: any) => {
            const firstName = user.first_name || user.name;
            const lastName = user.last_name;
            const handlerName = firstName && lastName ? `${firstName} ${lastName}` : firstName || 'Unknown';

            handlerMap.set(handlerName, {
              pending: 0,
              breached: 0,
              resolved: 0
            });
          });

          dashboardData.managedIncidents.forEach(incident => {
            let handlerName = getAssignedToName(incident);

            if (!handlerName || handlerName.trim() === '' || handlerName.toLowerCase() === 'unassigned') {
              handlerName = 'Unassigned';
            }

            if (!handlerMap.has(handlerName)) {
              handlerMap.set(handlerName, {
                pending: 0,
                breached: 0,
                resolved: 0
              });
            }

            const handlerStats = handlerMap.get(handlerName);

            const createdTime = new Date(getCreatedAt(incident));
            const now = new Date();
            const hoursSinceCreated = (now.getTime() - createdTime.getTime()) / (1000 * 60 * 60);

            let slaLimit = 24;
            const priority = getPriorityName(incident).toLowerCase();
            if (priority.includes('critical')) {
              slaLimit = 4;
            } else if (priority.includes('high')) {
              slaLimit = 8;
            } else if (priority.includes('medium')) {
              slaLimit = 12;
            }

            const isBreached = hoursSinceCreated > slaLimit && getStatusName(incident) !== 'resolved';

            const status = getStatusName(incident);
            if (status === 'resolved') {
              handlerStats.resolved++;
            } else if (isBreached) {
              handlerStats.breached++;
            } else {
              handlerStats.pending++;
            }
          });

          let handlers: string[] = [];
          let pending: number[] = [];
          let breached: number[] = [];
          let resolved: number[] = [];

          const sortedHandlers = Array.from(handlerMap.entries())
            .map(([name, stats]) => ({
              name,
              ...stats,
              total: stats.pending + stats.breached + stats.resolved
            }))
            .sort((a, b) => b.total - a.total);

          console.log('📊 Complete Handler Performance Data:', sortedHandlers);

          sortedHandlers.forEach(handler => {
            handlers.push(handler.name);
            pending.push(handler.pending);
            breached.push(handler.breached);
            resolved.push(handler.resolved);
          });

          return { handlers, pending, breached, resolved };
        }
      }
    } catch (error) {
      console.error('❌ Error fetching users for handler performance:', error);
    }

    // Fallback: Group incidents by handler using just incident data
    console.log('📊 Using fallback: grouping by incident assignments only');

    const handlerMap = new Map();

    dashboardData.managedIncidents.forEach(incident => {
      let handlerName = getAssignedToName(incident);

      if (!handlerName || handlerName.trim() === '' || handlerName.toLowerCase() === 'unassigned') {
        handlerName = 'Unassigned';
      } else {
        if (handlerName.includes('@')) {
          handlerName = handlerName.split('@')[0];
        }
      }

      if (!handlerMap.has(handlerName)) {
        handlerMap.set(handlerName, {
          pending: 0,
          breached: 0,
          resolved: 0
        });
      }

      const handlerStats = handlerMap.get(handlerName);

      const createdTime = new Date(getCreatedAt(incident));
      const now = new Date();
      const hoursSinceCreated = (now.getTime() - createdTime.getTime()) / (1000 * 60 * 60);

      let slaLimit = 24;
      const priority = getPriorityName(incident).toLowerCase();
      if (priority.includes('critical')) {
        slaLimit = 4;
      } else if (priority.includes('high')) {
        slaLimit = 8;
      } else if (priority.includes('medium')) {
        slaLimit = 12;
      }

      const isBreached = hoursSinceCreated > slaLimit && getStatusName(incident) !== 'resolved';

      const status = getStatusName(incident);
      if (status === 'resolved') {
        handlerStats.resolved++;
      } else if (isBreached) {
        handlerStats.breached++;
      } else {
        handlerStats.pending++;
      }
    });

    let handlers: string[] = [];
    let pending: number[] = [];
    let breached: number[] = [];
    let resolved: number[] = [];

    const sortedHandlers = Array.from(handlerMap.entries())
      .map(([name, stats]) => ({
        name,
        ...stats,
        total: stats.pending + stats.breached + stats.resolved
      }))
      .filter(h => h.total > 0)
      .sort((a, b) => b.total - a.total);

    console.log('📊 Fallback Handler Performance Data:', sortedHandlers);

    const minHandlers = 10;
    const actualHandlers = sortedHandlers.length;

    if (actualHandlers < minHandlers) {
      const handlerNames = [
        'Alex Chen', 'Sarah Wilson', 'Mike Johnson', 'Emily Brown',
        'David Lee', 'Lisa Garcia', 'Tom Anderson', 'Maria Rodriguez',
        'James Taylor', 'Jennifer Wang', 'Chris Miller', 'Amy Zhang',
        'Robert Davis', 'Anna Smith', 'Kevin Liu'
      ];

      sortedHandlers.forEach(handler => {
        handlers.push(handler.name);
        pending.push(handler.pending);
        breached.push(handler.breached);
        resolved.push(handler.resolved);
      });

      const placeholdersNeeded = minHandlers - actualHandlers;
      for (let i = 0; i < placeholdersNeeded; i++) {
        const placeholderName = handlerNames[actualHandlers + i] || `Handler ${actualHandlers + i + 1}`;
        handlers.push(placeholderName);
        pending.push(0);
        breached.push(0);
        resolved.push(0);
      }
    } else {
      sortedHandlers.forEach(handler => {
        handlers.push(handler.name);
        pending.push(handler.pending);
        breached.push(handler.breached);
        resolved.push(handler.resolved);
      });
    }

    return { handlers, pending, breached, resolved };
  };

  // Event handlers
  const handlePinClick = (incident: Incident) => {
    setSelectedIncident(incident);
  };

  const closeIncidentDetails = () => {
    setSelectedIncident(null);
  };

  const handleViewAllIncidents = () => {
    setCurrentView('all-incidents');
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('view', 'all-incidents');
    window.history.pushState({}, '', newUrl.toString());
  };

  const handleViewAssignIncidents = () => {
    setCurrentView('assign-incidents');
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('view', 'assign-incidents');
    window.history.pushState({}, '', newUrl.toString());
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('view');
    window.history.pushState({}, '', newUrl.toString());
  };

  const formatDateLocal = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  // Effects
  useEffect(() => {
    fetchData();
  }, [router]);

  useEffect(() => {
    const currentViewParam = searchParams.get('view');
    setCurrentView(currentViewParam || 'dashboard');
  }, [searchParams]);

  useEffect(() => {
    const fetchSLAData = async () => {
      const slaData = await getSLABreachData();
      setSlaBreachData(slaData);
    };

    if (dashboardData.managedIncidents.length > 0) {
      fetchSLAData();
    }
  }, [dashboardData.managedIncidents]);

  useEffect(() => {
    const fetchHandlerData = async () => {
      const data = await getHandlerPerformanceData();
      setHandlerPerformanceData(data);
    };

    if (dashboardData.managedIncidents.length > 0) {
      fetchHandlerData();
    }
  }, [dashboardData.managedIncidents]);

  // Calculate stats
  const stats = getIncidentStats(dashboardData.managedIncidents);

  // Render different views based on current view
  if (currentView === 'all-incidents') {
    return <AllIncidents userType="manager" onBack={handleBackToDashboard} />;
  }

  if (currentView === 'assign-incidents') {
    return <AssignIncidents userType="manager" onBack={handleBackToDashboard} />;
  }

  // Loading state
  if (dashboardData.loading) {
    return (
      <Container fluid>
        <div className="text-center py-5">
          <div className="spinner-border text-warning" role="status">
            <span className="visually-hidden">Loading manager dashboard...</span>
          </div>
        </div>
      </Container>
    );
  }

  // Error state
  if (dashboardData.error) {
    return (
      <Container fluid>
        <div className="alert alert-danger mt-3">
          <strong>Error:</strong> {dashboardData.error}
          <Button color="link" onClick={fetchData} className="p-0 ms-2">Try again</Button>
        </div>
      </Container>
    );
  }

  // Chart configurations
  const slaBreachOptions = {
    chart: { type: 'donut' as const, height: 280 },
    labels: slaBreachData.labels,
    colors: slaBreachData.colors,
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
              label: 'Breaches',
              formatter: () => {
                const total = slaBreachData.data.reduce((a, b) => a + b, 0);
                return `${total}`;
              }
            }
          }
        }
      }
    }
  };

  const barChartOptions = {
    chart: { type: 'bar' as const, height: 400 },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: {
      categories: handlerPerformanceData.handlers,
      title: {
        text: 'Handlers'
      },
      labels: {
        rotate: -45,
        style: {
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      title: { text: 'Number of Incidents' },
      min: 0
    },
    fill: { opacity: 1 },
    colors: ['#ffc107', '#ef4444', '#10b981'],
    legend: {
      position: 'top' as const,
      horizontalAlign: 'center' as const
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return val + " incidents"
        }
      }
    }
  };

  const barChartSeries = [
    { name: 'Pending', data: handlerPerformanceData.pending },
    { name: 'SLA Breached', data: handlerPerformanceData.breached },
    { name: 'Resolved', data: handlerPerformanceData.resolved }
  ];

  // Main dashboard view
  return (
    <>
      <Container fluid>
        {/* Header */}
        <Row>
          <Col xs={12}>
            <Card className="mb-4 mt-4">
              <CardBody>
                <h4 className="mb-1">Welcome back, {user.name}!</h4>
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

        {/* Analytics Row */}
        <Row className="mb-4">
          {/* SLA Breach Analysis Chart */}
          <Col lg={4}>
            <Card className="h-100">
              <CardHeader>
                <h5 className="mb-0">🚨 SLA Breach Analysis</h5>
              </CardHeader>
              <CardBody>
                {stats.total > 0 ? (
                  <Chart
                    options={slaBreachOptions}
                    series={slaBreachData.data}
                    type="donut"
                    height={280}
                  />
                ) : (
                  <div className="text-center py-5">
                    <div className="text-muted mb-3">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                    </div>
                    <p className="text-muted">No SLA breach data available</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>

          {/* Interactive Map */}
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

        {/* Handler Performance Chart */}
        <Row className="mb-4">
          <Col lg={12}>
            <Card>
              <CardHeader>
                <h5 className="mb-0">👤 Team Performance Overview</h5>
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
                    <p className="text-muted">No handler performance data available</p>
                    <small className="text-muted">Handler incident data will appear here as incidents are assigned to handlers</small>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Recent Incidents Table */}
        <Row>
          <Col lg={12}>
            <Card>
              <CardHeader>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">⏳ Recent Incidents ({dashboardData.managedIncidents.length} total)</h5>
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
                          <th>SLA Status</th>
                          <th>Assigned To</th>
                          <th>Created</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.managedIncidents.slice(0, 5).map((incident) => {
                          const slaStatus = getSLAStatus(incident);
                          return (
                            <tr key={incident.id}>
                              <td>
                                <span className="fw-medium text-primary">{getIncidentNumber(incident)}</span>
                              </td>
                              <td>
                                <div>
                                  <div className="fw-medium">{getCategoryName(incident)}</div>
                                </div>
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
                                <Badge color={slaStatus === 'Within SLA' ? 'success' : 'danger'}>
                                  {slaStatus}
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
                          );
                        })}
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
                      <Button color="primary" onClick={fetchData}>Refresh Data</Button>
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
                      <strong>Sub Category:</strong>
                      <div>{selectedIncident.subcategory?.name || 'Not specified'}</div>
                    </div>
                    <div className="mb-3">
                      <strong>Priority:</strong>
                      <div>
                        <Badge
                          style={{ backgroundColor: getPriorityColor(getPriorityName(selectedIncident)), color: 'white' }}
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
                          style={{ backgroundColor: getStatusColor(getStatusName(selectedIncident)), color: 'white' }}
                          className="fs-6"
                        >
                          {getStatusName(selectedIncident).replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="mb-3">
                      <strong>SLA Status:</strong>
                      <div>
                        <Badge color={getSLAStatus(selectedIncident) === 'Within SLA' ? 'success' : 'danger'} className="fs-6">
                          {getSLAStatus(selectedIncident)}
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
                    {getShortDescription(selectedIncident)}
                  </div>
                </div>

                {selectedIncident.description && selectedIncident.description !== getShortDescription(selectedIncident) && (
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
                      <small className="text-muted">{selectedIncident.reported_by || selectedIncident.user?.email || ''}</small>
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
                  <Button color="warning" className="me-2">Assign Handler</Button>
                  <Button color="primary" className="me-2">Edit Incident</Button>
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
