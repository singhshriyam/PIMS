export interface User {
  id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  mobile: string | null;
  address: string | null;
  postcode: string | null;
  created_at: string;
  team_id: number;
  team_name: string;
}

// Helper to parse numbers safely
const parseNumber = (val: string | null, fallback = 0): number =>
  val !== null && !isNaN(Number(val)) ? Number(val) : fallback;

// Get stored authentication token
export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
};

// Get stored user ID directly from localStorage
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
  const userEmail = getStoredUserEmail();
  return !!(token && userId && userEmail);
};

// Map team name to role for API calls
export const mapTeamToRole = (team: string): string => {
  const teamLower = team.toLowerCase().trim();

  if (teamLower.includes('admin')) return 'ADMINISTRATOR';
  if (teamLower.includes('incident') && teamLower.includes('manager')) return 'INCIDENT_MANAGER';
  if (teamLower.includes('incident') && teamLower.includes('handler')) return 'INCIDENT_HANDLER';
  if (teamLower.includes('field') && teamLower.includes('engineer')) return 'FIELD_ENGINEER';
  if (teamLower.includes('expert') && teamLower.includes('team')) return 'EXPERT_TEAM';
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
  localStorage.removeItem('userID');
  localStorage.removeItem('userFirstName');
  localStorage.removeItem('userLastName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userMobile');
  localStorage.removeItem('userAddress');
  localStorage.removeItem('userPostcode');
  localStorage.removeItem('userCreatedAt');
  localStorage.removeItem('userTeamId');
  localStorage.removeItem('userTeamName');
  localStorage.removeItem('userTeam');
  localStorage.removeItem('userName');
};

// Filter incidents based on user role
export const filterIncidentsByRole = (incidents: any[], userId: string, userTeam: string): any[] => {
  const team = userTeam.toLowerCase().replace(/\s+/g, '_');
  const userIdNum = parseInt(userId);

  switch (team) {
    case 'user':
      return incidents.filter(incident => incident.user_id === userIdNum);

    case 'incident_handler':
    case 'field_engineer':
    case 'expert_team':
      return incidents.filter(incident => incident.assigned_to_id === userIdNum);

    case 'administrator':
    case 'incident_manager':
    case 'sla_manager':
      return incidents;

    default:
      return incidents.filter(incident => incident.user_id === userIdNum);
  }
};

// getCurrentUser that NEVER returns null - always returns a valid User object
export const getCurrentUser = (): User => {
  if (typeof window === 'undefined') {
    return {
      id: 0,
      first_name: '',
      last_name: null,
      email: '',
      mobile: null,
      address: null,
      postcode: null,
      created_at: new Date().toISOString(),
      team_id: 0,
      team_name: '',
    };
  }

  return {
    id: parseNumber(localStorage.getItem('userId')),
    first_name: localStorage.getItem('userFirstName') || '',
    last_name: localStorage.getItem('userLastName') || null,
    email: localStorage.getItem('userEmail') || '',
    mobile: localStorage.getItem('userMobile') || null,
    address: localStorage.getItem('userAddress') || null,
    postcode: localStorage.getItem('userPostcode') || null,
    created_at: localStorage.getItem('userCreatedAt') || new Date().toISOString(),
    team_id: parseNumber(localStorage.getItem('userTeamId')),
    team_name: localStorage.getItem('userTeamName') || '',
  };
};

const API_BASE = 'https://apexwpc.apextechno.co.uk/api';

// Helper function to get authentication headers
const getAuthHeaders = () => {
  const authToken = getStoredToken();
  return {
    'Accept': 'application/json',
    'Authorization': authToken ? `Bearer ${authToken}` : '',
  };
};

// Fetch all users from API
export const fetchUsers = async (): Promise<{ data: User[] }> => {
  try {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status}`);
    }

    const result = await response.json();

    // Handle your API response format
    if (result.success && result.data) {
      return { data: result.data };
    } else {
      throw new Error(result.message || 'Failed to fetch users');
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

// Create lookup map for user ID to name conversion
export const createUserLookup = (users: User[]): Record<string, string> => {
  if (!Array.isArray(users)) {
    console.warn('createUserLookup: users is not an array', users);
    return {};
  }

  const lookup: Record<string, string> = {};

  users.forEach(user => {
    if (user && user.id) {
      const displayName = user.last_name
        ? `${user.first_name} ${user.last_name}`.trim()
        : user.first_name.trim();
      lookup[user.id.toString()] = displayName || `User ${user.id}`;
    }
  });

  return lookup;
};

// Get user name by ID with safe fallback
export const getUserName = (userId: string | number, userLookup?: Record<string, string>): string => {
  if (!userId) return 'Unknown User';

  try {
    const userIdStr = userId.toString();

    // Check if userLookup exists and has the user
    if (userLookup && typeof userLookup === 'object' && userLookup[userIdStr]) {
      return userLookup[userIdStr];
    }

    // Fallback to User ID format
    return `User ${userIdStr}`;
  } catch (error) {
    console.error('Error in getUserName:', error);
    return `User ${userId}`;
  }
};
