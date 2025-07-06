'use client'
import React, { useState, useEffect } from 'react'
import {
  Row, Col, Button, Nav, NavItem, NavLink, TabContent, TabPane,
  Form, FormGroup, Label, Input, Table, Alert, Card, CardBody, CardHeader, Badge,
  Modal, ModalHeader, ModalBody, ModalFooter
} from 'reactstrap'
import { getStoredToken, getCurrentUser, getUserName, User, fetchUsers, createUserLookup } from '../app/(MainBody)/services/userService'
import {
  fetchActionTypes,
  fetchActionStatuses,
  fetchActionPriorities,
  fetchIncidentStates,
  fetchUrgencies
} from '../app/(MainBody)/services/masterService'
import AssignIncidents from './AssignIncidents'

interface IncidentTabsProps {
  incident: any
  userType?: string
  activeTab: string
  onTabChange: (tab: string) => void
  getUserName?: (userId: any, userLookup?: Record<string, string>) => string;
}

const API_BASE = 'https://apexwpc.apextechno.co.uk/api'

const IncidentTabs: React.FC<IncidentTabsProps> = ({ incident, userType, activeTab, onTabChange, getUserName: getUserNameProp }) => {
  const [loading, setLoading] = useState({
    actions: false,
    history: false,
    knowledge: false,
    masterData: false
  })

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [incidentActions, setIncidentActions] = useState([])
  const [incidentHistory, setIncidentHistory] = useState([])
  const [knowledgeBase, setKnowledgeBase] = useState([])

  const [showActionForm, setShowActionForm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [actionToDelete, setActionToDelete] = useState<any>(null)

  // Master data state
  const [masterData, setMasterData] = useState({
    actionTypes: [] as Array<{id: number, name: string}>,
    actionStatuses: [] as Array<{id: number, name: string}>,
    actionPriorities: [] as Array<{id: number, name: string}>,
    incidentStates: [] as Array<{id: number, name: string}>,
    urgencies: [] as Array<{id: number, name: string}>,
    users: [] as User[],
    userLookup: {} as Record<string, string>,
    loaded: false
  })

  const [actionForm, setActionForm] = useState({
    action_type_id: '',
    action_status_id: '',
    action_priority_id: '',
    raised: '',
    detail: '',
    complete: false
  })

  const safe = (value: any): string => value ? String(value) : ''
  const canEdit = () => !userType?.toLowerCase().includes('field_engineer')
  const debugLog = (action: string, data?: any) => {
    console.log(`[IncidentTabs] ${action}:`, data)
  }

  // Load master data including users
  const loadMasterData = async () => {
    setLoading(prev => ({ ...prev, masterData: true }))

    try {
      debugLog('Loading master data and users')

      const results = await Promise.allSettled([
        fetchActionTypes(),
        fetchActionStatuses(),
        fetchActionPriorities(),
        fetchIncidentStates(),
        fetchUrgencies(),
        fetchUsers()
      ])

      const [actionTypesRes, actionStatusesRes, actionPrioritiesRes, incidentStatesRes, urgenciesRes, usersRes] = results

      const actionTypes = actionTypesRes.status === 'fulfilled' ? actionTypesRes.value.data || [] : []
      const actionStatuses = actionStatusesRes.status === 'fulfilled' ? actionStatusesRes.value.data || [] : []
      const actionPriorities = actionPrioritiesRes.status === 'fulfilled' ? actionPrioritiesRes.value.data || [] : []
      const incidentStates = incidentStatesRes.status === 'fulfilled' ? incidentStatesRes.value.data || [] : []
      const urgencies = urgenciesRes.status === 'fulfilled' ? urgenciesRes.value.data || [] : []
      const users = usersRes.status === 'fulfilled' ? usersRes.value.data || [] : []

      // Create user lookup for performance
      const userLookup = createUserLookup(users)

      setMasterData({
        actionTypes,
        actionStatuses,
        actionPriorities,
        incidentStates,
        urgencies,
        users,
        userLookup,
        loaded: true
      })

      debugLog('Master data loaded successfully', {
        actionTypes: actionTypes.length,
        actionStatuses: actionStatuses.length,
        actionPriorities: actionPriorities.length,
        incidentStates: incidentStates.length,
        urgencies: urgencies.length,
        users: users.length,
        userLookupEntries: Object.keys(userLookup).length
      })

    } catch (error) {
      debugLog('Master data loading failed', error)
      setError('Failed to load master data')
    } finally {
      setLoading(prev => ({ ...prev, masterData: false }))
    }
  }

  // Helper functions to get names from master data
  const getActionTypeName = (typeId: number | string): string => {
    const type = masterData.actionTypes.find(t => t.id === parseInt(String(typeId)))
    return type?.name || `Action Type ${typeId}`
  }

  const getActionStatusName = (statusId: number | string): string => {
    const status = masterData.actionStatuses.find(s => s.id === parseInt(String(statusId)))
    return status?.name || `Status ${statusId}`
  }

  const getActionPriorityName = (priorityId: number | string): string => {
    const priority = masterData.actionPriorities.find(p => p.id === parseInt(String(priorityId)))
    return priority?.name || `Priority ${priorityId}`
  }

  const getIncidentStateName = (stateId: number | string): string => {
    const state = masterData.incidentStates.find(s => s.id === parseInt(String(stateId)))
    return state?.name || `State ${stateId}`
  }

  const getUrgencyName = (urgencyId: number | string): string => {
    const urgency = masterData.urgencies.find(u => u.id === parseInt(String(urgencyId)))
    return urgency?.name || `Urgency ${urgencyId}`
  }

  // Enhanced user display name function
  const getUserDisplayName = (userId: number | string): string => {
    if (!userId) return 'Unknown User'

    try {
      const userIdStr = userId.toString()

      // Try the master data lookup first
      if (masterData.userLookup && Object.keys(masterData.userLookup).length > 0) {
        const userName = masterData.userLookup[userIdStr]
        if (userName) {
          return userName
        }
      }

      // Try the prop function if available
      if (getUserNameProp && typeof getUserNameProp === 'function') {
        try {
          return getUserNameProp(userId, masterData.userLookup)
        } catch (error) {
          debugLog('Error calling getUserNameProp', { userId, error })
        }
      }

      // Try the imported getUserName function
      try {
        return getUserName(userId, masterData.userLookup)
      } catch (error) {
        debugLog('Error calling getUserName', { userId, error })
      }

      // Final fallback
      return `User ${userIdStr}`
    } catch (error) {
      debugLog('Error getting user name', { userId, error })
      return `User ${userId}`
    }
  }

  // Get status badge color
  const getStatusBadgeColor = (statusId: number | string): string => {
    const statusName = getActionStatusName(statusId).toLowerCase()
    if (statusName.includes('completed') || statusName.includes('done') || statusName.includes('closed')) return 'success'
    if (statusName.includes('progress') || statusName.includes('active') || statusName.includes('working')) return 'warning'
    if (statusName.includes('pending') || statusName.includes('new') || statusName.includes('open')) return 'secondary'
    return 'info'
  }

  // Get priority badge color
  const getPriorityBadgeColor = (priorityId: number | string): string => {
    const priorityName = getActionPriorityName(priorityId).toLowerCase()
    if (priorityName.includes('urgent') || priorityName.includes('critical') || priorityName.includes('high')) return 'danger'
    if (priorityName.includes('medium') || priorityName.includes('normal')) return 'warning'
    if (priorityName.includes('low')) return 'info'
    return 'secondary'
  }

  // Load incident actions
  const loadIncidentActions = async () => {
    setLoading(prev => ({ ...prev, actions: true }))
    const token = getStoredToken()
    const incidentId = safe(incident.id)

    try {
      debugLog('Loading incident actions for incident', incidentId)

      const response = await fetch(`${API_BASE}/incident-handler/incident-action/${incidentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      debugLog('Actions response status', response.status)

      if (response.ok) {
        const data = await response.json()
        debugLog('Actions response data', data)

        if (data.success && data.data) {
          setIncidentActions(data.data || [])
          debugLog('Actions loaded', data.data.length)
        } else {
          setIncidentActions([])
          debugLog('No actions found', data)
        }
      } else {
        const errorText = await response.text()
        debugLog('Actions request failed', { status: response.status, error: errorText })
        setIncidentActions([])
      }
    } catch (error) {
      debugLog('Actions fetch error', error)
      setIncidentActions([])
    } finally {
      setLoading(prev => ({ ...prev, actions: false }))
    }
  }

  // Delete action
  const deleteAction = async () => {
    if (!actionToDelete || !canEdit()) return

    setDeleteLoading(actionToDelete.id)
    const token = getStoredToken()

    try {
      debugLog('Deleting action', actionToDelete.id)

      const response = await fetch(`${API_BASE}/incident-handler/action/${actionToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      debugLog('Delete action response status', response.status)

      if (response.ok) {
        const data = await response.json()
        debugLog('Delete action response data', data)

        if (data.success) {
          setSuccess('Action deleted successfully')
          setShowDeleteModal(false)
          setActionToDelete(null)
          loadIncidentActions()
        } else {
          setError(data.message || 'Failed to delete action')
        }
      } else {
        const errorText = await response.text()
        debugLog('Delete action failed', { status: response.status, error: errorText })
        setError('Failed to delete action')
      }
    } catch (error) {
      debugLog('Delete action error', error)
      setError('Failed to delete action')
    } finally {
      setDeleteLoading(null)
    }
  }

  // Add new action
  const addAction = async () => {
    if (!actionForm.action_type_id || !actionForm.detail || !canEdit()) {
      debugLog('Action validation failed', {
        hasType: !!actionForm.action_type_id,
        hasDetail: !!actionForm.detail,
        canEdit: canEdit()
      })
      setError('Please fill in Action Type and Details')
      return
    }

    setActionLoading(true)
    const token = getStoredToken()
    const currentUser = getCurrentUser()
    const incidentId = safe(incident.id)

    const actionData = {
      incident_id: parseInt(incidentId),
      action_type_id: parseInt(actionForm.action_type_id),
      action_status_id: parseInt(actionForm.action_status_id) || (masterData.actionStatuses[0]?.id || 1),
      action_priority_id: parseInt(actionForm.action_priority_id) || (masterData.actionPriorities[0]?.id || 1),
      raised: actionForm.raised || new Date().toISOString().split('T')[0],
      complete: actionForm.complete ? 1 : 0,
      detail: actionForm.detail,
      created_by_id: currentUser?.id || 1,
      updated_by_id: currentUser?.id || 1
    }

    debugLog('Adding action', actionData)

    try {
      const response = await fetch(`${API_BASE}/incident-handler/action`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(actionData)
      })

      debugLog('Add action response status', response.status)

      if (response.ok) {
        const data = await response.json()
        debugLog('Add action response data', data)

        if (data.success) {
          setSuccess('Action added successfully')
          setShowActionForm(false)
          setActionForm({
            action_type_id: '',
            action_status_id: '',
            action_priority_id: '',
            raised: '',
            detail: '',
            complete: false
          })
          loadIncidentActions()
        } else {
          setError(data.message || 'Failed to add action')
        }
      } else {
        const errorText = await response.text()
        debugLog('Add action failed', { status: response.status, error: errorText })
        setError('Failed to add action')
      }
    } catch (error) {
      debugLog('Add action error', error)
      setError('Failed to add action')
    } finally {
      setActionLoading(false)
    }
  }

  // Load incident history
  const loadIncidentHistory = async () => {
    setLoading(prev => ({ ...prev, history: true }))
    const token = getStoredToken()
    const incidentId = safe(incident.id)

    try {
      debugLog('Loading incident history for incident', incidentId)

      const formData = new FormData()
      formData.append('incident_id', incidentId)

      const response = await fetch(`${API_BASE}/incident-handler/incident-history`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      debugLog('History response status', response.status)

      if (response.ok) {
        const data = await response.json()
        debugLog('History response data', data)

        if (data.success && data.data) {
          setIncidentHistory(data.data || [])
          debugLog('History loaded', data.data.length)
        } else {
          setIncidentHistory([])
          debugLog('No history found', data)
        }
      } else {
        const errorText = await response.text()
        debugLog('History request failed', { status: response.status, error: errorText })
        setIncidentHistory([])
      }
    } catch (error) {
      debugLog('History fetch error', error)
      setIncidentHistory([])
    } finally {
      setLoading(prev => ({ ...prev, history: false }))
    }
  }

  // Load knowledge base
  const loadKnowledgeBase = async () => {
    if (!incident?.category_id) return

    setLoading(prev => ({ ...prev, knowledge: true }))
    const token = getStoredToken()

    try {
      debugLog('Loading knowledge base for category', incident.category_id)

      const requestData = {
        category_id: parseInt(incident.category_id),
        subcategory_id: incident.subcategory_id ? parseInt(incident.subcategory_id) : null
      }

      const response = await fetch(`${API_BASE}/incident-handler/knowledge-base`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      })

      debugLog('Knowledge base response status', response.status)

      if (response.ok) {
        const data = await response.json()
        debugLog('Knowledge base response data', data)

        if (data.success && data.data) {
          setKnowledgeBase(data.data || [])
          debugLog('Knowledge base loaded', data.data.length)
        } else {
          setKnowledgeBase([])
          debugLog('No knowledge base found', data)
        }
      } else {
        const errorText = await response.text()
        debugLog('Knowledge base request failed', { status: response.status, error: errorText })
        setKnowledgeBase([])
      }
    } catch (error) {
      debugLog('Knowledge base fetch error', error)
      setKnowledgeBase([])
    } finally {
      setLoading(prev => ({ ...prev, knowledge: false }))
    }
  }

  // Handle tab changes and load data
  useEffect(() => {
    switch (activeTab) {
      case 'actions':
        if (incidentActions.length === 0) loadIncidentActions()
        break
      case 'history':
        if (incidentHistory.length === 0) loadIncidentHistory()
        break
      case 'knowledge':
        if (knowledgeBase.length === 0) loadKnowledgeBase()
        break
      case 'assignment':
        // Assignment tab doesn't need additional data loading
        break
    }
  }, [activeTab])

  // Load master data on component mount
  useEffect(() => {
    if (!masterData.loaded) {
      loadMasterData()
    }
  }, [])

  // Auto-clear alerts
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000)
      return () => clearTimeout(timer)
    }
  }, [error])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  return (
    <>
      {error && <Alert color="danger" toggle={() => setError(null)}>{error}</Alert>}
      {success && <Alert color="success" toggle={() => setSuccess(null)}>{success}</Alert>}

      {loading.masterData && (
        <Alert color="info">
          <div className="d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2"></div>
            <strong>Loading master data...</strong>
          </div>
        </Alert>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} toggle={() => setShowDeleteModal(false)}>
        <ModalHeader toggle={() => setShowDeleteModal(false)}>
          Confirm Delete
        </ModalHeader>
        <ModalBody>
          Are you sure you want to delete this action? This action cannot be undone.
          <div className="mt-2">
            <strong>Action:</strong> {actionToDelete?.detail}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="danger"
            onClick={deleteAction}
            disabled={deleteLoading === actionToDelete?.id}
          >
            {deleteLoading === actionToDelete?.id ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
          <Button color="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      <TabContent activeTab={activeTab}>
        {/* ACTIONS TAB */}
        <TabPane tabId="actions">
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <h5>📋 Incident Actions</h5>
              {canEdit() && (
                <Button
                  color="success"
                  size="sm"
                  onClick={() => setShowActionForm(!showActionForm)}
                  disabled={!masterData.loaded}
                >
                  {showActionForm ? 'Cancel' : 'Add Action'}
                </Button>
              )}
            </CardHeader>
            <CardBody>
              {showActionForm && canEdit() && masterData.loaded && (
                <Card className="mb-3 border-success">
                  <CardBody>
                    <h6>Add New Action</h6>
                    <Row>
                      <Col md={4}>
                        <FormGroup>
                          <Label>Action Type <span className="text-danger">*</span></Label>
                          <Input
                            type="select"
                            value={actionForm.action_type_id}
                            onChange={(e) => setActionForm({
                              ...actionForm,
                              action_type_id: e.target.value
                            })}
                          >
                            <option value="">Select Action Type</option>
                            {masterData.actionTypes.map((type) => (
                              <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                          </Input>
                        </FormGroup>
                      </Col>
                      <Col md={4}>
                        <FormGroup>
                          <Label>Status</Label>
                          <Input
                            type="select"
                            value={actionForm.action_status_id}
                            onChange={(e) => setActionForm({
                              ...actionForm,
                              action_status_id: e.target.value
                            })}
                          >
                            <option value="">Select Status</option>
                            {masterData.actionStatuses.map((status) => (
                              <option key={status.id} value={status.id}>{status.name}</option>
                            ))}
                          </Input>
                        </FormGroup>
                      </Col>
                      <Col md={4}>
                        <FormGroup>
                          <Label>Priority</Label>
                          <Input
                            type="select"
                            value={actionForm.action_priority_id}
                            onChange={(e) => setActionForm({
                              ...actionForm,
                              action_priority_id: e.target.value
                            })}
                          >
                            <option value="">Select Priority</option>
                            {masterData.actionPriorities.map((priority) => (
                              <option key={priority.id} value={priority.id}>{priority.name}</option>
                            ))}
                          </Input>
                        </FormGroup>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <FormGroup>
                          <Label>Raised Date</Label>
                          <Input
                            type="date"
                            value={actionForm.raised}
                            onChange={(e) => setActionForm({
                              ...actionForm,
                              raised: e.target.value
                            })}
                          />
                        </FormGroup>
                      </Col>
                      <Col md={6}>
                        <FormGroup>
                          <Label className="d-flex align-items-center">
                            <Input
                              type="checkbox"
                              checked={actionForm.complete}
                              onChange={(e) => setActionForm({
                                ...actionForm,
                                complete: e.target.checked
                              })}
                              className="me-2"
                            />
                            Mark as Complete
                          </Label>
                        </FormGroup>
                      </Col>
                    </Row>
                    <FormGroup>
                      <Label>Details <span className="text-danger">*</span></Label>
                      <Input
                        type="textarea"
                        rows="3"
                        value={actionForm.detail}
                        onChange={(e) => setActionForm({
                          ...actionForm,
                          detail: e.target.value
                        })}
                        placeholder="Describe the action to be taken..."
                        maxLength={500}
                      />
                      <small className="text-muted">{actionForm.detail.length}/500 characters</small>
                    </FormGroup>
                    <div className="d-flex gap-2">
                      <Button
                        color="success"
                        size="sm"
                        onClick={addAction}
                        disabled={!actionForm.action_type_id || !actionForm.detail || actionLoading}
                      >
                        {actionLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" />
                            Adding...
                          </>
                        ) : (
                          '✅ Add Action'
                        )}
                      </Button>
                      <Button
                        color="secondary"
                        size="sm"
                        onClick={() => {
                          setShowActionForm(false)
                          setActionForm({
                            action_type_id: '',
                            action_status_id: '',
                            action_priority_id: '',
                            raised: '',
                            detail: '',
                            complete: false
                          })
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              )}

              {loading.actions ? (
                <div className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : incidentActions.length > 0 ? (
                <div className="table-responsive">
                  <Table hover>
                    <thead className="table-light">
                      <tr>
                        <th>Details</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Raised Date</th>
                        <th>Complete</th>
                        <th>Updated By</th>
                        {canEdit() && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {incidentActions.map((action: any) => (
                        <tr key={action.id}>
                          <td>
                            <div style={{ maxWidth: '250px', wordWrap: 'break-word' }}>
                              {safe(action.detail)}
                            </div>
                          </td>
                          <td>
                            <Badge color="info" className="p-2">
                              {getActionTypeName(action.action_type_id)}
                            </Badge>
                          </td>
                          <td>
                            <Badge color={getStatusBadgeColor(action.action_status_id)} className="p-2">
                              {getActionStatusName(action.action_status_id)}
                            </Badge>
                          </td>
                          <td>
                            <Badge color={getPriorityBadgeColor(action.action_priority_id)} className="p-2">
                              {getActionPriorityName(action.action_priority_id)}
                            </Badge>
                          </td>
                          <td>{safe(action.raised)}</td>
                          <td>
                            <Badge color={action.complete ? 'success' : 'secondary'} className="p-2">
                              {action.complete ? '✅ Yes' : '⏳ No'}
                            </Badge>
                          </td>
                          <td>
                            <small className="text-muted">
                              {getUserDisplayName(action.updated_by_id)}
                            </small>
                          </td>
                          {canEdit() && (
                            <td>
                              <Button
                                color="danger"
                                size="sm"
                                onClick={() => {
                                  setActionToDelete(action)
                                  setShowDeleteModal(true)
                                }}
                                disabled={deleteLoading === action.id}
                                title="Delete action"
                              >
                                {deleteLoading === action.id ? (
                                  <span className="spinner-border spinner-border-sm" />
                                ) : (
                                  '🗑️'
                                )}
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <Alert color="info">
                  <div className="text-center py-3">
                    <h6>📭 No Actions Found</h6>
                    <p className="mb-0">No actions have been recorded for this incident yet.</p>
                    {canEdit() && (
                      <Button color="success" size="sm" className="mt-2" onClick={() => setShowActionForm(true)}>
                        Add First Action
                      </Button>
                    )}
                  </div>
                </Alert>
              )}
            </CardBody>
          </Card>
        </TabPane>

        {/* ASSIGNMENT TAB */}
        <TabPane tabId="assignment">
          <Card>
            <CardHeader>
              <h5>🎯 Assignment Management</h5>
            </CardHeader>
            <CardBody>
              <AssignIncidents
                userType={userType}
                onBack={() => onTabChange('actions')}
              />
            </CardBody>
          </Card>
        </TabPane>

        {/* HISTORY TAB */}
        <TabPane tabId="history">
          <Card>
            <CardHeader>
              <h5>📜 Incident Activity History</h5>
            </CardHeader>
            <CardBody>
              {loading.history ? (
                <div className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : incidentHistory.length > 0 ? (
                <div className="timeline">
                  {incidentHistory.map((history: any, index: number) => {
                    const getActivityInfo = (historyItem: any) => {
                      const activity = {
                        type: 'Unknown',
                        color: 'secondary',
                        icon: '📝',
                        title: 'Activity',
                        details: []
                      }

                      if (historyItem.type === 0) {
                        activity.type = 'Created'
                        activity.color = 'success'
                        activity.icon = '🆕'
                        activity.title = 'Incident Created'

                        if (historyItem.short_description) {
                          activity.details.push(`Summary: ${safe(historyItem.short_description)}`)
                        }
                        if (historyItem.description) {
                          activity.details.push(`Description: ${safe(historyItem.description)}`)
                        }
                      } else if (historyItem.type === 1) {
                        activity.type = 'Updated'
                        activity.color = 'warning'
                        activity.icon = '✏️'
                        activity.title = 'Incident Updated'

                        if (historyItem.short_description) {
                          activity.details.push(`Summary: ${safe(historyItem.short_description)}`)
                        }
                        if (historyItem.description) {
                          activity.details.push(`Description: ${safe(historyItem.description)}`)
                        }
                        if (historyItem.narration) {
                          activity.details.push(`Notes: ${safe(historyItem.narration)}`)
                        }
                      }

                      if (historyItem.root_cause_analysis) {
                        activity.details.push(`Root Cause: ${safe(historyItem.root_cause_analysis)}`)
                      }
                      if (historyItem.conclusion) {
                        activity.details.push(`Conclusion: ${safe(historyItem.conclusion)}`)
                      }

                      return activity
                    }

                    const activityInfo = getActivityInfo(history)

                    return (
                      <div key={history.id || index} className="timeline-item mb-4">
                        <div className="d-flex">
                          <div className="flex-shrink-0">
                            <div
                              className={`rounded-circle d-flex align-items-center justify-content-center bg-${activityInfo.color}`}
                              style={{ width: '40px', height: '40px', color: 'white' }}
                            >
                              <span>{activityInfo.icon}</span>
                            </div>
                          </div>
                          <div className="flex-grow-1 ms-3">
                            <div className="card">
                              <div className="card-header d-flex justify-content-between align-items-center">
                                <h6 className="mb-0">
                                  <Badge color={activityInfo.color} className="me-2">
                                    {activityInfo.type}
                                  </Badge>
                                  {activityInfo.title}
                                </h6>
                                <small className="text-muted">
                                  {safe(history.created_at)}
                                </small>
                              </div>
                              <div className="card-body">
                                <div className="row">
                                  <div className="col-md-6">
                                    <strong>Updated By:</strong> {getUserDisplayName(history.updated_by_id) || safe(history.updated_by_name)}
                                  </div>
                                  <div className="col-md-6">
                                    <strong>Date:</strong> {safe(history.created_at)}
                                  </div>
                                </div>

                                {activityInfo.details.length > 0 && (
                                  <div className="mt-3">
                                    <strong>Changes:</strong>
                                    <ul className="list-unstyled mt-2">
                                      {activityInfo.details.map((detail, idx) => (
                                        <li key={idx} className="mb-1">
                                          <small className="text-muted">• {detail}</small>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                <div className="mt-2">
                                  <small>
                                    <strong>Status:</strong>
                                    <Badge color={history.is_approved ? 'success' : 'secondary'} className="ms-1">
                                      {history.is_approved ? '✅ Approved' : '⏳ Pending'}
                                    </Badge>
                                    {history.approved_at && (
                                      <span className="ms-2">on {safe(history.approved_at)}</span>
                                    )}
                                  </small>
                                </div>

                                {history.is_email && (
                                  <div className="mt-1">
                                    <small>
                                      <Badge color="info">📧 Email Notification Sent</Badge>
                                    </small>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <Alert color="info">
                  <div className="text-center py-3">
                    <h6>📜 No History Found</h6>
                    <p className="mb-0">No activity history available for this incident.</p>
                  </div>
                </Alert>
              )}
            </CardBody>
          </Card>
        </TabPane>

        {/* KNOWLEDGE BASE TAB */}
        <TabPane tabId="knowledge">
          <Card>
            <CardHeader>
              <h5>💡 Knowledge Base - Similar Incidents</h5>
            </CardHeader>
            <CardBody>
              {loading.knowledge ? (
                <div className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : knowledgeBase.length > 0 ? (
                <Row>
                  {knowledgeBase.map((incident: any) => (
                    <Col md={6} lg={4} key={incident.id} className="mb-3">
                      <Card className="h-100 border-light shadow-sm">
                        <CardBody>
                          <h6 className="card-title">
                            <Badge color="info" className="me-2">
                              {safe(incident.incident_no)}
                            </Badge>
                          </h6>
                          <p className="card-text">
                            <strong>Description:</strong><br/>
                            <span className="text-muted">{safe(incident.short_description)}</span>
                          </p>
                          <div className="mb-2">
                            <Badge
                              color={
                                incident.status?.toLowerCase() === 'resolved' ? 'success' :
                                incident.status?.toLowerCase() === 'closed' ? 'secondary' :
                                incident.status?.toLowerCase() === 'in progress' ? 'warning' :
                                'primary'
                              }
                              className="p-2"
                            >
                              {safe(incident.status)}
                            </Badge>
                          </div>
                          <small className="text-muted">
                            <div><strong>Category:</strong> {safe(incident.category_name)}</div>
                            <div><strong>Created:</strong> {safe(incident.created_at)}</div>
                            {incident.resolved_at && (
                              <div><strong>Resolved:</strong> {safe(incident.resolved_at)}</div>
                            )}
                          </small>
                        </CardBody>
                      </Card>
                    </Col>
                  ))}
                </Row>
              ) : (
                <Alert color="info">
                  <div className="text-center py-3">
                    <h6>💡 No Similar Incidents Found</h6>
                    <p className="mb-0">No similar incidents found for this category.</p>
                    <small className="text-muted">
                      Knowledge base searches are based on incident category and subcategory.
                    </small>
                  </div>
                </Alert>
              )}
            </CardBody>
          </Card>
        </TabPane>
      </TabContent>
    </>
  )
}

export default IncidentTabs
