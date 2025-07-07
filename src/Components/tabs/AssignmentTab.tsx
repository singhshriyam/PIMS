'use client'
import React, { useState, useEffect } from 'react'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
  Badge,
  Alert
} from 'reactstrap'
import { getStoredToken } from '../../app/(MainBody)/services/userService'

interface AssignmentTabProps {
  incident: any
  userType?: string
  currentUser: any
  hasFullAccess: boolean
  isFieldEngineer: boolean
  setError: (error: string | null) => void
  setSuccess: (success: string | null) => void
}

const API_BASE_URL = 'https://apexwpc.apextechno.co.uk/api'

const AssignmentTab: React.FC<AssignmentTabProps> = ({
  incident,
  currentUser,
  hasFullAccess,
  isFieldEngineer,
  setError,
  setSuccess
}) => {
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedAssignee, setSelectedAssignee] = useState('')
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [assignmentLogs, setAssignmentLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Available teams/roles for assignment
  const availableTeams = [
    { value: 'handler', label: 'Incident Handler' },
    { value: 'field', label: 'Field Engineer', description: 'Field engineers and technicians' },
    { value: 'expert', label: 'Expert Team', description: 'Subject matter experts' },
  ]

  // Fetch users for assignment
  const fetchUsers = async () => {
    const token = getStoredToken()
    if (!token) return

    try {
      setLoadingUsers(true)
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        const userList = result.data || []

        // Filter users based on current user's role permissions
        const userTeam = currentUser?.team_name?.toLowerCase() || ''
        let assignableRoles: string[] = []

        if (userTeam.includes('handler') || userTeam.includes('admin')) {
          assignableRoles = ['handler', 'field', 'engineer', 'expert', 'admin']
        } else if (userTeam.includes('manager')) {
          assignableRoles = ['handler', 'field', 'engineer', 'expert']
        } else if (userTeam.includes('field') || userTeam.includes('engineer')) {
          assignableRoles = ['handler', 'field', 'engineer', 'expert']
        }

        const processedUsers = userList
          .filter((user: any) => {
            if (!user.first_name || user.id === currentUser?.id) return false
            const userTeamName = (user.team_name || '').toLowerCase()
            return assignableRoles.some(role => userTeamName.includes(role))
          })
          .map((user: any) => ({
            id: user.id,
            name: `${user.first_name} ${user.last_name || ''}`.trim(),
            email: user.email,
            team: user.team_name,
            teamKey: getTeamKey(user.team_name)
          }))

        setUsers(processedUsers)

        // If a team is already selected, filter immediately
        if (selectedTeam) {
          filterUsersByTeam(selectedTeam, processedUsers)
        }
      }
    } catch (error) {
      setError('Failed to load users')
    } finally {
      setLoadingUsers(false)
    }
  }

  // Get team key from team name
  const getTeamKey = (teamName: string): string => {
    const team = (teamName || '').toLowerCase()
    if (team.includes('handler')) return 'handler'
    if (team.includes('field')) return 'field'
    if (team.includes('engineer')) return 'engineer'
    if (team.includes('expert')) return 'expert'
    if (team.includes('admin')) return 'admin'
    return 'other'
  }

  // Filter users by selected team
  const filterUsersByTeam = (teamKey: string, userList = users) => {
    if (!teamKey) {
      setFilteredUsers([])
      setSelectedAssignee('')
      return
    }

    const filtered = userList.filter(user => user.teamKey === teamKey)
    setFilteredUsers(filtered)
    setSelectedAssignee('') // Reset assignee when team changes
  }

  // Handle team selection
  const handleTeamChange = (teamKey: string) => {
    setSelectedTeam(teamKey)
    filterUsersByTeam(teamKey)
  }

  // Fetch assignment logs
  const fetchAssignmentLogs = async () => {
    const token = getStoredToken()
    if (!token || !incident) return

    try {
      setLoadingLogs(true)
      const formData = new FormData()
      formData.append('incident_id', incident.id.toString())

      const response = await fetch(`${API_BASE_URL}/incident-handler/incident-assignment/${incident.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          // Convert single assignment to array format for consistency
          setAssignmentLogs([result.data])
        } else {
          setAssignmentLogs([])
        }
      }
    } catch (error) {
      console.warn('Failed to fetch assignment logs:', error)
      setAssignmentLogs([])
    } finally {
      setLoadingLogs(false)
    }
  }

  // Handle assignment
  const handleAssign = async () => {
    if (!selectedTeam || !selectedAssignee || !incident) {
      setError('Please select both team and assignee')
      return
    }

    const token = getStoredToken()
    if (!token) {
      setError('Authentication required')
      return
    }

    try {
      setAssigning(true)
      setError(null)

      const assignmentData = {
        user_id: currentUser.id,
        incident_id: parseInt(incident.id.toString()),
        from: currentUser.id,
        to: parseInt(selectedAssignee),
        notes: assignmentNotes.trim() || null
      }

      const response = await fetch(`${API_BASE_URL}/incident-handler/assign-incident`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(assignmentData)
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success !== false) {
          const selectedUser = filteredUsers.find(u => u.id.toString() === selectedAssignee)
          const selectedTeamInfo = availableTeams.find(t => t.value === selectedTeam)

          setSuccess(`Incident successfully assigned to ${selectedUser?.name || 'user'} (${selectedTeamInfo?.label || 'team'})`)

          // Reset form
          setSelectedTeam('')
          setSelectedAssignee('')
          setAssignmentNotes('')
          setFilteredUsers([])

          // Refresh logs
          fetchAssignmentLogs()
        } else {
          setError(result.message || 'Assignment failed')
        }
      } else {
        const errorText = await response.text()
        try {
          const errorData = JSON.parse(errorText)
          setError(errorData.message || 'Assignment failed')
        } catch {
          setError('Assignment request failed')
        }
      }
    } catch (error) {
      setError('Failed to assign incident')
    } finally {
      setAssigning(false)
    }
  }

  useEffect(() => {
    if (hasFullAccess || isFieldEngineer) {
      fetchUsers()
      fetchAssignmentLogs()
    }
  }, [hasFullAccess, isFieldEngineer, incident])

  if (!hasFullAccess && !isFieldEngineer) {
    return (
      <Card>
        <CardHeader>
          <h5>Assignment Management</h5>
        </CardHeader>
        <CardBody>
          <div className="text-center py-4">
            <h6>Access Restricted</h6>
            <p className="text-muted">You don't have permission to manage incident assignments.</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <div>
      {/* Assignment Form */}
      <Card className="mb-4">
        <CardHeader>
          <h5>Assign Incident</h5>
        </CardHeader>
        <CardBody>
          <Form>
            <FormGroup>
              <Label>🏢 Select Team/Role *</Label>
              {loadingUsers ? (
                <div className="text-center p-3">
                  <div className="spinner-border spinner-border-sm me-2"></div>
                  Loading teams...
                </div>
              ) : (
                <Input
                  type="select"
                  value={selectedTeam}
                  onChange={(e) => handleTeamChange(e.target.value)}
                >
                  <option value="">Select a team...</option>
                  {availableTeams.map(team => (
                    <option key={team.value} value={team.value}>
                      {team.label} - {team.description}
                    </option>
                  ))}
                </Input>
              )}
            </FormGroup>

            <FormGroup>
              <Label>👤 Select Assignee *</Label>
              {!selectedTeam ? (
                <Input type="select" disabled>
                  <option>Please select a team first</option>
                </Input>
              ) : filteredUsers.length === 0 ? (
                <Input type="select" disabled>
                  <option>No users available in selected team</option>
                </Input>
              ) : (
                <Input
                  type="select"
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                >
                  <option value="">Select an assignee...</option>
                  {filteredUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </Input>
              )}
              {selectedTeam && filteredUsers.length > 0 && (
                <small className="text-muted">
                  {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} available in {availableTeams.find(t => t.value === selectedTeam)?.label}
                </small>
              )}
            </FormGroup>

            <FormGroup>
              <Label>📝 Assignment Notes (Optional)</Label>
              <Input
                type="textarea"
                rows={3}
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
                placeholder="Add any notes about this assignment..."
                maxLength={500}
              />
              <small className="text-muted">{assignmentNotes.length}/500 characters</small>
            </FormGroup>

            <Button
              color="primary"
              onClick={handleAssign}
              disabled={!selectedTeam || !selectedAssignee || assigning || loadingUsers}
            >
              {assigning ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Assigning...
                </>
              ) : (
                'Assign Incident'
              )}
            </Button>
          </Form>
        </CardBody>
      </Card>

      {/* Assignment Logs */}
      {/* <Card>
        <CardHeader>
          <h5>📋 Assignment History</h5>
        </CardHeader>
        <CardBody>
          {loadingLogs ? (
            <div className="text-center p-3">
              <div className="spinner-border spinner-border-sm me-2"></div>
              Loading assignment history...
            </div>
          ) : assignmentLogs.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <p>No assignment history found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Assigned To</th>
                    <th>Assigned By</th>
                    <th>Team</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignmentLogs.map((log, index) => (
                    <tr key={index}>
                      <td>
                        <div className="fw-medium">{log.assignee_name || 'Unknown'}</div>
                        <small className="text-muted">{log.assignee_email}</small>
                      </td>
                      <td>{log.assigner_name || 'Unknown'}</td>
                      <td>
                        <Badge color="info">{log.assignee_team || 'Unknown'}</Badge>
                      </td>
                      <td>
                        <small>{log.created_at ? new Date(log.created_at).toLocaleDateString() : 'Unknown'}</small>
                      </td>
                      <td>
                        <Badge color="success">Active</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card> */}
    </div>
  )
}

export default AssignmentTab
