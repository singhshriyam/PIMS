const API_BASE = 'https://apexwpc.apextechno.co.uk/api';

// Helper function to get authentication headers
const getAuthHeaders = () => {
  const authToken = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': authToken ? `Bearer ${authToken}` : '',
    'X-Requested-With': 'XMLHttpRequest'
  };
};

// Generic API call function with better error handling
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    },
    credentials: 'include'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
  }

  const data = await response.json();

  // Handle the API response format: { "success": true, "data": [...], "message": "..." }
  if (data.success && data.data !== undefined) {
    return { data: data.data };
  } else if (data.success === false) {
    throw new Error(data.message || 'API request failed');
  } else {
    // Handle cases where API doesn't follow the standard format
    return { data: data };
  }
};

// Users
export async function fetchUsers() {
  return await apiCall('/users');
}

// Roles
export async function fetchRoles() {
  return await apiCall('/roles');
}

// Categories
export async function fetchCategories() {
  return await apiCall('/master/categories');
}

// Subcategories
export async function fetchSubcategories(categoryId?: string) {
  let endpoint;
  if (categoryId) {
    endpoint = `/master/sub-categories?category_id=${categoryId}`;
  } else {
    endpoint = '/master/sub-categories';
  }

  try {
    const result = await apiCall(endpoint);
    return result;
  } catch (error) {
    throw error;
  }
}

// Contact Types
export async function fetchContactTypes() {
  return await apiCall('/master/contact-types');
}

// Impacts
export async function fetchImpacts() {
  return await apiCall('/master/impacts');
}

// Urgencies
export async function fetchUrgencies() {
  return await apiCall('/master/urgencies');
}

// Incident States
export async function fetchIncidentStates() {
  return await apiCall('/master/incident-states');
}

// Assets
export async function fetchAssets() {
  return await apiCall('/master/assets');
}

// Sites
export async function fetchSites() {
  const authToken = localStorage.getItem('authToken');
  if (!authToken) {
    throw new Error('Authentication required for sites. Please log in again.');
  }

  try {
    const result = await apiCall('/master/sites');
    return result;
  } catch (error: any) {
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      throw new Error('Authentication failed for sites. Please refresh and log in again.');
    }

    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      throw new Error('Access denied for sites. Contact your administrator for permissions.');
    }

    throw error;
  }
}

// Action Types
export async function fetchActionTypes() {
  return await apiCall('/master/action-types');
}

// Action Statuses
export async function fetchActionStatuses() {
  return await apiCall('/master/action-statuses');
}

// Action Priorities
export async function fetchActionPriorities() {
  return await apiCall('/master/action-priorities');
}

// Test authentication
export async function testAuth() {
  try {
    const response = await fetch(`${API_BASE}/test-auth`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

// Helper function to refresh auth token if needed
export async function refreshAuthIfNeeded() {
  const authToken = localStorage.getItem('authToken');

  if (!authToken) {
    return false;
  }

  const isValid = await testAuth();

  if (!isValid) {
    return false;
  }

  return true;
}
