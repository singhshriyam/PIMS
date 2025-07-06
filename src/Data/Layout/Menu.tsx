// Data/Layout/Menu.tsx - Complete Fixed Version with Field Engineer
import { MenuItem } from "@/Types/Layout.type";
import { useState, useEffect } from 'react';
import { getStoredUserTeam, mapTeamToRole, isAuthenticated } from "../../app/(MainBody)/services/userService";

// User role type definition - UPDATED to include Field Engineer
export type UserRole = 'ADMINISTRATOR' | 'INCIDENT_MANAGER' | 'INCIDENT_HANDLER' | 'FIELD_ENGINEER' | 'EXPERT_TEAM' | 'USER' | 'SLA_MANAGER';

export interface User {
  id?: string;
  email?: string;
  name?: string;
  team?: string;
}

// Enhanced useUserRole hook with localStorage
export const useUserRole = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>('USER');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const determineUserRole = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!isAuthenticated()) {
          setCurrentRole('USER');
          setIsLoading(false);
          return;
        }

        const storedTeam = getStoredUserTeam();
        const mappedRole = storedTeam ? mapTeamToRole(storedTeam) : 'USER';
        setCurrentRole(mappedRole as UserRole);
        setIsLoading(false);
      } catch (error: any) {
        setError(error.message || 'Failed to determine user role');
        setCurrentRole('USER');
        setIsLoading(false);
      }
    };

    determineUserRole();
  }, []);

  return {
    currentRole,
    isLoading,
    isAuthenticated: isAuthenticated(),
    error,
    getUserInfo: () => {
      if (isAuthenticated()) {
        return {
          id: localStorage.getItem('userId'),
          email: localStorage.getItem('userEmail'),
          name: localStorage.getItem('userName'),
          team: localStorage.getItem('userTeam')
        };
      }
      return null;
    },
    getTeamName: () => getStoredUserTeam() || 'Unknown Team'
  };
};

// Role utilities with comprehensive permission system - UPDATED
export const RoleUtils = {
  getDefaultDashboard: (role: UserRole): string => {
    const dashboardMap: Record<UserRole, string> = {
      'ADMINISTRATOR': '/dashboard/admin',
      'INCIDENT_MANAGER': '/dashboard/incident_manager',
      'INCIDENT_HANDLER': '/dashboard/incident_handler',
      'FIELD_ENGINEER': '/dashboard/field_engineer',
      'EXPERT_TEAM': '/dashboard/expert_team',
      'SLA_MANAGER': '/dashboard/slamanager',
      'USER': '/dashboard/enduser'
    };
    return dashboardMap[role] || '/dashboard/enduser';
  },

  canAccessAdmin: (role: UserRole): boolean => role === 'ADMINISTRATOR',
  canManageUsers: (role: UserRole): boolean => role === 'ADMINISTRATOR',
  canManageIncidents: (role: UserRole): boolean => ['ADMINISTRATOR', 'INCIDENT_MANAGER'].includes(role),
  canHandleIncidents: (role: UserRole): boolean => ['ADMINISTRATOR', 'INCIDENT_MANAGER', 'INCIDENT_HANDLER', 'FIELD_ENGINEER', 'expert_team'].includes(role),
  canViewAllIncidents: (role: UserRole): boolean => ['ADMINISTRATOR', 'INCIDENT_MANAGER', 'SLA_MANAGER'].includes(role),
  canCreateIncidents: (role: UserRole): boolean => true,
  canManageSLA: (role: UserRole): boolean => ['ADMINISTRATOR', 'INCIDENT_MANAGER', 'SLA_MANAGER'].includes(role),
  canViewReports: (role: UserRole): boolean => ['ADMINISTRATOR', 'INCIDENT_MANAGER', 'SLA_MANAGER'].includes(role),

  getRoleDisplayName: (role: UserRole): string => {
    const displayNames: Record<UserRole, string> = {
      'ADMINISTRATOR': 'Administrator',
      'INCIDENT_MANAGER': 'Incident Manager',
      'INCIDENT_HANDLER': 'Incident Handler',
      'FIELD_ENGINEER': 'Field Engineer',
      'EXPERT_TEAM': 'Water Pollution Expert',
      'SLA_MANAGER': 'SLA Manager',
      'USER': 'End User'
    };
    return displayNames[role] || 'User';
  }
};

