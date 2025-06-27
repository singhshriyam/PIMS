// services/userService.ts

// Get stored authentication token
export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
};

// Get stored user ID
export const getStoredUserId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userId');
};

// Get stored user name
export const getStoredUserName = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userName');
};

// Get stored user email
export const getStoredUserEmail = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userEmail');
};

// Get stored user team
export const getStoredUserTeam = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userTeam');
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  const token = getStoredToken();
  const userId = getStoredUserId();
  return !!(token && userId);
};

// Map team name to role for API calls
export const mapTeamToRole = (team: string): string => {
  const teamLower = team.toLowerCase().trim();

  if (teamLower.includes('admin')) return 'ADMINISTRATOR';
  if (teamLower.includes('incident') && teamLower.includes('manager')) return 'INCIDENT_MANAGER';
  if (teamLower.includes('incident') && teamLower.includes('handler')) return 'INCIDENT_HANDLER';
  if (teamLower.includes('field') && teamLower.includes('engineer')) return 'FIELD_ENGINEER';
  if (teamLower.includes('expert') && teamLower.includes('team')) return 'expert_team';
  if (teamLower.includes('sla') && teamLower.includes('manager')) return 'SLA_MANAGER';

  return 'USER';
};

// Get appropriate dashboard route based on team
export const getUserDashboard = (team: string): string => {
  const teamLower = team.toLowerCase().trim();

  if (teamLower.includes('admin')) return '/dashboard/admin';
  if (teamLower.includes('incident') && teamLower.includes('manager')) return '/dashboard/incident_manager';
  if (teamLower.includes('incident') && teamLower.includes('handler')) return '/dashboard/incident_handler';
  if (teamLower.includes('field') && teamLower.includes('engineer')) return '/dashboard/field_engineer';
  if (teamLower.includes('expert') && teamLower.includes('team')) return '/dashboard/expert_team';
  if (teamLower.includes('sla') && teamLower.includes('manager')) return '/dashboard/slamanager';

  return '/dashboard/enduser';
};

// Clear all user data (for logout)
export const clearUserData = (): void => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('authToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userTeam');
};

// Filter incidents based on user role
export const filterIncidentsByRole = (incidents: any[], userEmail: string, userTeam: string): any[] => {
  const team = userTeam.toLowerCase().replace(/\s+/g, '_');

  switch (team) {
    case 'user':
      return incidents.filter(incident => incident.reportedBy === userEmail);

    case 'incident_handler':
      return incidents.filter(incident => incident.assignedToEmail === userEmail);

    case 'field_engineer':
      return incidents.filter(incident => incident.assignedToEmail === userEmail);

    case 'expert_team':
      return incidents.filter(incident => incident.assignedToEmail === userEmail);

    case 'administrator':
    case 'incident_manager':
    case 'sla_manager':
      return incidents;

    default:
      return incidents.filter(incident => incident.reportedBy === userEmail);
  }
};

// Get current user info from localStorage
export const getCurrentUser = () => {
  return {
    id: getStoredUserId(),
    name: getStoredUserName(),
    email: getStoredUserEmail(),
    team: getStoredUserTeam(),
    isAuthenticated: isAuthenticated()
  };
};

