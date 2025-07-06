'use client'
import React, { useState, useEffect } from 'react'
import {
  Row, Col, Alert, Card, CardBody, CardHeader, Badge, Input, FormGroup, Label, Button,
  Modal, ModalHeader, ModalBody, ModalFooter
} from 'reactstrap'
import { getStoredToken } from '../../app/(MainBody)/services/userService'

interface KnowledgeTabProps {
  incident: any
  masterData: any
  setError: (error: string | null) => void
  safe: (value: any) => string
}

const API_BASE = 'https://apexwpc.apextechno.co.uk/api'

const KnowledgeTab: React.FC<KnowledgeTabProps> = ({
  incident,
  masterData,
  setError,
  safe
}) => {
  const [loading, setLoading] = useState(false)
  const [knowledgeBase, setKnowledgeBase] = useState<any[]>([])
  const [searchFilters, setSearchFilters] = useState({
    category_id: '',
    subcategory_id: '',
    status: '',
    searchTerm: ''
  })
  const [filteredKnowledge, setFilteredKnowledge] = useState<any[]>([])
  const [selectedIncident, setSelectedIncident] = useState<any>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  // Load knowledge base data
  const loadKnowledgeBase = async (categoryId?: string, subcategoryId?: string) => {
    const targetCategoryId = categoryId || incident?.category_id

    if (!targetCategoryId) {
      setKnowledgeBase([])
      setFilteredKnowledge([])
      return
    }

    setLoading(true)
    const token = getStoredToken()

    try {
      const requestData = {
        category_id: parseInt(targetCategoryId),
        subcategory_id: subcategoryId ? parseInt(subcategoryId) : (incident.subcategory_id ? parseInt(incident.subcategory_id) : null)
      }

      const response = await fetch(`${API_BASE}/incident-handler/knowledge-base`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const data = await response.json()

        if (data.success && data.data) {
          // API already returns complete category and subcategory objects with names
          setKnowledgeBase(data.data || [])
          setFilteredKnowledge(data.data || [])
        } else {
          setKnowledgeBase([])
          setFilteredKnowledge([])
        }
      } else {
        setKnowledgeBase([])
        setFilteredKnowledge([])
        if (response.status >= 500 || response.status === 401 || response.status === 403) {
          setError('Failed to load knowledge base')
        }
      }
    } catch (error) {
      setKnowledgeBase([])
      setFilteredKnowledge([])
      setError('Failed to load knowledge base')
    } finally {
      setLoading(false)
    }
  }

  // // Get status badge color
  // const getStatusColor = (status: string): string => {
  //   const statusLower = status?.toLowerCase() || ''
  //   if (statusLower.includes('resolved') || statusLower.includes('closed')) return 'success'
  //   if (statusLower.includes('progress') || statusLower.includes('active')) return 'warning'
  //   if (statusLower.includes('new') || statusLower.includes('open')) return 'primary'
  //   return 'secondary'
  // }

  // // Get priority color
  // const getPriorityColor = (priority: string): string => {
  //   const priorityLower = priority?.toLowerCase() || ''
  //   if (priorityLower.includes('high') || priorityLower.includes('urgent') || priorityLower.includes('critical')) return 'danger'
  //   if (priorityLower.includes('medium') || priorityLower.includes('normal')) return 'warning'
  //   if (priorityLower.includes('low')) return 'info'
  //   return 'secondary'
  // }

  // Calculate similarity score (enhanced implementation)
  const calculateSimilarity = (knowledgeItem: any): number => {
    let score = 0

    // Category match (highest weight)
    if (knowledgeItem.category_id === incident?.category_id) {
      score += 40
    }

    // Subcategory match
    if (knowledgeItem.subcategory_id === incident?.subcategory_id && incident?.subcategory_id) {
      score += 20
    }

    // Description similarity (basic keyword matching)
    const incidentDesc = (incident?.short_description || '' + ' ' + incident?.description || '').toLowerCase()
    const knowledgeDesc = (knowledgeItem.short_description || '' + ' ' + knowledgeItem.description || '').toLowerCase()

    if (incidentDesc && knowledgeDesc) {
      const incidentWords = incidentDesc.split(' ').filter((word: string) => word.length > 3)
      const matchingWords = incidentWords.filter((word: string) => knowledgeDesc.includes(word))
      if (incidentWords.length > 0) {
        score += (matchingWords.length / incidentWords.length) * 30
      }
    }

    // Recent incidents get slight boost
    if (knowledgeItem.created_at) {
      const daysSinceCreated = (Date.now() - new Date(knowledgeItem.created_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceCreated < 30) score += 5
      if (daysSinceCreated < 7) score += 3
    }

    // Resolved incidents get slight boost as they have solutions
    if (knowledgeItem.status?.toLowerCase().includes('resolved') || knowledgeItem.status?.toLowerCase().includes('closed')) {
      score += 5
    }

    return Math.round(score)
  }

  // Filter and sort knowledge base
  const applyFilters = () => {
    let filtered = [...knowledgeBase]

    // Apply search term filter
    if (searchFilters.searchTerm) {
      const term = searchFilters.searchTerm.toLowerCase()
      filtered = filtered.filter((item: any) =>
        item.short_description?.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.incident_no?.toLowerCase().includes(term) ||
        item.category?.name?.toLowerCase().includes(term) ||
        item.subcategory?.name?.toLowerCase().includes(term)
      )
    }

    // Apply status filter
    if (searchFilters.status) {
      filtered = filtered.filter((item: any) =>
        item.status?.toLowerCase() === searchFilters.status.toLowerCase()
      )
    }

    // Sort by similarity score
    filtered = filtered
      .map((item: any) => ({
        ...item,
        similarityScore: calculateSimilarity(item)
      }))
      .sort((a, b) => b.similarityScore - a.similarityScore)

    setFilteredKnowledge(filtered)
  }

  // Handle filter changes
  const handleFilterChange = (field: string, value: string) => {
    setSearchFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Show incident details modal
  const showIncidentDetails = (knowledgeItem: any) => {
    setSelectedIncident(knowledgeItem)
    setShowDetailsModal(true)
  }

  // Close details modal
  const closeDetailsModal = () => {
    setSelectedIncident(null)
    setShowDetailsModal(false)
  }

  // Load data when component mounts
  useEffect(() => {
    loadKnowledgeBase()
  }, [incident?.id])

  // Apply filters when filters or knowledge base changes
  useEffect(() => {
    applyFilters()
  }, [searchFilters, knowledgeBase])

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

  return (
    <>
      <Card>
        <CardHeader>
          <h5>Knowledge Base</h5>
        </CardHeader>
        <CardBody>
          {/* Search and Filter Controls */}
          <Row className="mb-4">
            <Col md={5}>
              <FormGroup>
                <Label>Search Description</Label>
                <Input
                  type="text"
                  placeholder="Search incident descriptions..."
                  value={searchFilters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                />
              </FormGroup>
            </Col>
            <Col md={5}>
              <FormGroup>
                <Label>Filter by Status</Label>
                <Input
                  type="select"
                  value={searchFilters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="new">New</option>
                  <option value="in progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </Input>
              </FormGroup>
            </Col>
            <Col md={2}>
              <FormGroup>
                <Label>&nbsp;</Label>
                <div>
                  <Button
                    color="primary"
                    size="sm"
                    onClick={() => loadKnowledgeBase()}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm" />
                    ) : (
                      'Refresh'
                    )}
                  </Button>
                </div>
              </FormGroup>
            </Col>
          </Row>

          {/* Results */}
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 text-muted">Searching knowledge base...</p>
            </div>
          ) : filteredKnowledge.length > 0 ? (
            <div>
              {/* Results Header */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">
                  Found {filteredKnowledge.length} similar incident{filteredKnowledge.length !== 1 ? 's' : ''}
                </h6>
                <small className="text-muted">
                  Sorted by relevance to current incident
                </small>
              </div>

              {/* Knowledge Base Cards */}
              <Row>
                {filteredKnowledge.map((knowledgeItem: any, index: number) => (
                  <Col md={6} lg={4} key={knowledgeItem.id} className="mb-4">
                    <Card className="h-100 border border-grey shadow-sm hover-shadow">
                      <CardBody>
                        {/* Header with incident number and similarity score */}
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <Badge color="info" className="me-2 p-2">
                            {safe(knowledgeItem.incident_no)}
                          </Badge>
                        </div>

                        {/* Description */}
                        <div className="mb-3">
                          <strong>Description:</strong>
                          <p className="text-muted mb-0 mt-1" style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                            {safe(knowledgeItem.short_description)}
                          </p>
                        </div>

                        {/* Category Information */}
                        <div className="mb-3">
                          <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                            <div><strong>Category:</strong> {knowledgeItem.category?.name || 'Unknown'}</div>
                            {knowledgeItem.subcategory?.name && (
                              <div><strong>Subcategory:</strong> {knowledgeItem.subcategory.name}</div>
                            )}
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="text-muted mb-3" style={{ fontSize: '0.8rem' }}>
                          <div><strong>Created:</strong> {formatDate(knowledgeItem.created_at)}</div>
                          {knowledgeItem.resolved_at && (
                            <div><strong>Resolved:</strong> {formatDate(knowledgeItem.resolved_at)}</div>
                          )}
                          {knowledgeItem.assigned_to_name && (
                            <div><strong>Handled by:</strong> {safe(knowledgeItem.assigned_to_name)}</div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="d-flex gap-2 mb-3">
                          <Button
                            color="success"
                            size="sm"
                            onClick={() => showIncidentDetails(knowledgeItem)}
                          >
                            View Details
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>
                ))}
              </Row>

              {/* Load More Button (if needed) */}
              {filteredKnowledge.length >= 6 && (
                <div className="text-center mt-4">
                  <Button color="outline-primary" onClick={() => loadKnowledgeBase()}>
                    🔍 Search for More Similar Incidents
                  </Button>
                </div>
              )}
            </div>
          ) : knowledgeBase.length === 0 ? (
            <Alert color="none">
              <div className="text-center py-4">
                <h6>💡 No Knowledge Base Found</h6>
                <p className="mb-2">No similar incidents found for this category.</p>
                <small className="text-muted">
                  Category: {incident?.category?.name || 'Unknown Category'}
                </small>
              </div>
            </Alert>
          ) : (
            <Alert color="warning">
              <div className="text-center py-3">
                <h6>🔍 No Results Found</h6>
                <p className="mb-0">No incidents match your current search criteria.</p>
                <Button
                  color="outline-warning"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setSearchFilters({
                      category_id: '',
                      subcategory_id: '',
                      status: '',
                      searchTerm: ''
                    })
                    loadKnowledgeBase()
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </Alert>
          )}
        </CardBody>
      </Card>

      {/* Incident Details Modal */}
      <Modal isOpen={showDetailsModal} toggle={closeDetailsModal} size="lg">
        <ModalHeader toggle={closeDetailsModal}>
          Incident Details - {selectedIncident?.incident_no}
        </ModalHeader>
        <ModalBody>
          {selectedIncident && (
            <div>
              {/* Header Info */}
              <Row className="mb-4">
                <Col md={12}>
                  <div className="mb-2">
                    <strong>Category:</strong> {selectedIncident.category?.name || 'Unknown'}
                  </div>
                  {selectedIncident.subcategory?.name && (
                    <div className="mb-2">
                      <strong>Subcategory:</strong> {selectedIncident.subcategory.name}
                    </div>
                  )}
                  <div className="mb-2">
                    <strong>Created:</strong> {formatDate(selectedIncident.created_at)}
                  </div>
                  {selectedIncident.resolved_at && (
                    <div className="mb-2">
                      <strong>Resolved:</strong> {formatDate(selectedIncident.resolved_at)}
                    </div>
                  )}
                </Col>
              </Row>

              {/* Description */}
              <div className="mb-4">
                <h6>Description</h6>
                <div className="p-3 bg-light rounded text-dark">
                  <div className="mb-3">
                    <strong>Summary:</strong>
                    <p className="mb-0 mt-1">{safe(selectedIncident.short_description)}</p>
                  </div>
                  {selectedIncident.description && (
                    <div>
                      <strong>Details:</strong>
                      <p className="mb-0 mt-1">{safe(selectedIncident.description)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Resolution */}
              {(selectedIncident.resolution || selectedIncident.conclusion) && (
                <div className="mb-4">
                  <h6>Resolution</h6>
                  <div className="p-3 bg-success bg-opacity-10 border border-success rounded">
                    <p className="mb-0">{safe(selectedIncident.resolution || selectedIncident.conclusion)}</p>
                  </div>
                </div>
              )}

              {/* Root Cause */}
              {selectedIncident.root_cause_analysis && (
                <div className="mb-4">
                  <h6>Root Cause Analysis</h6>
                  <div className="p-3 bg-info bg-opacity-10 border border-info rounded">
                    <p className="mb-0">{safe(selectedIncident.root_cause_analysis)}</p>
                  </div>
                </div>
              )}

              {/* Similarity Score */}
              {selectedIncident.similarityScore > 0 && (
                <div className="mb-4">
                  <h6>Similarity Analysis</h6>
                  <div className="p-3 bg-warning bg-opacity-10 border border-warning rounded">
                    <ul className="list-unstyled mb-0">
                      {selectedIncident.category?.name && selectedIncident.category_id === incident?.category_id && (
                        <li>✓ Same category ({selectedIncident.category.name})</li>
                      )}
                      {selectedIncident.subcategory?.name && selectedIncident.subcategory_id === incident?.subcategory_id && incident?.subcategory_id && (
                        <li>✓ Same subcategory ({selectedIncident.subcategory.name})</li>
                      )}
                      {selectedIncident.similarityScore > 20 && (
                        <li>✓ Similar description keywords</li>
                      )}
                      {selectedIncident.status?.toLowerCase().includes('resolved') && (
                        <li>✓ Has documented resolution</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={closeDetailsModal}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

export default KnowledgeTab