// Helper functions to create menu items with proper typing
const createMenuItem = (title: string, path: string, icon?: string): MenuItem => ({
  title,
  path,
  icon,
  type: "link"
});

const createMenuSection = (title: string, items: MenuItem[]): MenuItem => ({
  title,
  Items: items,
  type: "section"
});

// AdminMenuList section for Menu.tsx
const AdminMenuList: MenuItem[] = [
  createMenuSection("Dashboard", [
    createMenuItem("Admin", "/dashboard/admin")
  ]),
  createMenuSection("User Management", [
    {
      title: "Groups",
      type: "submenu",
      children: [
        createMenuItem("All Groups", "/dashboard/admin/all-groups"),
        createMenuItem("Create Group", "/dashboard/admin/create-group")
      ]
    },
    {
      title: "Roles",
      type: "submenu",
      children: [
        createMenuItem("All Roles", "/dashboard/admin/all-roles"),
        createMenuItem("Create Role", "/dashboard/admin/create-role")
      ]
    },
    {
      title: "Users",
      type: "submenu",
      children: [
        createMenuItem("All Users", "/dashboard/admin/all-users")
      ]
    },
    {
      title: "Permissions",
      type: "submenu",
      children: [
        createMenuItem("All Permissions", "/dashboard/admin/all-permissions"),
        createMenuItem("Create Permission", "/dashboard/admin/create-permission")
      ]
    }
  ]),
  createMenuSection("Incident Management", [
    {
      title: "Incident Staff",
      type: "submenu",
      children: [
        createMenuItem("Manager Registration", "/dashboard/admin/create-manager"),
        createMenuItem("Handler Registration", "/dashboard/admin/create-handler")
      ]
    }
  ]),
  createMenuSection("Master Settings", [
    {
      title: "Incident Settings",
      type: "submenu",
      children: [
        createMenuItem("Categories", "/dashboard/admin/categories"),
        createMenuItem("Sub-Categories", "/dashboard/admin/subcategories"),
        createMenuItem("Contact Types", "/dashboard/admin/contact-types"),
        createMenuItem("Incident States", "/dashboard/admin/states"),
        createMenuItem("Impact Levels", "/dashboard/admin/impacts"),
        createMenuItem("Urgency Levels", "/dashboard/admin/urgencies")
      ]
    }
  ]),
  createMenuSection("Asset Management", [
    {
      title: "Assets",
      type: "submenu",
      children: [
        createMenuItem("All Assets", "/dashboard/admin/all-assets"),
        createMenuItem("Asset States", "/dashboard/admin/asset-states"),
        createMenuItem("Asset Sub States", "/dashboard/admin/asset-substates"),
        createMenuItem("Asset Functions", "/dashboard/admin/asset-functions"),
        createMenuItem("Asset Locations", "/dashboard/admin/asset-locations")
      ]
    }
  ]),
  createMenuSection("Organization", [
    {
      title: "Structure",
      type: "submenu",
      children: [
        createMenuItem("Departments", "/dashboard/admin/departments"),
        createMenuItem("Companies", "/dashboard/admin/companies")
      ]
    },
    {
      title: "Inventory",
      type: "submenu",
      children: [
        createMenuItem("Stock Rooms", "/dashboard/admin/stock-rooms"),
        createMenuItem("Aisles", "/dashboard/admin/aisles")
      ]
    }
  ]),
  createMenuSection("Site Management", [
    {
      title: "Sites",
      type: "submenu",
      children: [
        createMenuItem("All Sites", "/dashboard/admin/all-sites"),
        createMenuItem("Site Types", "/dashboard/admin/site-types")
      ]
    }
  ]),
  createMenuSection("SLA Management", [
    {
      title: "SLA Configuration",
      type: "submenu",
      children: [
        createMenuItem("SLA Definitions", "/dashboard/admin/sla-definitions"),
        createMenuItem("SLA Conditions", "/dashboard/admin/sla-conditions")
      ]
    }
  ])
];

