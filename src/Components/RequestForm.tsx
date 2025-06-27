// Components/RequestForm.tsx
'use client'
import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Card, CardBody, Button, Form, FormGroup, Label, Input, Alert } from 'reactstrap'
import { getCurrentUser } from '../app/(MainBody)/services/userService'
import * as masterService from '../app/(MainBody)/services/masterService'

interface RequestFormProps {
  onBack?: () => void
  userType?: string
  initialView?: 'form' | 'status'
}

const RequestForm: React.FC<RequestFormProps> = ({ onBack, initialView = 'form' }) => {
  const [view, setView] = useState(initialView)
  const [loading, setLoading] = useState(false)
  const [masterData, setMasterData] = useState<any>({})
  const [requests, setRequests] = useState<any[]>([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    masterType: '',
    itemId: '',
    requestType: '',
    priority: 'Medium'
  })
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  const user = getCurrentUser()
  const requestTypes = ['New Entry Creation', 'Data Modification', 'Data Deletion', 'Access Request', 'Configuration Change', 'Other']

  // Dynamic master data types - no hardcoding!
  const masterTypes = [
    { key: 'categories', label: 'Categories', fetch: masterService.fetchCategories },
    { key: 'subcategories', label: 'Sub-Categories', fetch: masterService.fetchSubcategories },
    { key: 'contactTypes', label: 'Contact Types', fetch: masterService.fetchContactTypes },
    { key: 'impacts', label: 'Impact Levels', fetch: masterService.fetchImpacts },
    { key: 'urgencies', label: 'Urgency Levels', fetch: masterService.fetchUrgencies },
    { key: 'incidentStates', label: 'Incident States', fetch: masterService.fetchIncidentStates },
    { key: 'assets', label: 'Assets', fetch: masterService.fetchAssets },
    { key: 'sites', label: 'Sites', fetch: masterService.fetchSites },
    { key: 'actionTypes', label: 'Action Types', fetch: masterService.fetchActionTypes },
    { key: 'actionStatuses', label: 'Action Statuses', fetch: masterService.fetchActionStatuses },
    { key: 'actionPriorities', label: 'Action Priorities', fetch: masterService.fetchActionPriorities },
    { key: 'roles', label: 'Roles', fetch: masterService.fetchRoles }
  ]

  useEffect(() => {
    loadUserRequests()
  }, [])

  useEffect(() => {
    if (form.masterType) {
      loadMasterData(form.masterType)
    }
  }, [form.masterType])

  const loadMasterData = async (type: string) => {
    const masterType = masterTypes.find(m => m.key === type)
    if (!masterType) return

    try {
      const result = await masterType.fetch()
      setMasterData((prev: typeof masterData) => ({ ...prev, [type]: result.data || [] }))
    } catch (error) {
      console.warn(`Failed to load ${type}:`, error)
    }
  }

  const loadUserRequests = () => {
    const stored = localStorage.getItem(`user_requests_${user?.id}`)
    setRequests(stored ? JSON.parse(stored) : [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.description || !form.masterType || !form.requestType) {
      setMessage({ type: 'error', text: 'Please fill all required fields' })
      return
    }

    setLoading(true)

    const request = {
      id: `REQ-${Date.now()}`,
      ...form,
      status: 'Pending',
      requestedBy: { name: user?.name, email: user?.email, team: user?.team },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Save request
    const userRequests = [...requests, request]
    localStorage.setItem(`user_requests_${user?.id}`, JSON.stringify(userRequests))

    const allRequests = JSON.parse(localStorage.getItem('all_requests') || '[]')
    localStorage.setItem('all_requests', JSON.stringify([request, ...allRequests]))

    setRequests(userRequests)
    setMessage({ type: 'success', text: 'Request submitted successfully!' })
    setForm({ title: '', description: '', masterType: '', itemId: '', requestType: '', priority: 'Medium' })
    setLoading(false)

    setTimeout(() => {
      setView('status')
      setMessage(null)
    }, 1500)
  }

  const getItemName = (itemId: string) => {
    if (!form.masterType || !masterData[form.masterType]) return itemId
    const item = masterData[form.masterType].find((i: any) => i.id == itemId)
    return item?.name || item?.title || item?.display_name || itemId
  }

  if (view === 'status') {
    return (
      <Container fluid>
        <Card>
          <CardBody>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5>My Requests</h5>
              <div>
                <Button color="primary" size="sm" onClick={() => setView('form')} className="me-2">
                  + New Request
                </Button>
                {onBack && <Button color="outline-secondary" size="sm" onClick={onBack}>← Back</Button>}
              </div>
            </div>

            {requests.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted">No requests submitted yet</p>
                <Button color="primary" onClick={() => setView('form')}>Submit First Request</Button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map(req => (
                      <tr key={req.id}>
                        <td className="text-primary fw-bold">{req.id}</td>
                        <td>{req.title}</td>
                        <td>{req.requestType}</td>
                        <td>
                          <span className={`badge bg-${
                            req.status === 'Approved' ? 'success' :
                            req.status === 'Rejected' ? 'danger' : 'secondary'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </Container>
    )
  }

  return (
    <Container fluid>
      <Card>
        <CardBody>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5>Submit Request</h5>
            <div>
              <Button color="outline-secondary" size="sm" onClick={() => setView('status')} className="me-2">
                My Requests
              </Button>
              {onBack && <Button color="outline-primary" size="sm" onClick={onBack}>← Back</Button>}
            </div>
          </div>

          {message && (
            <Alert color={message.type === 'error' ? 'danger' : 'success'}>
              {message.text}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label>Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({...form, title: e.target.value})}
                    placeholder="Request title"
                    required
                  />
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Priority</Label>
                  <Input
                    type="select"
                    value={form.priority}
                    onChange={(e) => setForm({...form, priority: e.target.value})}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </Input>
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label>Master Data Type *</Label>
                  <Input
                    type="select"
                    value={form.masterType}
                    onChange={(e) => setForm({...form, masterType: e.target.value, itemId: ''})}
                    required
                  >
                    <option value="">Select Type</option>
                    {masterTypes.map(type => (
                      <option key={type.key} value={type.key}>{type.label}</option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label>Request Type *</Label>
                  <Input
                    type="select"
                    value={form.requestType}
                    onChange={(e) => setForm({...form, requestType: e.target.value})}
                    required
                  >
                    <option value="">Select Request Type</option>
                    {requestTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
            </Row>

            {form.masterType && form.requestType !== 'New Entry Creation' && (
              <FormGroup>
                <Label>Specific Item</Label>
                <Input
                  type="select"
                  value={form.itemId}
                  onChange={(e) => setForm({...form, itemId: e.target.value})}
                >
                  <option value="">Select Item</option>
                  {(masterData[form.masterType] || []).map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.name || item.title || item.display_name || `Item ${item.id}`}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            )}

            <FormGroup>
              <Label>Description *</Label>
              <Input
                type="textarea"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
                placeholder="Describe your request in detail..."
                required
              />
            </FormGroup>

            <div className="d-flex justify-content-end gap-2">
              <Button type="button" color="secondary" onClick={() => setView('status')}>
                Cancel
              </Button>
              <Button type="submit" color="primary" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>
    </Container>
  )
}

export default RequestForm
