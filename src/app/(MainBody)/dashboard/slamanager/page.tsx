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
} from '../../services/incidentService';

import {
  getCurrentUser,
  isAuthenticated,
  clearUserData,
  mapTeamToRole
} from '../../services/userService';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

const SLAManagerDashboard = () => {
  const router = useRouter();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState({
    name: '',
    team: '',
    email: '',
    userId: ''
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check authentication
        if (!isAuthenticated()) {
          router.replace('/auth/login');
          return;
        }

        // Get current user
        const currentUser = getCurrentUser();
        setUserInfo({
          name: currentUser.name || 'SLA Manager',
          team: currentUser.team || 'SLA Management',
          email: currentUser.email || '',
          userId: currentUser.id || ''
        });

        // For now, we'll use mock data - you can replace with actual API calls
        // const userRole = mapTeamToRole(currentUser.team || 'sla manager');
        // const incidentsData = await fetchIncidentsAPI(currentUser.email, userRole);
        // setIncidents(incidentsData);

      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [router]);

  const stats = getIncidentStats(incidents);

  // SLA Performance Metrics
  const slaMetrics = {
    responseTimeCompliance: 94.2,
    resolutionTimeCompliance: 89.7,
    availabilityTarget: 99.9,
    currentAvailability: 99.6,
    criticalIncidentsThisMonth: 3,
    slaBreaches: 7,
    customerSatisfaction: 4.2,
    totalSLAs: 24
  };

  // SLA Performance Chart
  const slaPerformanceOptions = {
    chart: {
      type: 'line' as const,
      height: 300
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth' as const
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Nov', 'Dec'],
    },
    yaxis: {
      title: {
        text: 'Compliance %'
      },
      min: 80,
      max: 100
    },
    colors: ['#10b981', '#3b82f6', '#f59e0b']
  };

  const slaPerformanceSeries = [{
    name: 'Response Time SLA',
    data: [92, 89, 94, 91, 96, 94]
  }, {
    name: 'Resolution Time SLA',
    data: [88, 85, 90, 87, 92, 90]
  }, {
    name: 'Availability SLA',
    data: [99.5, 99.2, 99.7, 99.4, 99.8, 99.6]
  }];

  // SLA Breach Distribution
  const slaBreachOptions = {
    chart: {
      type: 'donut' as const,
      height: 300
    },
    labels: ['Response Time', 'Resolution Time', 'Availability', 'Quality'],
    colors: ['#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4'],
    legend: {
      position: 'bottom' as const
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return Math.round(val) + '%'
      }
    }
  };

  const slaBreachSeries = [45, 30, 15, 10];

  // const handleManageSLADefinitions = () => {
  //   router.push('/dashboard/slamanager/sla-definitions');
  // };

  // const handleManageSLAConditions = () => {
  //   router.push('/dashboard/slamanager/sla-conditions');
  // };

  // const handleManageSLANotifications = () => {
  //   router.push('/dashboard/slamanager/sla-notifications');
  // };

  // Calculate SLA status for incidents
  const getSLAStatus = (incident: Incident) => {
    const createdTime = new Date(incident.created_at);
    const now = new Date();
    const hoursSinceCreated = (now.getTime() - createdTime.getTime()) / (1000 * 60 * 60);

    if (incident.priority?.toLowerCase().includes('critical')) {
      return hoursSinceCreated > 4 ? 'Breached' : 'Within SLA';
    } else if (incident.priority?.toLowerCase().includes('high')) {
      return hoursSinceCreated > 8 ? 'Breached' : 'Within SLA';
    } else {
      return hoursSinceCreated > 24 ? 'Breached' : 'Within SLA';
    }
  };

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
    );
  }

  if (error) {
    return (
      <Container fluid>
        <div className="alert alert-danger mt-3">
          <strong>Error:</strong> {error}
        </div>
      </Container>
    );
  }

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
                    <h4 className="mb-1">Welcome back, {userInfo.name}!</h4>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* SLA Overview Cards */}
        <Row>
          <Col lg={3} md={6}>
            <Card className="mb-4">
              <CardBody>
                <div className="d-flex align-items-center">
                  <div className="ms-3">
                    <h5 className="mb-1">{slaMetrics.responseTimeCompliance}%</h5>
                    <p className="text-muted mb-0">Response</p>
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
                    <h5 className="mb-1">{slaMetrics.resolutionTimeCompliance}%</h5>
                    <p className="text-muted mb-0">Resolution</p>
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
                    <h5 className="mb-1">{slaMetrics.slaBreaches}</h5>
                    <p className="text-muted mb-0">SLA Breaches</p>
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
                    <h5 className="mb-1">{slaMetrics.totalSLAs}</h5>
                    <p className="text-muted mb-0">Total SLAs</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        <Row>
          {/* SLA Performance Trends */}
          <Col lg={8}>
            <Card>
              <CardHeader className="pb-0">
                <h5>📈 SLA Performance Trends</h5>
              </CardHeader>
              <CardBody>
                <Chart
                  options={slaPerformanceOptions}
                  series={slaPerformanceSeries}
                  type="line"
                  height={300}
                />
              </CardBody>
            </Card>
          </Col>

          {/* SLA Breach Distribution */}
          <Col lg={4}>
            <Card>
              <CardHeader className="pb-0">
                <h5>🚨 SLA Breach Analysis</h5>
              </CardHeader>
              <CardBody>
                <Chart
                  options={slaBreachOptions}
                  series={slaBreachSeries}
                  type="donut"
                  height={300}
                />
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default SLAManagerDashboard
