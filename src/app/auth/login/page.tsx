"use client";
import UserForm from "@/Components/Auth/UserForm";
import { useRouter } from "next/navigation";
import { useEffect, memo } from "react";
import { Col, Container, Row } from "reactstrap";
import { isAuthenticated, getStoredUserTeam, getUserDashboard } from "../../(MainBody)/services/userService";

const UserLogin = memo(() => {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      const userTeam = getStoredUserTeam() || 'user';
      const dashboardRoute = getUserDashboard(userTeam);
      router.replace(dashboardRoute);
    }
  }, []);

  return (
    <Container fluid className="p-0">
      <Row className="m-0">
        <Col xs={12} className="p-0">
          <div className="login-card login-dark">
            <UserForm />
          </div>
        </Col>
      </Row>
    </Container>
  );
});

UserLogin.displayName = 'UserLogin';

export default UserLogin;
