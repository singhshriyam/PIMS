import { getStoredToken, getStoredUserId, getCurrentUser } from './userService';

const API_BASE_URL = 'https://apexwpc.apextechno.co.uk/api';

// Interfaces

export interface User {
  id: number;
  team_id: number;
  name: string;
  last_name: string | null;
  email: string;
  email_verified_at: string | null;
  mobile: string | null;
  address: string | null;
  postcode: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ContactType {
  id: number;
  name: string;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface Urgency {
  id: number;
  name: string;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface AssignedTo {
  id: number;
  team_id: number;
  name: string;
  last_name: string | null;
  email: string;
  email_verified_at: string | null;
  mobile: string | null;
  address: string | null;
  postcode: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface IncidentState {
  id: number;
  name: string;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface Incident {
  id: number;
  user_id: number;
  user: User;
  site_id: number | null;
  site: any | null;
  asset_id: number | null;
  asset: any | null;
  category_id: number | null;
  category: any | null;
  subcategory_id: number | null;
  subcategory: any | null;
  contact_type_id: number;
  contact_type: ContactType;
  impact_id: number | null;
  impact: any | null;
  priority_id: number | null;
  priority: any | null;
  urgency_id: number;
  urgency: Urgency;
  assigned_to_id: number;
  assigned_to: AssignedTo;
  incidentstate_id: number;
  incidentstate: IncidentState;
  incident_no: string;
  opened_at: string;
  closed_at: string | null;
  short_description: string;
  description: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  narration: string | null;
  root_cause_analysis: string | null;
  conclusion: string | null;
  created_by_id: number;
  updated_by_id: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  reported_by?: string;
}

// Transform function

export const transformIncident = (item: any): Incident => {
  const getStatus = (item: any): Incident['status'] => {
    const state = item.incidentstate?.name?.toLowerCase() || '';
    if (state === 'new') return 'pending';
    if (state === 'inprogress') return 'in_progress';
    if (state === 'resolved') return 'resolved';
    if (state === 'closed') return 'closed';
    return 'pending';
  };

  return {
    ...item, // keep all backend fields intact
    status: getStatus(item),
    reported_by: item.user?.email || 'Unknown',
  };
};



// For Handlers - CORRECT FIX
export const fetchHandlerIncidents = async (): Promise<Incident[]> => {
  const token = getStoredToken();
  const userId = getStoredUserId();

  // Send assigned_to_id in request body like in Postman
  const response = await fetch(`${API_BASE_URL}/incident-handler/incident-list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    body: JSON.stringify({ assigned_to_id: userId }) // This is what Postman sends!
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error('API failed');
  }

  // API already filtered by assigned_to_id - just transform
  return result.data.map(transformIncident);
};

// For Managers
export const fetchManagerIncidents = async (): Promise<Incident[]> => {
  const token = getStoredToken();
  const userId = getStoredUserId();

  const response = await fetch(`${API_BASE_URL}/incident-manager/incident-list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    body: JSON.stringify({ manager_id: userId })
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error('Manager API failed');
  }

  return result.data.map(transformIncident);
};

// For End Users
export const fetchEndUserIncidents = async (): Promise<Incident[]> => {
  const token = getStoredToken();
  const userId = getStoredUserId();

  const response = await fetch(`${API_BASE_URL}/end-user/incident-list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    body: JSON.stringify({ user_id: userId })
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error('End User API failed');
  }

  return result.data.map(transformIncident);
};

// For Field Engineers
export const fetchFieldEngineerIncidents = async (): Promise<Incident[]> => {
  const token = getStoredToken();
  const userId = getStoredUserId();

  const response = await fetch(`${API_BASE_URL}/field-engineer/incident-list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    body: JSON.stringify({ engineer_id: userId })
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error('Field Engineer API failed');
  }

  return result.data.map(transformIncident);
};

// For Expert Team
export const fetchExpertTeamIncidents = async (): Promise<Incident[]> => {
  const token = getStoredToken();
  const userId = getStoredUserId();

  const response = await fetch(`${API_BASE_URL}/expert-team/incident-list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    body: JSON.stringify({ expert_id: userId })
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error('Expert Team API failed');
  }

  return result.data.map(transformIncident);
};

// For Admin
export const fetchAdminIncidents = async (): Promise<Incident[]> => {
  const token = getStoredToken();
  const userId = getStoredUserId();

  const response = await fetch(`${API_BASE_URL}/incident-manager/incident-list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    body: JSON.stringify({ admin_id: userId })
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error('Admin API failed');
  }

  return result.data.map(transformIncident);
};

// Smart fetching - UPDATED
export const fetchIncidentsByUserRole = async (userRole?: string): Promise<Incident[]> => {
  const currentUser = getCurrentUser();
  const role = (userRole || currentUser?.team || '').toLowerCase();


  if (role.includes('admin')) {
    return await fetchAdminIncidents();
  }
  if (role.includes('manager')) {
    return await fetchManagerIncidents();
  }
  if (role.includes('handler')) {
    return await fetchHandlerIncidents();
  }
  if (role.includes('field') && role.includes('engineer')) {
    return await fetchFieldEngineerIncidents();
  }
  if (role.includes('expert') || role.includes('water') || role.includes('pollution')) {
    return await fetchExpertTeamIncidents();
  }

  // Default to end user
  return await fetchEndUserIncidents();
};

// For AssignIncidents - role-based incident fetching
export const fetchAllIncidentsForAssignment = async (): Promise<Incident[]> => {
  const token = getStoredToken();
  const userId = getStoredUserId();
  const currentUser = getCurrentUser();
  const userRole = currentUser?.team?.toLowerCase() || '';

  try {
    // MANAGER/ADMIN: Get ALL incidents
    if (userRole.includes('manager') || userRole.includes('admin')) {

      const response = await fetch(`${API_BASE_URL}/incident-manager/incident-list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ manager_id: userId })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data.map(transformIncident);
        }
      }
    }

    // HANDLER: Get only their assigned incidents
    else if (userRole.includes('handler')) {

      const response = await fetch(`${API_BASE_URL}/incident-handler/incident-list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ assigned_to_id: userId })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data.map(transformIncident);
        }
      }
    }

    // // Engineer: Get only their assigned incidents
    // else if (userRole.includes('engineer')) {

    //   const response = await fetch(`${API_BASE_URL}/field-engineer/incident-list`, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': `Bearer ${token}`,
    //       'Accept': 'application/json'
    //     },
    //     body: JSON.stringify({ assigned_to_id: userId })
    //   });

    //   if (response.ok) {
    //     const result = await response.json();
    //     if (result.success && result.data) {
    //       return result.data.map(transformIncident);
    //     }
    //   }
    // }

    // // Expert: Get only their assigned incidents
    // else if (userRole.includes('expert')) {

    //   const response = await fetch(`${API_BASE_URL}/expert-team/incident-list`, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': `Bearer ${token}`,
    //       'Accept': 'application/json'
    //     },
    //     body: JSON.stringify({ assigned_to_id: userId })
    //   });

    //   if (response.ok) {
    //     const result = await response.json();
    //     if (result.success && result.data) {
    //       return result.data.map(transformIncident);
    //     }
    //   }
    // }

    // If no role-specific endpoint worked, return empty
    return [];

  } catch (error: any) {
    throw new Error(`Failed to fetch incidents: ${error.message}`);
  }
};

export const fetchAllIncidents = async (): Promise<Incident[]> => {
  return await fetchManagerIncidents();
};

// Utility functions
type IncidentStatus = 'pending' | 'in_progress' | 'resolved' | 'closed';

const colors: Record<IncidentStatus, string> = {
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  resolved: '#10b981',
  closed: '#6b7280'
};

export const getStatusColor = (status: IncidentStatus): string => {
  return colors[status];
};


export const getPriorityColor = (priority: string): string => {
  const p = priority?.toLowerCase() || '';
  if (p.includes('high')) return '#ef4444';
  if (p.includes('medium')) return '#f59e0b';
  return '#10b981';
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString();
};

export const getIncidentStats = (incidents: Incident[]) => {
  const total = incidents.length;
  const inProgress = incidents.filter(i => i.status === 'in_progress').length;
  const resolved = incidents.filter(i => i.status === 'resolved').length;
  const pending = incidents.filter(i => i.status === 'pending').length;
  const closed = incidents.filter(i => i.status === 'closed').length;
  const critical = incidents.filter(i => i.priority?.toLowerCase().includes('high')).length;

  return { total, critical, inProgress, resolved, pending, closed };
};

export const createIncident = async (incidentData: any): Promise<Incident> => {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}/end-user/create-incident`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(incidentData)
  });
  const result = await response.json();
  return transformIncident(result.data || result);
};
