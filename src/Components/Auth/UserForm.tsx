"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Form, FormGroup, Input, Label, Alert } from "reactstrap";
import Image from "next/image";
import Link from "next/link";
import { getUserDashboard } from "../../app/(MainBody)/services/userService";

const ApexLogo = "/assets/images/logo/apex-logo.png";

const UserForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const API_BASE_URL = "https://apexwpc.apextechno.co.uk/api";

  // Clear error when user starts typing
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError("");
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please enter both email and password");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('email', email.trim());
      formData.append('password', password);

      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
        },
        body: formData
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error("Invalid response from server");
      }

      if (response.ok && data.success) {
        const token = data.token || data.data?.token || "";

        // Extract user object - API returns data in data.data or just data
        const user = data.data || data || {};

        console.log('=== DEBUG - API Response Structure ===');
        console.log('Full API response:', data);
        console.log('User object:', user);
        console.log('user.user_id:', user.user_id);
        console.log('user.name:', user.name);
        console.log('user.team:', user.team);
        console.log('user.email:', user.email);

        // Map API fields to our localStorage structure
        // API provides: user_id, name, team, email
        // We need: id, first_name, team_name, email
        const userId = user.user_id || 0;
        const firstName = user.name ? user.name.trim() : '';
        const lastName = ''; // API doesn't provide last name separately
        const teamName = user.team || '';
        const teamId = user.team_id || 0;
        const userEmail = user.email || '';
        const mobile = user.mobile || '';
        const address = user.address || '';
        const postcode = user.postcode || '';
        const createdAt = user.created_at || new Date().toISOString();

        console.log('=== DEBUG - Mapped Values ===');
        console.log('userId:', userId);
        console.log('firstName:', firstName);
        console.log('teamName:', teamName);
        console.log('userEmail:', userEmail);

        // Store in localStorage with correct mapping
        localStorage.setItem("authToken", token);
        localStorage.setItem("userId", userId.toString());
        localStorage.setItem('userFirstName', firstName);
        localStorage.setItem('userLastName', lastName);
        localStorage.setItem('userEmail', userEmail);
        localStorage.setItem('userMobile', mobile);
        localStorage.setItem('userAddress', address);
        localStorage.setItem('userPostcode', postcode);
        localStorage.setItem('userCreatedAt', createdAt);
        localStorage.setItem('userTeamId', teamId.toString());
        localStorage.setItem('userTeamName', teamName);
        localStorage.setItem('userTeam', teamName);

        console.log('=== DEBUG - Stored in localStorage ===');
        console.log('userId stored:', localStorage.getItem('userId'));
        console.log('userFirstName stored:', localStorage.getItem('userFirstName'));
        console.log('userTeamName stored:', localStorage.getItem('userTeamName'));
        console.log('userEmail stored:', localStorage.getItem('userEmail'));

        // Verify localStorage was written
        const verifyToken = localStorage.getItem("authToken");
        const verifyUserId = localStorage.getItem("userId");
        const verifyEmail = localStorage.getItem("userEmail");
        const verifyName = localStorage.getItem("userFirstName");

        if (verifyToken && verifyUserId && verifyUserId !== '0' && verifyEmail && verifyName) {
          const userTeam = teamName || "User";
          const dashboardRoute = getUserDashboard(userTeam);

          console.log('=== DEBUG - Routing ===');
          console.log('userTeam for routing:', userTeam);
          console.log('dashboardRoute calculated:', dashboardRoute);

          // Use window.location.href for hard redirect to ensure clean state
          window.location.href = dashboardRoute;
        } else {
          console.error('Verification failed:');
          console.error('verifyToken:', !!verifyToken);
          console.error('verifyUserId:', verifyUserId);
          console.error('verifyEmail:', !!verifyEmail);
          console.error('verifyName:', !!verifyName);
          throw new Error("Failed to store user data properly");
        }

      } else {
        console.error('Login failed. Response:', data);
        const errorMessage = data.message || data.error || "Login failed";
        setError(errorMessage);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setError(`Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Logo */}
      <div className="text-center mb-4">
        <Link href="/">
          <Image
            width={75}
            height={60}
            className="img-fluid"
            src={ApexLogo}
            alt="Apex Techno Login"
            priority
          />
        </Link>
      </div>

      <div className="login-main">
        <Form className="theme-form" onSubmit={handleLogin}>
          <h5 className="text-center text-muted mb-4">
            Please enter your login credentials
          </h5>

          {/* Error Alert */}
          {error && (
            <Alert color="danger" className="mb-3">
              {error}
            </Alert>
          )}

          {/* Email Field */}
          <FormGroup>
            <Label htmlFor="email">
              Email Address <span className="text-danger">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="Enter your email address"
              disabled={loading}
              autoComplete="email"
            />
          </FormGroup>

          {/* Password Field */}
          <FormGroup>
            <Label htmlFor="password">
              Password <span className="text-danger">*</span>
            </Label>
            <div className="form-input position-relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
              />
              <div
                className="show-hide"
                onClick={() => setShowPassword(!showPassword)}
                style={{ cursor: loading ? "not-allowed" : "pointer" }}
              >
                <span className="show" />
              </div>
            </div>
          </FormGroup>

          {/* Remember Me and Forgot Password */}
          <div className="form-group mb-0">
            <div className="checkbox p-0">
              <Input id="checkbox1" type="checkbox" disabled={loading} />
              <Label className="text-muted" htmlFor="checkbox1">
                Remember Password
              </Label>
            </div>
            <Link className="link" href="/auth/forgot-password">
              Forgot Password?
            </Link>

            {/* Submit Button */}
            <div className="text-end mt-3">
              <Button
                type="submit"
                color="primary"
                block
                disabled={loading || !email || !password}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </div>
          </div>

          {/* Register Link */}
          <p className="mt-4 mb-0 text-center">
            Don't have account?
            <Link className="ms-2" href="/auth/register">
              Create Account
            </Link>
          </p>
        </Form>
      </div>
    </div>
  );
};

export default UserForm;
