'use client'
import React, { useState, useEffect } from 'react'
import {
  Row, Col, Button, Form, FormGroup, Label, Input, Table, Alert, Card, CardBody, CardHeader, Badge,
  Modal, ModalHeader, ModalBody, ModalFooter
} from 'reactstrap'
import { getStoredToken } from '../../app/(MainBody)/services/userService'

interface ActionsTabProps {
  incident: any
  currentUser: any
  masterData: any
  hasFullAccess: boolean
  isFieldEngineer: boolean
  setError: (error: string | null) => void
  setSuccess: (success: string | null) => void
  safe: (value: any) => string
}

const API_BASE = 'https://apexwpc.apextechno.co.uk/api'

const ActionsTab: React.FC<ActionsTabProps> = ({
  incident,
  currentUser,
  masterData,
  hasFullAccess,
  isFieldEngineer,
  setError,
  setSuccess,
  safe
}) => {
  const [loading, setLoading] = useState(false)
  const [incidentActions, setIncidentActions] = useState([])
  const [showActionForm, setShowActionForm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [editingAction, setEditingAction] = useState<any>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Enhanced static dropdown options with proper production data
  const actionTypes = [
    { id: 1, name: 'Investigation', description: 'Investigate root cause and impacts' },
    { id: 2, name: 'Repair', description: 'Physical repair or replacement' },
    { id: 3, name: 'Monitoring', description: 'Ongoing monitoring and observation' },
    { id: 4, name: 'Documentation', description: 'Document findings and procedures' },
    { id: 5, name: 'Follow Up', description: 'Follow-up actions and verification' },
    { id: 6, name: 'Communication', description: 'Stakeholder communication' },
    { id: 7, name: 'Testing', description: 'System or equipment testing' },
    { id: 8, name: 'Others', description: 'Not listed' }
  ]

  const actionStatuses = [
    { id: 1, name: 'Pending', color: 'secondary', description: 'Awaiting initiation' },
    { id: 2, name: 'In Progress', color: 'warning', description: 'Currently being worked on' },
    { id: 3, name: 'Completed', color: 'success', description: 'Successfully completed' },
    { id: 4, name: 'On Hold', color: 'info', description: 'Temporarily suspended' },
    { id: 5, name: 'Cancelled', color: 'danger', description: 'Cancelled or no longer required' }
  ]

  const actionPriorities = [
    { id: 1, name: 'Low', color: 'info', description: 'Can be addressed when convenient' },
    { id: 2, name: 'Medium', color: 'warning', description: 'Should be addressed soon' },
    { id: 3, name: 'High', color: 'danger', description: 'Requires immediate attention' },
    { id: 4, name: 'Critical', color: 'dark', description: 'Urgent - highest priority' }
  ]

  const [actionForm, setActionForm] = useState({
    action_type_id: '',
    action_status_id: '1', // Default to Pending
    action_priority_id: '2', // Default to Medium
    raised: new Date().toISOString().split('T')[0], // Default to today
    detail: '',
    complete: false
  })

  const [editForm, setEditForm] = useState({
    action_type_id: '',
    action_status_id: '',
    action_priority_id: '',
    raised: '',
    detail: '',
    complete: false
  })

  const canEdit = () => hasFullAccess || isFieldEngineer

  const debugLog = (action: string, data?: any) => {
    console.log(`[ActionsTab] ${action}:`, data)
  }

  // Helper functions to get names and colors from static data
  const getActionTypeName = (typeId: string | number | null | undefined): string => {
    if (!typeId) return 'Unknown Type'
    const type = actionTypes.find(t => t.id === parseInt(typeId.toString()))
    return type?.name || `Type ${typeId}`
  }

  const getActionStatusInfo = (statusId: string | number | null | undefined): { name: string, color: string } => {
    if (!statusId) return { name: 'Unknown Status', color: 'secondary' }
    const status = actionStatuses.find(s => s.id === parseInt(statusId.toString()))
    return {
      name: status?.name || `Status ${statusId}`,
      color: status?.color || 'secondary'
    }
  }

  const getActionPriorityInfo = (priorityId: string | number | null | undefined): { name: string, color: string } => {
    if (!priorityId) return { name: 'Unknown Priority', color: 'secondary' }
    const priority = actionPriorities.find(p => p.id === parseInt(priorityId.toString()))
    return {
      name: priority?.name || `Priority ${priorityId}`,
      color: priority?.color || 'secondary'
    }
  }

  // Enhanced user display name function
  const getUserDisplayName = (userId: number | string): string => {
    if (!userId) return 'Unknown User'

    try {
      const userIdStr = userId.toString()

      // Try the master data lookup first
      if (masterData?.userLookup && Object.keys(masterData.userLookup).length > 0) {
        const userName = masterData.userLookup[userIdStr]
        if (userName) {
          return userName
        }
      }

      // Final fallback
      return `User ${userIdStr}`
    } catch (error) {
      debugLog('Error getting user name', { userId, error })
      return `User ${userId}`
    }
  }

  // Load incident actions
  const loadIncidentActions = async () => {
    setLoading(true)
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
          // Sort actions by created date (newest first) and then by priority
          const sortedActions = (data.data || []).sort((a: any, b: any) => {
            // First sort by completion status (incomplete first)
            if (a.complete !== b.complete) {
              return a.complete ? 1 : -1
            }

            // Then by priority (high priority first)
            const aPriority = parseInt(a.action_priority_id) || 2
            const bPriority = parseInt(b.action_priority_id) || 2
            if (aPriority !== bPriority) {
              return bPriority - aPriority // Higher priority first
            }

            // Finally by creation date (newest first)
            const aDate = new Date(a.created_at || 0).getTime()
            const bDate = new Date(b.created_at || 0).getTime()
            return bDate - aDate
          })

          setIncidentActions(sortedActions)
          debugLog('Actions loaded and sorted', sortedActions.length)
        } else {
          setIncidentActions([])
          debugLog('No actions found', data)
        }
      } else if (response.status === 404) {
        // 404 is normal for incidents with no actions
        setIncidentActions([])
        debugLog('No actions exist for this incident (404)')
      } else {
        // Only show error for actual server errors
        if (response.status >= 500 || response.status === 401 || response.status === 403) {
          const errorText = await response.text()
          debugLog('Actions request failed', { status: response.status, error: errorText })
          setError('Failed to load incident actions')
        } else {
          // For other status codes, just log and show empty
          setIncidentActions([])
          debugLog('Actions request returned non-success status', response.status)
        }
      }
    } catch (error) {
      debugLog('Actions fetch error', error)
      setIncidentActions([])
      // Only show error for network issues
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('Network error - unable to load actions')
      }
    } finally {
      setLoading(false)
    }
  }

  // Edit action
  const startEdit = (action: any) => {
    setEditingAction(action)
    setEditForm({
      action_type_id: action.action_type_id?.toString() || '',
      action_status_id: action.action_status_id?.toString() || '',
      action_priority_id: action.action_priority_id?.toString() || '',
      raised: action.raised || '',
      detail: action.detail || '',
      complete: action.complete || false
    })
    setShowEditModal(true)
  }

  const updateAction = async () => {
    if (!editForm.action_type_id || !editForm.detail || !canEdit()) {
      setError('Please fill in Action Type and Details')
      return
    }

    setActionLoading(true)
    const token = getStoredToken()

    const actionData = {
      action_type_id: parseInt(editForm.action_type_id),
      action_status_id: parseInt(editForm.action_status_id) || 1,
      action_priority_id: parseInt(editForm.action_priority_id) || 2,
      raised: editForm.raised || editingAction.raised,
      complete: editForm.complete ? 1 : 0,
      detail: editForm.detail.trim(),
      updated_by_id: currentUser?.id || 1
    }

    debugLog('Updating action', { id: editingAction.id, data: actionData })

    try {
      const response = await fetch(`${API_BASE}/incident-handler/action/${editingAction.id}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(actionData)
      })

      debugLog('Update action response status', response.status)

      if (response.ok) {
        const data = await response.json()
        debugLog('Update action response data', data)

        if (data.success !== false) {
          setSuccess('Action updated successfully')
          setShowEditModal(false)
          setEditingAction(null)
          resetEditForm()
          loadIncidentActions()
        } else {
          setError(data.message || 'Failed to update action')
        }
      } else {
        const errorText = await response.text()
        debugLog('Update action failed', { status: response.status, error: errorText })
        try {
          const errorData = JSON.parse(errorText)
          setError(errorData.message || 'Failed to update action')
        } catch {
          setError('Failed to update action')
        }
      }
    } catch (error) {
      debugLog('Update action error', error)
      setError('Failed to update action')
    } finally {
      setActionLoading(false)
    }
  }

  // Add new action
  const addAction = async () => {
    if (!actionForm.action_type_id || !actionForm.detail.trim() || !canEdit()) {
      debugLog('Action validation failed', {
        hasType: !!actionForm.action_type_id,
        hasDetail: !!actionForm.detail.trim(),
        canEdit: canEdit()
      })
      setError('Please fill in Action Type and Details')
      return
    }

    setActionLoading(true)
    const token = getStoredToken()
    const incidentId = safe(incident.id)

    const actionData = {
      incident_id: parseInt(incidentId),
      action_type_id: parseInt(actionForm.action_type_id),
      action_status_id: parseInt(actionForm.action_status_id) || 1, // Default to Pending
      action_priority_id: parseInt(actionForm.action_priority_id) || 2, // Default to Medium
      raised: actionForm.raised || new Date().toISOString().split('T')[0],
      complete: actionForm.complete ? 1 : 0,
      detail: actionForm.detail.trim(),
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

        if (data.success !== false) {
          setSuccess('Action added successfully')
          setShowActionForm(false)
          resetActionForm()
          loadIncidentActions()
        } else {
          setError(data.message || 'Failed to add action')
        }
      } else {
        const errorText = await response.text()
        debugLog('Add action failed', { status: response.status, error: errorText })
        try {
          const errorData = JSON.parse(errorText)
          setError(errorData.message || 'Failed to add action')
        } catch {
          setError('Failed to add action')
        }
      }
    } catch (error) {
      debugLog('Add action error', error)
      setError('Failed to add action')
    } finally {
      setActionLoading(false)
    }
  }

  // Reset forms
  const resetActionForm = () => {
    setActionForm({
      action_type_id: '',
      action_status_id: '1',
      action_priority_id: '2',
      raised: new Date().toISOString().split('T')[0],
      detail: '',
      complete: false
    })
  }

  const resetEditForm = () => {
    setEditForm({
      action_type_id: '',
      action_status_id: '',
      action_priority_id: '',
      raised: '',
      detail: '',
      complete: false
    })
  }

  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return safe(dateString)
    }
  }

  // Initialize component
  useEffect(() => {
    loadIncidentActions()
  }, [incident?.id])

  return (
    <>
      {/* Edit Action Modal */}
      <Modal isOpen={showEditModal} toggle={() => setShowEditModal(false)} size="lg">
        <ModalHeader toggle={() => setShowEditModal(false)}>
          Edit Action
        </ModalHeader>
        <ModalBody>
          {editingAction && (
            <Form>
              <Row>
                <Col md={4}>
                  <FormGroup>
                    <Label>Action Type <span className="text-danger">*</span></Label>
                    <Input
                      type="select"
                      value={editForm.action_type_id}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        action_type_id: e.target.value
                      })}
                    >
                      <option value="">Select Action Type</option>
                      {actionTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name} - {type.description}
                        </option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <FormGroup>
                    <Label>Status</Label>
                    <Input
                      type="select"
                      value={editForm.action_status_id}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        action_status_id: e.target.value
                      })}
                    >
                      <option value="">Select Status</option>
                      {actionStatuses.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.name} - {status.description}
                        </option>
                      ))}
                    </Input>
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <FormGroup>
                    <Label>Priority</Label>
                    <Input
                      type="select"
                      value={editForm.action_priority_id}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        action_priority_id: e.target.value
                      })}
                    >
                      <option value="">Select Priority</option>
                      {actionPriorities.map((priority) => (
                        <option key={priority.id} value={priority.id}>
                          {priority.name} - {priority.description}
                        </option>
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
                      value={editForm.raised}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        raised: e.target.value
                      })}
                    />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup className="d-flex align-items-center pt-4">
                    <Label className="d-flex align-items-center mb-0">
                      <Input
                        type="checkbox"
                        checked={editForm.complete}
                        onChange={(e) => setEditForm({
                          ...editForm,
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
                  rows="4"
                  value={editForm.detail}
                  onChange={(e) => setEditForm({
                    ...editForm,
                    detail: e.target.value
                  })}
                  placeholder="Describe the action to be taken in detail..."
                  maxLength={1000}
                />
                <small className="text-muted">{editForm.detail.length}/1000 characters</small>
              </FormGroup>
            </Form>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="success"
            onClick={updateAction}
            disabled={!editForm.action_type_id || !editForm.detail.trim() || actionLoading}
          >
            {actionLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" />
                Updating...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
          <Button color="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      <Card>
        <CardHeader className="d-flex justify-content-between align-items-center">
          <div>
            <h5>Incident Actions</h5>
          </div>
          {canEdit() && (
            <Button
              color="success"
              onClick={() => setShowActionForm(!showActionForm)}
            >
              {showActionForm ? 'Cancel' : 'Add Action'}
            </Button>
          )}
        </CardHeader>
        <CardBody>
          {/* Add Action Form */}
          {showActionForm && canEdit() && (
            <Card className="mb-4 border-success">
              <CardBody>
                <h6 className="mb-3">Add New Action</h6>
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
                        {actionTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name} - {type.description}
                          </option>
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
                        {actionStatuses.map((status) => (
                          <option key={status.id} value={status.id}>
                            {status.name} - {status.description}
                          </option>
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
                        {actionPriorities.map((priority) => (
                          <option key={priority.id} value={priority.id}>
                            {priority.name} - {priority.description}
                          </option>
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
                    <FormGroup className="d-flex align-items-center pt-4">
                      <Label className="d-flex align-items-center mb-0">
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
                    rows="4"
                    value={actionForm.detail}
                    onChange={(e) => setActionForm({
                      ...actionForm,
                      detail: e.target.value
                    })}
                    placeholder="Describe the action to be taken in detail..."
                    maxLength={1000}
                  />
                  <small className="text-muted">{actionForm.detail.length}/1000 characters</small>
                </FormGroup>
                <div className="d-flex gap-2">
                  <Button
                    color="success"
                    size="sm"
                    onClick={addAction}
                    disabled={!actionForm.action_type_id || !actionForm.detail.trim() || actionLoading}
                  >
                    {actionLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" />
                        Adding...
                      </>
                    ) : (
                      'Add Action'
                    )}
                  </Button>
                  <Button
                    color="success"
                    size="sm"
                    onClick={() => {
                      setShowActionForm(false)
                      resetActionForm()
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Actions Table */}
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 text-muted">Loading actions...</p>
            </div>
          ) : incidentActions.length > 0 ? (
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '30%' }}>Details</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Raised Date</th>
                    <th>Complete</th>
                    <th>Updated By</th>
                    {canEdit() && <th style={{ width: '100px' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {incidentActions.map((action: any) => {
                    const statusInfo = getActionStatusInfo(action.action_status_id)
                    const priorityInfo = getActionPriorityInfo(action.action_priority_id)

                    return (
                      <tr key={action.id} className={action.complete ? 'table-light' : ''}>
                        <td>
                          <div style={{ maxWidth: '300px', wordWrap: 'break-word' }}>
                            <div className="fw-medium mb-1">{safe(action.detail)}</div>
                            {action.created_at && (
                              <small className="text-muted">
                                Created: {formatDate(action.created_at)}
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          {getActionTypeName(action.action_type_id)}
                        </td>
                        <td>
                          {statusInfo.name}
                        </td>
                        <td>
                          {priorityInfo.name}
                        </td>
                        <td>
                          <small>{formatDate(action.raised)}</small>
                        </td>
                        <td>
                          <Badge
                            color={action.complete ? 'success' : 'secondary'}
                            className="p-2"
                          >
                            {action.complete ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td>
                          <small className="text-muted">
                            {getUserDisplayName(action.updated_by_id || action.created_by_id)}
                            {action.updated_at && (
                              <div>Updated: {formatDate(action.updated_at)}</div>
                            )}
                          </small>
                        </td>
                        {/* {canEdit() && (
                          <td>
                            <Button
                              color="success"
                              size="sm"
                              onClick={() => startEdit(action)}
                              title="Edit action"
                            >
                              Edit
                            </Button>
                          </td>
                        )} */}
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>
          ) : (
            <Alert color="none" className="mb-0">
              <div className="text-center py-4">
                <h6>📭 No Actions Found</h6>
                <p className="mb-0">No actions have been recorded for this incident yet.</p>
              </div>
            </Alert>
          )}
        </CardBody>
      </Card>
    </>
  )
}

export default ActionsTab