const IncidentManagerMenuList: MenuItem[] = [
  createMenuSection("Dashboard", [
    createMenuItem("Manager", "/dashboard/incident_manager")
  ]),
  createMenuSection("Incident Management", [
    createMenuItem("All Incidents", "/dashboard/incident_manager?view=all-incidents"),
    createMenuItem("Create Incident", "/dashboard?tab=create-incident"),
    createMenuItem("Assign Incidents", "/dashboard/incident_manager?view=assign-incidents"),
    createMenuItem("Pending EA approvals", "/dashboard?tab=pending-approval")
  ]),
  createMenuSection("Requests", [
    createMenuItem("Submit Request", "/dashboard/incident_manager?view=request-form"),
    createMenuItem("My Requests", "/dashboard/incident_manager?view=request-status")
  ]),
  // createMenuSection("SLA Management", [
  //   createMenuItem("Activate SLA", "/dashboard?tab=sla-define"),
  //   createMenuItem("SLA Reports", "/dashboard?tab=sla-report")
  // ])
];

const IncidentHandlerMenuList: MenuItem[] = [
  createMenuSection("Dashboard", [
    createMenuItem("Handler", "/dashboard/incident_handler", "dashboard")
  ]),
  createMenuSection("My Tasks", [
    createMenuItem("My Incidents", "/dashboard/incident_handler?view=all-incidents", "list"),
    createMenuItem("Create Incident", "/dashboard?tab=create-incident", "plus-circle"),
    createMenuItem("Assign to Others", "/dashboard/incident_handler?view=assign-incidents", "user-check")
  ]),
  createMenuSection("Requests", [
    createMenuItem("Submit Request", "/dashboard/incident_manager?view=request-form"),
    createMenuItem("My Requests", "/dashboard/incident_manager?view=request-status")
  ])
];

//Field Engineer Menu
const FieldEngineerMenuList: MenuItem[] = [
  createMenuSection("Dashboard", [
    createMenuItem("Field Engineer", "/dashboard/field_engineer"),
    createMenuItem("Assign Incidents", "/dashboard/field_engineer?view=assign-incidents")

  ])
];

//Expert Menu
const ExpertTeamMenuList: MenuItem[] = [
  createMenuSection("Dashboard", [
    createMenuItem("Expert Team", "/dashboard/expert_team")
  ]),
  createMenuSection("My Tasks", [
    createMenuItem("My Incidents", "/dashboard/expert_team?view=all-incidents"),
    createMenuItem("Create Incident", "/dashboard?tab=create-incident"),
    createMenuItem("Assign to Others", "/dashboard/expert_team?view=assign-incidents")
  ]),
  createMenuSection("Requests", [
    createMenuItem("Submit Request", "/dashboard/incident_manager?view=request-form"),
    createMenuItem("My Requests", "/dashboard/incident_manager?view=request-status")
  ])
];

const SLAManagerMenuList: MenuItem[] = [
  createMenuSection("Dashboard", [
    createMenuItem("SLA Manager", "/dashboard/slamanager")
  ]),
  createMenuSection("SLA Management", [
    createMenuItem("SLA Definitions", "/dashboard/slamanager/sla-definitions"),
    createMenuItem("SLA Conditions", "/dashboard/slamanager/sla-conditions"),
    createMenuItem("SLA Groups", "/dashboard/slamanager/sla-groups"),
    createMenuItem("SLA Notifications", "/dashboard/slamanager/sla-notifications")
  ]),
  // createMenuSection("Requests", [
  //   createMenuItem("Submit Request", "/dashboard/incident_manager?view=request-form"),
  //   createMenuItem("My Requests", "/dashboard/incident_manager?view=request-status")
  // ])
];

