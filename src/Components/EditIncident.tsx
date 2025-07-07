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
  readOnly?: boolean
}

const EditIncident: React.FC<EditIncidentProps> = ({ incident, userType, onClose, onSave, readOnly = false }) => {
  const [activeTab, setActiveTab] = useState('details')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [enrichedIncident, setEnrichedIncident] = useState<any>(null)
  const [dataReady, setDataReady] = useState(false)

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

  // Override edit permissions when in read-only mode
  const canEditIncident = () => {
    if (readOnly) return false
    if (isEndUser()) return true
    if (isFieldEngineer()) return false
    return isAdvanced()
  }

  const canEditEvidence = () => {
    if (readOnly) return false
    return !isEndUser()
  }

  const hasFullAccess = () => {
    if (readOnly) return false
    return isAdvanced() && !isFieldEngineer() && !isEndUser()
  }

  // Transform and normalize incident data for consistent field access
  const normalizeIncidentData = (incidentData: any, masterData: any) => {
    if (!incidentData) return incidentData

    console.log('Normalizing incident data:', incidentData)
    console.log('Master data available:', {
      categories: masterData.categories?.length || 0,
      sites: masterData.sites?.length || 0,
      contactTypes: masterData.contactTypes?.length || 0,
      urgencies: masterData.urgencies?.length || 0,
      impacts: masterData.impacts?.length || 0
    })

    const normalized = { ...incidentData }

    // Normalize category data
    if (incidentData.categoryName && !normalized.category?.name) {
      const categoryName = incidentData.categoryName
      const matchingCategory = masterData.categories?.find((cat: any) =>
        cat.name?.toLowerCase() === categoryName.toLowerCase() ||
        cat.name?.toLowerCase().replace(/[^a-z0-9]/g, '') === categoryName.toLowerCase().replace(/[^a-z0-9]/g, '')
      )

      if (matchingCategory) {
        normalized.category = { id: matchingCategory.id, name: matchingCategory.name }
        normalized.category_id = matchingCategory.id
      } else {
        normalized.category = { id: null, name: categoryName }
        normalized.category_id = null
      }
      console.log('Normalized category:', normalized.category)
    }

    // Also handle case where we already have category object but need to ensure category_id is set
    if (normalized.category?.id && !normalized.category_id) {
      normalized.category_id = normalized.category.id
    }

    // Normalize site data
    if (incidentData.siteName && !normalized.site?.name) {
      const siteName = incidentData.siteName
      const matchingSite = masterData.sites?.find((site: any) =>
        site.name?.toLowerCase() === siteName.toLowerCase() ||
        site.premises?.toLowerCase() === siteName.toLowerCase() ||
        site.catchment?.toLowerCase() === siteName.toLowerCase()
      )

      if (matchingSite) {
        normalized.site = {
          id: matchingSite.id,
          name: matchingSite.name || matchingSite.premises || matchingSite.catchment
        }
        normalized.site_id = matchingSite.id
      } else {
        normalized.site = { id: null, name: siteName }
        normalized.site_id = null
      }
      console.log('Normalized site:', normalized.site)
    }

    // Also handle case where we already have site object but need to ensure site_id is set
    if (normalized.site?.id && !normalized.site_id) {
      normalized.site_id = normalized.site.id
    }

    // Normalize contact type
    if (incidentData.contactTypeName && !normalized.contacttype?.name) {
      const contactTypeName = incidentData.contactTypeName
      const matchingContactType = masterData.contactTypes?.find((ct: any) =>
        ct.name?.toLowerCase() === contactTypeName.toLowerCase()
      )

      if (matchingContactType) {
        normalized.contacttype = { id: matchingContactType.id, name: matchingContactType.name }
        normalized.contact_type_id = matchingContactType.id
      } else {
        normalized.contacttype = { id: null, name: contactTypeName }
        normalized.contact_type_id = null
      }
      console.log('Normalized contact type:', normalized.contacttype)
    }

    // Also handle case where we already have contacttype object but need to ensure contact_type_id is set
    if (normalized.contacttype?.id && !normalized.contact_type_id) {
      normalized.contact_type_id = normalized.contacttype.id
    }

    // Normalize urgency
    if (incidentData.urgencyName && !normalized.urgency?.name) {
      const urgencyName = incidentData.urgencyName
      const matchingUrgency = masterData.urgencies?.find((urg: any) =>
        urg.name?.toLowerCase() === urgencyName.toLowerCase()
      )

      if (matchingUrgency) {
        normalized.urgency = { id: matchingUrgency.id, name: matchingUrgency.name }
        normalized.urgency_id = matchingUrgency.id
      } else {
        normalized.urgency = { id: null, name: urgencyName }
        normalized.urgency_id = null
      }
      console.log('Normalized urgency:', normalized.urgency)
    }

    // Also handle case where we already have urgency object but need to ensure urgency_id is set
    if (normalized.urgency?.id && !normalized.urgency_id) {
      normalized.urgency_id = normalized.urgency.id
    }

    // Normalize impact
    if (incidentData.impactName && !normalized.impact?.name) {
      const impactName = incidentData.impactName
      const matchingImpact = masterData.impacts?.find((imp: any) =>
        imp.name?.toLowerCase() === impactName.toLowerCase()
      )

      if (matchingImpact) {
        normalized.impact = { id: matchingImpact.id, name: matchingImpact.name }
        normalized.impact_id = matchingImpact.id
      } else {
        normalized.impact = { id: null, name: impactName }
        normalized.impact_id = null
      }
      console.log('Normalized impact:', normalized.impact)
    }

    // Also handle case where we already have impact object but need to ensure impact_id is set
    if (normalized.impact?.id && !normalized.impact_id) {
      normalized.impact_id = normalized.impact.id
    }

    // Normalize asset
    if (incidentData.assetName && !normalized.asset?.name) {
      const assetName = incidentData.assetName
      const matchingAsset = masterData.assets?.find((asset: any) =>
        asset.name?.toLowerCase() === assetName.toLowerCase()
      )

      if (matchingAsset) {
        normalized.asset = { id: matchingAsset.id, name: matchingAsset.name }
        normalized.asset_id = matchingAsset.id
      } else {
        normalized.asset = { id: null, name: assetName }
        normalized.asset_id = null
      }
      console.log('Normalized asset:', normalized.asset)
    }

    // Also handle case where we already have asset object but need to ensure asset_id is set
    if (normalized.asset?.id && !normalized.asset_id) {
      normalized.asset_id = normalized.asset.id
    }

    // Normalize incident state (status)
    if (normalized.incidentstate?.id && !normalized.incidentstate_id) {
      normalized.incidentstate_id = normalized.incidentstate.id
    }

    // Ensure text fields are present
    if (incidentData.shortDescription && !normalized.short_description) {
      normalized.short_description = incidentData.shortDescription
    }
    if (incidentData.description && !normalized.description) {
      normalized.description = incidentData.description
    }

    console.log('Final normalized incident data:', normalized)
    return normalized
  }

  // Enhanced incident data fetching for read-only mode
  const fetchFullIncidentData = async (incidentId: string | number) => {
    const token = getStoredToken()
    if (!token) {
      console.warn('No authentication token found')
      return incident
    }

    try {
      console.log('Fetching full incident data for ID:', incidentId)

      // Try multiple API endpoints to get complete incident data
      const endpoints = [
        `https://apexwpc.apextechno.co.uk/api/incidents/${incidentId}`,
        `https://apexwpc.apextechno.co.uk/api/incident-handler/incident/${incidentId}`,
        `https://apexwpc.apextechno.co.uk/api/incident/${incidentId}`
      ]

      for (const endpoint of endpoints) {
        try {
          console.log('Trying endpoint:', endpoint)
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          })

          if (response.ok) {
            const result = await response.json()
            console.log(`Response from ${endpoint}:`, result)

            if (result.success && result.data) {
              console.log('Successfully fetched incident data:', result.data)
              return result.data
            } else if (result && !result.success && result.data) {
              console.log('Fetched incident data (success=false):', result.data)
              return result.data
            } else if (Array.isArray(result.data) && result.data.length > 0) {
              console.log('Fetched incident data (array):', result.data[0])
              return result.data[0]
            } else if (result && typeof result === 'object' && result.id) {
              console.log('Fetched incident data (direct):', result)
              return result
            }
          } else {
            console.warn(`Endpoint ${endpoint} returned status:`, response.status)
          }
        } catch (endpointError) {
          console.warn(`Error with endpoint ${endpoint}:`, endpointError)
          continue
        }
      }

      console.warn('All endpoints failed, using original incident data')
    } catch (error) {
      console.warn('Error fetching full incident data:', error)
    }

    console.log('Returning original incident data:', incident)
    return incident
  }

  // Get incident status progression with enhanced logic
  const getStatusProgression = () => {
    const currentIncident = enrichedIncident || incident

    const currentStatusId = currentIncident?.incidentstate_id || currentIncident?.incidentstate?.id || currentIncident?.status_id || 1

    const backendStatuses = masterData.incidentStates || []

    if (backendStatuses.length === 0) {
      const defaultStatuses = [
        { id: 1, name: 'New' },
        { id: 2, name: 'In Progress' },
        { id: 3, name: 'Resolved' },
        { id: 4, name: 'Closed' }
      ]

      let currentStep = 0
      const currentStatusName = currentIncident?.incidentstate?.name || currentIncident?.status?.name || 'New'

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

    const sortedStatuses = [...backendStatuses].sort((a, b) => a.id - b.id)

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

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const requestNames = ['categories', 'contactTypes', 'impacts', 'urgencies', 'incidentStates', 'sites', 'assets', 'users']
          console.warn(`Failed to load ${requestNames[index]}:`, result.reason)
        }
      })

    } catch (error) {
      console.error('Error loading master data:', error)
      setError('Failed to load form options. Some features may not work correctly.')

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
      setTimeout(() => setDataReady(true), 100)
    }
  }

  // Get available tabs based on user type and read-only mode
  const getAvailableTabs = () => {
    const tabs = ['details']

    if (readOnly) {
      tabs.push('actions', 'evidence', 'history')
      return tabs
    }

    if (isEndUser()) {
      return tabs
    }

    if (isFieldEngineer()) {
      tabs.push('evidence', 'action', 'assignment', 'history')
      return tabs
    }

    if (hasFullAccess()) {
      tabs.push('actions', 'assignment', 'evidence', 'history', 'knowledge')
    }

    return tabs
  }

  // Enhanced incident save with better error handling
  const handleSave = async (updateData: any) => {
    if (readOnly) {
      setError('Cannot save changes in read-only mode')
      return false
    }

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
  const getCommonTabProps = () => {
    const currentIncident = enrichedIncident || incident
    const normalizedIncident = masterData.loaded ?
      normalizeIncidentData(currentIncident, masterData) :
      currentIncident

    return {
      incident: normalizedIncident,
      userType,
      currentUser,
      masterData,
      isEndUser: readOnly ? false : isEndUser(),
      isFieldEngineer: readOnly ? true : isFieldEngineer(),
      hasFullAccess: readOnly ? false : hasFullAccess(),
      canEditIncident: canEditIncident(),
      canEditEvidence: canEditEvidence(),
      setError,
      setSuccess,
      safe,
      readOnly,
      originalIncident: incident,
      enrichedIncident: enrichedIncident
    }
  }

  // Initialize component and fetch enriched data if in read-only mode
  useEffect(() => {
    const user = getCurrentUser()
    console.log('Current user:', user)
    console.log('User type:', userType)
    console.log('Read-only mode:', readOnly)
    console.log('Original incident data:', incident)
    setCurrentUser(user)

    loadMasterData()

    if (readOnly && incident?.id) {
      console.log('Fetching enriched incident data for read-only mode...')
      fetchFullIncidentData(incident.id).then(fullIncident => {
        console.log('Enriched incident data received:', fullIncident)

        if (fullIncident && (fullIncident.id || fullIncident.incident_no)) {
          setEnrichedIncident(fullIncident)
          setTimeout(() => setDataReady(true), 150)
        } else {
          console.warn('Invalid enriched incident data, using original:', fullIncident)
          setEnrichedIncident(incident)
          setTimeout(() => setDataReady(true), 150)
        }
      }).catch(error => {
        console.error('Error fetching enriched incident data:', error)
        setEnrichedIncident(incident)
        setTimeout(() => setDataReady(true), 150)
      })
    } else if (!readOnly) {
      setEnrichedIncident(incident)
      setTimeout(() => setDataReady(true), 100)
    }
  }, [incident?.id, readOnly])

  // Auto-clear alerts with different timeouts
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000)
      return () => clearTimeout(timer)
    }
  }, [error])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // Ensure active tab is available to current user
  useEffect(() => {
    const availableTabs = getAvailableTabs()
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0] || 'details')
    }
  }, [userType, readOnly])

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

  return (
    <Modal isOpen={true} toggle={onClose} size="xl" style={{ maxWidth: '95vw' }}>
      <ModalHeader toggle={onClose}>
        <div className="d-flex justify-content-between align-items-center w-100 me-3">
          <div>
            <h5 className="mb-0">
              {readOnly ? 'View Incident' : 'Edit Incident'} - {safe((enrichedIncident || incident)?.incident_no)}
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
            {!dataReady || !masterData.loaded ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary mb-3"></div>
                <p>Loading incident details...</p>
              </div>
            ) : (
              <DetailsTab
                {...getCommonTabProps()}
                onSave={handleSave}
                loading={loading}
                key={`details-${dataReady}-${enrichedIncident?.id || incident?.id}`}
              />
            )}
          </TabPane>

          {/* Actions Tab */}
          {availableTabs.includes('actions') && (
            <TabPane tabId="actions">
              <ActionsTab {...getCommonTabProps()} />
            </TabPane>
          )}

          {/* Evidence Tab */}
          {availableTabs.includes('evidence') && (
            <TabPane tabId="evidence">
              <EvidenceTab {...getCommonTabProps()} />
            </TabPane>
          )}

          {/* Assignment Tab - Only in edit mode */}
          {!readOnly && (isFieldEngineer() || hasFullAccess()) && (
            <TabPane tabId="assignment">
              <AssignmentTab {...getCommonTabProps()} />
            </TabPane>
          )}

          {/* History Tab */}
          {availableTabs.includes('history') && (
            <TabPane tabId="history">
              <HistoryTab {...getCommonTabProps()} />
            </TabPane>
          )}

          {/* Knowledge Tab - Only in edit mode for advanced users */}
          {!readOnly && hasFullAccess() && (
            <TabPane tabId="knowledge">
              <KnowledgeTab {...getCommonTabProps()} />
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
