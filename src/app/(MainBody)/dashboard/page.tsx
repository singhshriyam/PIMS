"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Container, Row, Col } from "reactstrap";
import {
  isAuthenticated,
  getStoredUserTeam,
  getUserDashboard,
  getCurrentUser
} from "../services/userService";

import IncidentCreationForm from "../../../Components/Forms/IncidentCreationForm";
import AllIncidents from "../../../Components/AllIncidents";
import ResolvedIncidents from "../../../Components/ResolvedIncidents";

const DashboardContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab');
  const view = searchParams.get('view');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/auth/login");
      return;
    }

    // Get current user data
    const currentUser = getCurrentUser();
    setUser(currentUser);

    const userTeam = currentUser.team_name || "user";
    const currentPath = window.location.pathname;

    // If we have a tab parameter, handle it appropriately
    if (activeTab === 'create-incident') {
      setLoading(false);
      return;
    }

    // Handle view parameters for incidents
    if (view === 'all-incidents' || view === 'resolved-incidents') {
      setLoading(false);
      return;
    }

    // For 'all-incidents' tab (legacy), redirect to appropriate dashboard
    if (activeTab === 'all-incidents') {
      const dashboardRoute = getUserDashboard(userTeam);
      router.replace(dashboardRoute);
      return;
    }

    // If on exact '/dashboard' path, redirect to appropriate dashboard
    if (currentPath === '/dashboard') {
      const dashboardRoute = getUserDashboard(userTeam);
      router.replace(dashboardRoute);
      return;
    }

    setLoading(false);
  }, [router, activeTab, view]);

  if (loading) {
    return (
      <Container fluid className="p-0">
        <Row className="m-0">
          <Col xs={12} className="p-0">
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
              <div className="text-center">
                <div className="spinner-border text-primary" style={{ width: "3rem", height: "3rem" }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h5 className="mt-3 text-muted">Loading dashboard...</h5>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  // Show Create Incident Form if tab is active
  if (activeTab === 'create-incident') {
    const handleFormCancel = () => {
      const dashboardRoute = getUserDashboard(user?.team || "user");
      router.push(dashboardRoute);
    };

    const handleFormSuccess = () => {
      const dashboardRoute = getUserDashboard(user?.team || "user");
      router.push(dashboardRoute);
    };

    return (
      <IncidentCreationForm
        userRole={user?.team || 'user'}
        userEmail={user?.email || ''}
        userName={user?.name || ''}
        onCancel={handleFormCancel}
        onIncidentCreated={() => {}}
        onSuccess={handleFormSuccess}
        showBackButton={true}
        compactMode={false}
      />
    );
  }

  // Show Active Incidents if view is all-incidents
  if (view === 'all-incidents') {
    const handleBackToDashboard = () => {
      const dashboardRoute = getUserDashboard(user?.team || "user");
      router.push(dashboardRoute);
    };

    // Determine user type based on team
    let userType: 'enduser' | 'handler' | 'admin' | 'manager' | 'field_engineer' | 'expert_team' = 'enduser';
    const teamName = user?.team_name?.toLowerCase() || '';

    if (teamName.includes('admin')) userType = 'admin';
    else if (teamName.includes('manager')) userType = 'manager';
    else if (teamName.includes('handler')) userType = 'handler';
    else if (teamName.includes('field') || teamName.includes('engineer')) userType = 'field_engineer';
    else if (teamName.includes('expert')) userType = 'expert_team';

    return (
      <AllIncidents
        userType={userType}
        onBack={handleBackToDashboard}
      />
    );
  }

  // Show Resolved Incidents if view is resolved-incidents
  if (view === 'resolved-incidents') {
    const handleBackToDashboard = () => {
      const dashboardRoute = getUserDashboard(user?.team || "user");
      router.push(dashboardRoute);
    };

    // Determine user type based on team
    let userType: 'enduser' | 'handler' | 'admin' | 'manager' | 'field_engineer' | 'expert_team' = 'enduser';
    const teamName = user?.team_name?.toLowerCase() || '';

    if (teamName.includes('admin')) userType = 'admin';
    else if (teamName.includes('manager')) userType = 'manager';
    else if (teamName.includes('handler')) userType = 'handler';
    else if (teamName.includes('field') || teamName.includes('engineer')) userType = 'field_engineer';
    else if (teamName.includes('expert')) userType = 'expert_team';

    return (
      <ResolvedIncidents
        userType={userType}
        onBack={handleBackToDashboard}
      />
    );
  }

  // Default redirecting state
  return (
    <Container fluid className="p-0">
      <Row className="m-0">
        <Col xs={12} className="p-0">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
            <div className="text-center">
              <div className="spinner-border text-primary" style={{ width: "3rem", height: "3rem" }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <h5 className="mt-3 text-muted">Redirecting to your dashboard...</h5>
              {user && (
                <p className="text-muted mt-2">
                  User: {user.name} | Team: {user.team_name}
                </p>
              )}
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

const DashboardPage = () => {
  return (
    <Suspense fallback={
      <Container fluid className="p-0">
        <Row className="m-0">
          <Col xs={12} className="p-0">
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
              <div className="text-center">
                <div className="spinner-border text-primary" style={{ width: "3rem", height: "3rem" }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h5 className="mt-3 text-muted">Loading dashboard...</h5>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    }>
      <DashboardContent />
    </Suspense>
  );
};

export default DashboardPage;
