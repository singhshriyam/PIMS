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
  if (teamLower.includes('developer')) return 'DEVELOPER';
  if (teamLower.includes('sla')) return 'SLA_MANAGER';

  return 'USER';
};

// Get appropriate dashboard route based on team
export const getUserDashboard = (team: string): string => {
  const teamLower = team.toLowerCase().trim();

  if (teamLower.includes('admin')) return '/dashboard/admin';
  if (teamLower.includes('incident') && teamLower.includes('manager')) return '/dashboard/incident_manager';
  if (teamLower.includes('incident') && teamLower.includes('handler')) return '/dashboard/incident_handler';
  if (teamLower.includes('developer')) return '/dashboard/developer';
  if (teamLower.includes('sla')) return '/dashboard/developer';

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
    case 'incident_handeller':
      return incidents.filter(incident => incident.assignedToEmail === userEmail);

    case 'administrator':
    case 'incident_manager':
    case 'sla_manager':
      return incidents;

    default:
      return incidents.filter(incident => incident.reportedBy === userEmail);
  }
};

// Test API connection
export const testAPIConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const token = getStoredToken();

    if (!token) {
      return { success: false, message: 'No authentication token found' };
    }

    const userId = getStoredUserId();
    const formData = new FormData();
    formData.append('user_id', userId || '13');

    const response = await fetch('https://apexwpc.apextechno.co.uk/api/end-user/incident-list', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (response.ok) {
      return { success: true, message: 'API connection successful' };
    } else {
      return { success: false, message: `API returned status: ${response.status}` };
    }
  } catch (error: any) {
    return { success: false, message: `Connection failed: ${error.message}` };
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

// Placeholder functions for admin dashboard (add these if needed)
export const fetchAllUsers = async () => {
  // TODO: Implement user fetching from your API
  return [];
};

export const getUserStats = () => {
  // TODO: Implement user statistics
  return { total: 0, active: 0, inactive: 0 };
};
