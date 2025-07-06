'use client'
import React, { useState, useEffect } from 'react'
import { Alert, Card, CardBody, CardHeader, Badge } from 'reactstrap'
import { getStoredToken } from '../../app/(MainBody)/services/userService'

interface HistoryTabProps {
  incident: any
  masterData: any
  setError: (error: string | null) => void
  safe: (value: any) => string
}

const API_BASE = 'https://apexwpc.apextechno.co.uk/api'

const HistoryTab: React.FC<HistoryTabProps> = ({
  incident,
  masterData,
  setError,
  safe
}) => {
  const [loading, setLoading] = useState(false)
  const [incidentHistory, setIncidentHistory] = useState<any[]>([])

  const debugLog = (action: string, data?: any) => {
    console.log(`[HistoryTab] ${action}:`, data)
  }

  // Get user display name
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

  // Get lookup value by ID with proper name resolution
  const getLookupDisplayValue = (lookupArray: any[], id: any, nameField = 'name'): string => {
    if (!id || !lookupArray || lookupArray.length === 0) return ''

    const item = lookupArray.find(item => item.id === parseInt(id.toString()))
    if (!item) return ''

    // Try different name fields based on the type of lookup
    if (nameField === 'site') {
      return item.name || item.premises || item.street || item.locality || `Site ${id}`
    } else if (nameField === 'asset') {
      return item.name || item.description || item.asset_name || `Asset ${id}`
    } else {
      return item.name || item[nameField] || `${nameField} ${id}`
    }
  }

  // Parse and format only actual changes from history (avoid duplicates)
  const parseActualChanges = (historyItem: any, previousItem?: any): Array<{ field: string, newValue: string }> => {
    const changes: Array<{ field: string, newValue: string }> = []

    // Define field mappings for better display - only show summary, description, category and notes
    const fieldMappings: Record<string, { label: string, lookup?: any[], lookupType?: string }> = {
      'short_description': { label: 'Summary' },
      'description': { label: 'Description' },
      'category_id': { label: 'Category', lookup: masterData?.categories },
      'narration': { label: 'Notes' }
    }

    // Only show fields that actually have meaningful values and represent changes
    Object.keys(fieldMappings).forEach(field => {
      const mapping = fieldMappings[field]

      // Check if this field exists and has a meaningful value
      if (historyItem.hasOwnProperty(field) &&
          historyItem[field] !== null &&
          historyItem[field] !== '' &&
          historyItem[field] !== undefined) {

        let newValue = historyItem[field]

        // Use lookup arrays to get display values
        if (mapping.lookup && mapping.lookup.length > 0) {
          const displayValue = getLookupDisplayValue(mapping.lookup, historyItem[field], mapping.lookupType)
          if (displayValue) {
            newValue = displayValue
          }
        }

        // Skip if it's the same as the previous entry (avoid duplicates)
        if (previousItem && previousItem[field] === historyItem[field]) {
          return
        }

        changes.push({
          field: mapping.label,
          newValue: newValue.toString()
        })
      }
    })

    return changes
  }

  // Load incident history
  const loadIncidentHistory = async () => {
    setLoading(true)
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
          // Sort by created_at in descending order (newest first)
          // But ensure Creation (type 0) always appears last regardless of timestamp
          const sortedHistory = (data.data || []).sort((a: any, b: any) => {
            // Creation events (type 0) should always be at the bottom
            if (a.type === 0 && b.type !== 0) return 1  // a goes after b
            if (b.type === 0 && a.type !== 0) return -1 // b goes after a
            if (a.type === 0 && b.type === 0) {
              // If both are creation events, sort by date (oldest first)
              const dateA = new Date(a.created_at || a.updated_at || 0).getTime()
              const dateB = new Date(b.created_at || b.updated_at || 0).getTime()
              return dateA - dateB
            }

            // For all other events, sort by date (newest first)
            const dateA = new Date(a.created_at || a.updated_at || 0).getTime()
            const dateB = new Date(b.created_at || b.updated_at || 0).getTime()
            return dateB - dateA // Descending order (newest first)
          })

          setIncidentHistory(sortedHistory)
          debugLog('History loaded and sorted', sortedHistory.length)
        } else {
          setIncidentHistory([])
          debugLog('No history found', data)
        }
      } else {
        const errorText = await response.text()
        debugLog('History request failed', { status: response.status, error: errorText })
        setIncidentHistory([])
        if (response.status >= 500 || response.status === 401 || response.status === 403) {
          setError('Failed to load incident history')
        }
      }
    } catch (error) {
      debugLog('History fetch error', error)
      setIncidentHistory([])
      setError('Failed to load incident history')
    } finally {
      setLoading(false)
    }
  }

  // Get activity info for timeline
  const getActivityInfo = (historyItem: any, index: number, allHistory: any[]) => {
    const activity = {
      type: 'Unknown',
      color: 'secondary',
      icon: '📝',
      title: 'Activity',
      details: [] as string[]
    }

    // Get the previous item for comparison (next in array since sorted newest first)
    const previousItem = allHistory[index + 1]

    // Parse only actual changes (avoiding duplicates)
    const changes = parseActualChanges(historyItem, previousItem)

    // Determine activity type
    if (historyItem.type === 0) {
      activity.type = 'Created'
      activity.color = 'success'
      activity.icon = '🆕'
      activity.title = 'Incident Created'
    } else if (historyItem.type === 1) {
      activity.type = 'Updated'
      activity.color = 'warning'
      activity.icon = '✏️'
      activity.title = 'Incident Updated'
    } else if (historyItem.type === 2) {
      activity.type = 'Assigned'
      activity.color = 'info'
      activity.icon = '👤'
      activity.title = 'Incident Assigned'
    } else if (historyItem.type === 3) {
      activity.type = 'Resolved'
      activity.color = 'success'
      activity.icon = '✅'
      activity.title = 'Incident Resolved'
    } else if (historyItem.type === 4) {
      activity.type = 'Closed'
      activity.color = 'dark'
      activity.icon = '🔒'
      activity.title = 'Incident Closed'
    }

    // Add field changes to details (only show what actually changed)
    changes.forEach(change => {
      activity.details.push(`${change.field}: ${change.newValue}`)
    })

    // Add specific resolution fields
    if (historyItem.root_cause_analysis && historyItem.root_cause_analysis.trim()) {
      activity.details.push(`Root Cause Analysis: ${safe(historyItem.root_cause_analysis)}`)
    }
    if (historyItem.conclusion && historyItem.conclusion.trim()) {
      activity.details.push(`Resolution: ${safe(historyItem.conclusion)}`)
    }

    // For creation events, always show basic info even if no field changes detected
    if (historyItem.type === 0 && activity.details.length === 0) {
      if (historyItem.short_description) {
        activity.details.push(`Initial Summary: ${safe(historyItem.short_description)}`)
      }
      if (historyItem.description) {
        activity.details.push(`Initial Description: ${safe(historyItem.description)}`)
      }
    }

    // For assignment events, try to show assignment details
    if (historyItem.type === 2) {
      // Look for assignment-related information
      if (historyItem.assigned_to_name) {
        activity.details.push(`Assigned To: ${historyItem.assigned_to_name}`)
      }
      if (historyItem.assigned_by_name) {
        activity.details.push(`Assigned By: ${historyItem.assigned_by_name}`)
      }
    }

    return activity
  }

  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        // hour: '2-digit',
        // minute: '2-digit',
        // hour12: false
      })
    } catch {
      return safe(dateString)
    }
  }

  // Load history on component mount
  useEffect(() => {
    loadIncidentHistory()
  }, [incident?.id])

  return (
    <Card>
      <CardHeader>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5>Incident Activity History</h5>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {loading ? (
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Loading incident history...</p>
          </div>
        ) : incidentHistory.length > 0 ? (
          <div className="timeline">
            {incidentHistory.map((history: any, index: number) => {
              const activityInfo = getActivityInfo(history, index, incidentHistory)
              const isLast = index === incidentHistory.length - 1

              return (
                <div key={history.id || index} className="timeline-item mb-4 position-relative">
                  {/* Timeline connector line */}
                  {!isLast && (
                    <div
                      className="position-absolute bg-light"
                      style={{
                        width: '2px',
                        height: '100%',
                        left: '19px',
                        top: '40px',
                        zIndex: 1
                      }}
                    ></div>
                  )}

                  <div className="d-flex">
                    <div className="flex-shrink-0 position-relative" style={{ zIndex: 2 }}>
                      <div
                        className={`rounded-circle d-flex align-items-center justify-content-center bg-${activityInfo.color} text-white shadow`}
                        style={{ width: '40px', height: '40px' }}
                        title={activityInfo.type}
                      >
                        <span style={{ fontSize: '16px' }}>{activityInfo.icon}</span>
                      </div>
                    </div>

                    <div className="flex-grow-1 ms-3">
                      <div className="card border-0 shadow-sm">
                        <div className="card-header bg-light d-flex justify-content-between align-items-center">
                          <h6 className="mb-0">
                            <Badge color={activityInfo.color} className="me-2 p-2">
                              {activityInfo.type}
                            </Badge>
                            {activityInfo.title}
                          </h6>
                          <div className="text-end">
                            <small className="text-muted fw-bold d-block">
                              {formatDate(history.created_at || history.updated_at)}
                            </small>
                          </div>
                        </div>

                        <div className="card-body">
                          <div className="row mb-3">
                            <div className="col-md-6">
                              <strong>Updated By:</strong>
                              <span className="ms-1 text-primary fw-medium">
                                {getUserDisplayName(history.updated_by_id) || safe(history.updated_by_name) || 'System'}
                              </span>
                            </div>
                          </div>

                          {activityInfo.details.length > 0 ? (
                            <div className="mt-3">
                              <strong>Changes Made:</strong>
                              <div className="mt-2">
                                {activityInfo.details.map((detail, idx) => (
                                  <div key={idx} className="mb-2 ps-3 border-start border-3 border-light bg-light rounded-end p-2">
                                    <small className="text-dark">
                                      <strong>•</strong> {detail}
                                    </small>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3">
                              <div className="ps-3 border-start border-3 border-secondary bg-light rounded-end p-2">
                                <small className="text-muted fst-italic">
                                  No specific changes recorded for this activity
                                </small>
                              </div>
                            </div>
                          )}

                          <div className="mt-3 d-flex flex-wrap gap-2">
                            <Badge
                              color={history.is_approved ? 'success' : 'secondary'}
                              className="d-flex align-items-center p-2"
                            >
                              {history.is_approved ? 'Approved' : 'Pending Approval'}
                            </Badge>

                            {history.approved_at && (
                              <Badge color="info" className="d-flex align-items-center p-2">
                                Approved: {formatDate(history.approved_at)}
                              </Badge>
                            )}

                            {history.is_email && (
                              <Badge color="primary" className="d-flex align-items-center p-2">
                                Email Notification Sent
                              </Badge>
                            )}
                          </div>

                          {/* Additional metadata */}
                          {(history.priority_changed || history.status_changed || history.assigned_to_changed) && (
                            <div className="mt-3 pt-2 border-top">
                              <small className="text-muted">
                                <strong>System Changes:</strong>
                                {history.priority_changed && ' Priority Updated,'}
                                {history.status_changed && ' Status Changed,'}
                                {history.assigned_to_changed && ' Assignment Modified'}
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
            <div className="text-center py-4">
              <h6>📜 No History Available</h6>
              <p className="mb-0">No activity history has been recorded for this incident yet.</p>
            </div>
          </Alert>
        )}
      </CardBody>
    </Card>
  )
}

export default HistoryTab
