'use client'
import React, { useState, useEffect } from 'react'
import {
  Modal, ModalHeader, ModalBody, ModalFooter, Button, Badge,
  Nav, NavItem, NavLink, TabContent, TabPane, Alert
} from 'reactstrap'
import { getCurrentUser, getStoredToken, fetchUsers, createUserLookup, getUserName, User } from '../app/(MainBody)/services/userService'
import {
  fetchCategories,
  fetchSubcategories,
  fetchContactTypes,
  fetchImpacts,
  fetchSites,
  fetchAssets,
  fetchUrgencies,
  fetchIncidentStates
} from '../app/(MainBody)/services/masterService'

// Import tab components
import DetailsTab from './tabs/DetailsTab'
import EvidenceTab from './tabs/EvidenceTab'
import ActionsTab from './tabs/ActionsTab'
import HistoryTab from './tabs/HistoryTab'
import AssignmentTab from './tabs/AssignmentTab'
import KnowledgeTab from './tabs/KnowledgeTab'

interface EditIncidentProps {
  incident: any
  userType?: string
  onClose: () => void
  onSave: () => void
}

const EditIncident: React.FC<EditIncidentProps> = ({ incident, userType, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('details')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Master data state - shared across all tabs
  const [masterData, setMasterData] = useState({
    categories: [] as Array<{id: number, name: string}>,
    subCategories: [] as Array<{id: number, name: string, category_id: number}>,
    contactTypes: [] as Array<{id: number, name: string}>,
    urgencies: [] as Array<{id: number, name: string}>,
    impacts: [] as Array<{id: number, name: string}>,
    incidentStates: [] as Array<{id: number, name: string}>,
    sites: [] as Array<{id: number, name?: string, premises?: string, catchment?: string}>,
    assets: [] as Array<{id: number, name: string}>,
    users: [] as User[],
    userLookup: {} as Record<string, string>,
    loaded: false
  })

  const safe = (value: any): string => value ? String(value) : ''

  // Enhanced user type checks
  const isEndUser = () => {
    const userTeam = userType?.toLowerCase() || ''
    return userTeam.includes('end_user') || userTeam === 'end user' || userTeam === 'enduser'
  }

  const isFieldEngineer = () => {
    const userTeam = userType?.toLowerCase() || ''
    return userTeam.includes('field_engineer') || userTeam === 'field engineer' || userTeam === 'fieldengineer' || userTeam.includes('field')
  }

  const isAdvanced = () => {
    const userTeam = userType?.toLowerCase() || ''
    return ['handler', 'manager', 'admin', 'expert_team', 'expert team', 'expert'].some(role => userTeam.includes(role))
  }

  const canEditIncident = () => {
    if (isEndUser()) return true // End users can edit description fields
    if (isFieldEngineer()) return false // Field engineers cannot edit incident details
    return isAdvanced() // Advanced users can edit
  }

  const canEditEvidence = () => !isEndUser() // Only field engineers and advanced users can edit evidence
  const hasFullAccess = () => isAdvanced() && !isFieldEngineer() && !isEndUser()

  // Get incident status progression with enhanced logic
  const getStatusProgression = () => {
    // Get the current status ID - use incidentstate_id which is the actual field
    const currentStatusId = incident?.incidentstate_id || incident?.status_id || 1

    // Use actual incident states from backend
    const backendStatuses = masterData.incidentStates || []

    if (backendStatuses.length === 0) {
      // Fallback default statuses
      const defaultStatuses = [
        { id: 1, name: 'New' },
        { id: 2, name: 'In Progress' },
        { id: 3, name: 'Resolved' },
        { id: 4, name: 'Closed' }
      ]

      let currentStep = 0
      const currentStatusName = incident?.incidentstate?.name || incident?.status?.name || 'New'

      for (let i = 0; i < defaultStatuses.length; i++) {
        if (defaultStatuses[i].name.toLowerCase() === currentStatusName.toLowerCase()) {
          currentStep = i
          break
        }
      }

      return {
        statuses: defaultStatuses,
        currentStep: currentStep
      }
    }

    // Sort statuses by ID to maintain logical order
    const sortedStatuses = [...backendStatuses].sort((a, b) => a.id - b.id)

    // Find current step by matching the status ID
    let currentStep = 0
    for (let i = 0; i < sortedStatuses.length; i++) {
      if (sortedStatuses[i].id === parseInt(currentStatusId.toString())) {
        currentStep = i
        break
      }
    }

    return {
      statuses: sortedStatuses,
      currentStep: currentStep
    }
  }

  // Get priority color with enhanced logic
  const getPriorityColor = () => {
    const priority = incident?.priority?.name?.toLowerCase() ||
                    incident?.urgency?.name?.toLowerCase() ||
                    incident?.impact?.name?.toLowerCase() ||
                    'medium'

    if (priority.includes('high') || priority.includes('urgent') || priority.includes('critical')) return 'danger'
    if (priority.includes('medium') || priority.includes('normal')) return 'warning'
    if (priority.includes('low')) return 'info'
    return 'secondary'
  }

  // Enhanced master data loading with better error handling
  const loadMasterData = async () => {
    try {
      setLoading(true)
      console.log('Loading master data...')

      const results = await Promise.allSettled([
        fetchCategories(),
        fetchContactTypes(),
        fetchImpacts(),
        fetchUrgencies(),
        fetchIncidentStates(),
        fetchSites(),
        fetchAssets(),
        fetchUsers()
      ])

      const [categoriesRes, contactTypesRes, impactsRes, urgenciesRes, statesRes, sitesRes, assetsRes, usersRes] = results

      const categories = categoriesRes.status === 'fulfilled' ? categoriesRes.value.data || [] : []
      const contactTypes = contactTypesRes.status === 'fulfilled' ? contactTypesRes.value.data || [] : []
      const impacts = impactsRes.status === 'fulfilled' ? impactsRes.value.data || [] : []
      const urgencies = urgenciesRes.status === 'fulfilled' ? urgenciesRes.value.data || [] : []
      const incidentStates = statesRes.status === 'fulfilled' ? statesRes.value.data || [] : []
      const sites = sitesRes.status === 'fulfilled' ? sitesRes.value.data || [] : []
      const assets = assetsRes.status === 'fulfilled' ? assetsRes.value.data || [] : []
      const users = usersRes.status === 'fulfilled' ? usersRes.value.data || [] : []
      const userLookup = createUserLookup(users)

      console.log('Master data loaded:', {
        categories: categories.length,
        contactTypes: contactTypes.length,
        impacts: impacts.length,
        urgencies: urgencies.length,
        incidentStates: incidentStates.length,
        sites: sites.length,
        assets: assets.length,
        users: users.length
      })

      setMasterData({
        categories,
        subCategories: [],
        contactTypes,
        urgencies,
        impacts,
        incidentStates,
        sites,
        assets,
        users,
        userLookup,
        loaded: true
      })

      // Log any failed requests
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const requestNames = ['categories', 'contactTypes', 'impacts', 'urgencies', 'incidentStates', 'sites', 'assets', 'users']
          console.warn(`Failed to load ${requestNames[index]}:`, result.reason)
        }
      })

    } catch (error) {
      console.error('Error loading master data:', error)
      setError('Failed to load form options. Some features may not work correctly.')

      // Set minimal master data to prevent crashes
      setMasterData({
        categories: [],
        subCategories: [],
        contactTypes: [],
        urgencies: [],
        impacts: [],
        incidentStates: [],
        sites: [],
        assets: [],
        users: [],
        userLookup: {},
        loaded: true
      })
    } finally {
      setLoading(false)
    }
  }

  // Get available tabs based on user type with enhanced logic
  const getAvailableTabs = () => {
    const tabs = ['details']

    // End users only get details tab
    if (isEndUser()) {
      return tabs
    }

    // Field Engineers get evidence and history
    if (isFieldEngineer()) {
      tabs.push('evidence', 'history')
      return tabs
    }

    // Advanced users get all tabs including assignment and knowledge
    if (hasFullAccess()) {
      tabs.push('actions', 'assignment', 'evidence', 'history', 'knowledge')
    }

    return tabs
  }

  // Enhanced incident save with better error handling
  const handleSave = async (updateData: any) => {
    if (!canEditIncident() || !currentUser?.id) {
      setError('You do not have permission to edit this incident')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      console.log('Saving incident with data:', updateData)

      const token = getStoredToken()
      if (!token) {
        setError('Authentication token not found. Please login again.')
        return false
      }

      const response = await fetch(`https://apexwpc.apextechno.co.uk/api/incident-handler/edit-incident`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      })

      console.log('Save response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('Save response data:', result)

        if (result.success !== false) {
          setSuccess('Incident updated successfully')
          // Auto-close after successful save
          setTimeout(() => {
            onSave()
          }, 1500)
          return true
        } else {
          setError(result.message || 'Update failed')
          return false
        }
      } else {
        const errorText = await response.text()
        console.error('Save request failed:', { status: response.status, error: errorText })

        try {
          const errorData = JSON.parse(errorText)
          if (errorData.message) {
            setError(`Update failed: ${errorData.message}`)
          } else if (errorData.errors) {
            // Handle validation errors
            const errorMessages = Object.values(errorData.errors).flat()
            setError(`Validation failed: ${errorMessages.join(', ')}`)
          } else {
            setError('Update request failed')
          }
        } catch (parseError) {
          if (response.status === 401) {
            setError('Authentication failed. Please login again.')
          } else if (response.status === 403) {
            setError('You do not have permission to perform this action.')
          } else if (response.status === 422) {
            setError('Invalid data provided. Please check your inputs.')
          } else {
            setError(`Update request failed (${response.status})`)
          }
        }
        return false
      }
    } catch (error) {
      console.error('Save error:', error)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('Network error - unable to save changes. Please check your connection.')
      } else {
        setError('Failed to update incident')
      }
      return false
    } finally {
      setLoading(false)
    }
  }

  // Enhanced tab change handler with validation
  const handleTabChange = (tab: string) => {
    const availableTabs = getAvailableTabs()
    if (availableTabs.includes(tab)) {
      setActiveTab(tab)
    }
  }

  // Common props for all tabs
  const commonTabProps = {
    incident,
    userType,
    currentUser,
    masterData,
    isEndUser: isEndUser(),
    isFieldEngineer: isFieldEngineer(),
    hasFullAccess: hasFullAccess(),
    canEditIncident: canEditIncident(),
    canEditEvidence: canEditEvidence(),
    setError,
    setSuccess,
    safe
  }

  // Initialize component
  useEffect(() => {
    const user = getCurrentUser()
    console.log('Current user:', user)
    console.log('User type:', userType)
    setCurrentUser(user)
    loadMasterData()
  }, [])

  // Auto-clear alerts with different timeouts
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000) // 10 seconds for errors
      return () => clearTimeout(timer)
    }
  }, [error])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000) // 5 seconds for success
      return () => clearTimeout(timer)
    }
  }, [success])

  // Ensure active tab is available to current user
  useEffect(() => {
    const availableTabs = getAvailableTabs()
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0] || 'details')
    }
  }, [userType])

  const availableTabs = getAvailableTabs()
  const { statuses, currentStep } = getStatusProgression()

  // Get tab display name with icons
  const getTabDisplayName = (tab: string) => {
    switch (tab) {
      case 'details': return 'Details'
      case 'actions': return 'Actions'
      case 'assignment': return 'Assignment'
      case 'evidence': return 'Evidence'
      case 'history': return 'History'
      case 'knowledge': return 'Knowledge'
      default: return tab.charAt(0).toUpperCase() + tab.slice(1)
    }
  }

  // Get user role badge
  const getUserRoleBadge = () => {
    if (isEndUser()) return <Badge color="info" className="ms-2">End User</Badge>
    if (isFieldEngineer()) return <Badge color="warning" className="ms-2">Field Engineer</Badge>
    if (hasFullAccess()) return <Badge color="success" className="ms-2">Advanced User</Badge>
    return <Badge color="secondary" className="ms-2">User</Badge>
  }

  return (
    <Modal isOpen={true} toggle={onClose} size="xl" style={{ maxWidth: '95vw' }}>
      <ModalHeader toggle={onClose}>
        <div className="d-flex justify-content-between align-items-center w-100 me-3">
          <div>
            <h5 className="mb-0">
              Edit Incident - {safe(incident?.incident_no)}
            </h5>
          </div>
        </div>
      </ModalHeader>

      <ModalBody style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        {/* Enhanced Progress Bar with Status Information */}
        <div className="mb-4">
          <div className="card" style={{
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            border: '1px solid #dee2e6',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div className="card-body py-3">
              <div className="d-flex align-items-center" style={{ width: '100%' }}>
                {statuses.map((status, index) => {
                  const isActive = index === currentStep
                  const isCompleted = index < currentStep

                  return (
                    <div key={status.id} className="d-flex align-items-center" style={{
                      flex: '1',
                      minWidth: '0'
                    }}>
                      <div
                        className="d-flex align-items-center justify-content-center text-white fw-bold"
                        style={{
                          height: '45px',
                          width: '100%',
                          background: isActive
                            ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                            : isCompleted
                              ? 'linear-gradient(135deg, #6c757d 0%, #495057 100%)'
                              : '#d6d8db',
                          color: isActive || isCompleted ? '#fff' : '#495057',
                          clipPath: index === statuses.length - 1
                            ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 15px 50%)'
                            : index === 0
                              ? 'polygon(0 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 0 100%)'
                              : 'polygon(0 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 0 100%, 15px 50%)',
                          marginRight: index === statuses.length - 1 ? '0' : '-15px',
                          zIndex: statuses.length - index,
                          fontSize: '13px',
                          fontWeight: '600',
                          transition: 'all 0.3s ease',
                          transform: isActive ? 'scale(1.02)' : 'scale(1)',
                          boxShadow: isActive ? '0 4px 15px rgba(40, 167, 69, 0.3)' : 'none'
                        }}
                        title={`Status: ${status.name}${isActive ? ' (Current)' : isCompleted ? ' (Completed)' : ' (Pending)'}`}
                      >
                        <span style={{
                          paddingLeft: index === 0 ? '15px' : '25px',
                          paddingRight: index === statuses.length - 1 ? '15px' : '25px',
                          textAlign: 'center'
                        }}>
                          {isCompleted && '✓ '}
                          {status.name}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Global alerts with enhanced styling */}
        {error && (
          <Alert color="danger" toggle={() => setError(null)} className="d-flex align-items-center">
            <span className="me-2">⚠️</span>
            <div>
              <strong>Error:</strong> {error}
            </div>
          </Alert>
        )}

        {success && (
          <Alert color="success" toggle={() => setSuccess(null)} className="d-flex align-items-center">
            <span className="me-2">✅</span>
            <div>
              <strong>Success:</strong> {success}
            </div>
          </Alert>
        )}

        {/* Loading indicator for master data */}
        {loading && !masterData.loaded && (
          <Alert color="info" className="d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2"></div>
            <div>
              <strong>Loading data...</strong>
              <div className="mt-1">
                <small>Fetching categories, sites, assets, and other form options...</small>
              </div>
            </div>
          </Alert>
        )}

        {/* Tab navigation with enhanced styling */}
        {availableTabs.length > 1 && (
          <Nav tabs className="mb-4 border-bottom">
            {availableTabs.map(tab => (
              <NavItem key={tab}>
                <NavLink
                  className={`${activeTab === tab ? 'active fw-bold' : ''} cursor-pointer`}
                  onClick={() => handleTabChange(tab)}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderColor: activeTab === tab ? '#28a745' : 'transparent'
                  }}
                >
                  {getTabDisplayName(tab)}
                </NavLink>
              </NavItem>
            ))}
          </Nav>
        )}

        {/* Tab content */}
        <TabContent activeTab={activeTab}>
          {/* Details Tab */}
          <TabPane tabId="details">
            <DetailsTab
              {...commonTabProps}
              onSave={handleSave}
              loading={loading}
            />
          </TabPane>

          {/* Evidence Tab */}
          {(canEditEvidence() || isFieldEngineer()) && (
            <TabPane tabId="evidence">
              <EvidenceTab {...commonTabProps} />
            </TabPane>
          )}

          {/* Actions Tab */}
          {hasFullAccess() && (
            <TabPane tabId="actions">
              <ActionsTab {...commonTabProps} />
            </TabPane>
          )}

          {/* Assignment Tab */}
          {hasFullAccess() && (
            <TabPane tabId="assignment">
              <AssignmentTab {...commonTabProps} />
            </TabPane>
          )}

          {/* History Tab */}
          {(isFieldEngineer() || hasFullAccess()) && (
            <TabPane tabId="history">
              <HistoryTab {...commonTabProps} />
            </TabPane>
          )}

          {/* Knowledge Tab */}
          {hasFullAccess() && (
            <TabPane tabId="knowledge">
              <KnowledgeTab {...commonTabProps} />
            </TabPane>
          )}
        </TabContent>
      </ModalBody>

      <ModalFooter className="d-flex justify-content-end align-items-center">
        <div>
          <Button
            color="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Close'}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  )
}

export default EditIncident