const EndUserMenuList: MenuItem[] = [
  createMenuSection("Dashboard", [
    createMenuItem("My Dashboard", "/dashboard/enduser")
  ]),
  createMenuSection("Incidents", [
    createMenuItem("Create Incident", "/dashboard?tab=create-incident"),
    createMenuItem("All Incidents", "/dashboard/enduser?view=all-incidents")
  ]),
  createMenuSection("Support", [
    createMenuItem("Help Center", "/dashboard?view=help"),
    createMenuItem("Contact Support", "/dashboard?view=support")
  ])
];

const GuestMenuList: MenuItem[] = [
  createMenuSection("Authentication", [
    createMenuItem("Login", "/auth/login", "log-in"),
    createMenuItem("Register", "/auth/register", "user-plus")
  ])
];

// Main functions - UPDATED to include new roles
export const getMenuByRole = (userRole: UserRole): MenuItem[] => {
  const menuMap: Record<UserRole, MenuItem[]> = {
    'ADMINISTRATOR': AdminMenuList,
    'INCIDENT_MANAGER': IncidentManagerMenuList,
    'INCIDENT_HANDLER': IncidentHandlerMenuList,
    'FIELD_ENGINEER': FieldEngineerMenuList,
    'EXPERT_TEAM': ExpertTeamMenuList,
    'SLA_MANAGER': SLAManagerMenuList,
    'USER': EndUserMenuList
  };
  return menuMap[userRole] || EndUserMenuList;
};

export const getGuestMenu = (): MenuItem[] => GuestMenuList;

export const getMenuByUser = (): MenuItem[] => {
  if (!isAuthenticated()) {
    return getGuestMenu();
  }

  const storedTeam = getStoredUserTeam();
  const userTeam = storedTeam || 'USER';
  const role = mapTeamToRole(userTeam) as UserRole;

  return getMenuByRole(role);
};

export const validateMenuItem = (item: MenuItem): boolean => {
  if (!item.title) return false;

  if (item.Items) {
    return item.Items.every(subItem => validateMenuItem(subItem));
  }

  if (item.children) {
    return item.children.every(child => validateMenuItem(child));
  }

  return true;
};

export const filterMenuByPermissions = (menu: MenuItem[], userRole: UserRole): MenuItem[] => {
  return menu.filter(menuSection => {
    if (!validateMenuItem(menuSection)) {
      return false;
    }

    const filteredItems = menuSection.Items?.filter(item => {
      if (item.path?.includes('/admin/') && !RoleUtils.canAccessAdmin(userRole)) {
        return false;
      }
      if (item.path?.includes('/management/') && !RoleUtils.canManageIncidents(userRole)) {
        return false;
      }
      if (item.path?.includes('/sla/') && !RoleUtils.canManageSLA(userRole)) {
        return false;
      }
      return true;
    });

    return filteredItems && filteredItems.length > 0;
  }).map(menuSection => ({
    ...menuSection,
    Items: menuSection.Items?.filter(item => {
      if (item.path?.includes('/admin/') && !RoleUtils.canAccessAdmin(userRole)) {
        return false;
      }
      if (item.path?.includes('/management/') && !RoleUtils.canManageIncidents(userRole)) {
        return false;
      }
      if (item.path?.includes('/sla/') && !RoleUtils.canManageSLA(userRole)) {
        return false;
      }
      return true;
    })
  }));
};

// Export individual menus for backward compatibility - UPDATED
export {
  AdminMenuList,
  IncidentManagerMenuList,
  IncidentHandlerMenuList,
  FieldEngineerMenuList,
  ExpertTeamMenuList,
  SLAManagerMenuList,
  EndUserMenuList,
  GuestMenuList
};

// Default export for backward compatibility
export const MenuList = EndUserMenuList;
