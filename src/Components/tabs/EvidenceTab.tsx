'use client'
import React, { useState, useEffect } from 'react'
import {
  Row, Col, Button, Form, FormGroup, Label, Input, Table, Alert, Card, CardBody, CardHeader, Badge
} from 'reactstrap'
import { getStoredToken } from '../../app/(MainBody)/services/userService'

interface EvidenceTabProps {
  incident: any
  currentUser: any
  canEditEvidence: boolean
  isFieldEngineer: boolean
  setError: (error: string | null) => void
  setSuccess: (success: string | null) => void
  safe: (value: any) => string
}

const API_BASE = 'https://apexwpc.apextechno.co.uk/api'

const EvidenceTab: React.FC<EvidenceTabProps> = ({
  incident,
  currentUser,
  canEditEvidence,
  isFieldEngineer,
  setError,
  setSuccess,
  safe
}) => {
  const [evidencePhotos, setEvidencePhotos] = useState([])
  const [ammoniaReadings, setAmmoniaReadings] = useState([])
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [showReadingForm, setShowReadingForm] = useState(false)

  const [photoUpload, setPhotoUpload] = useState({
    file: null as File | null,
    description: ''
  })

  const [readingForm, setReadingForm] = useState({
    reading_value: '',
    reading_date: new Date().toISOString().split('T')[0], // Default to today
    location: ''
  })

  const [loading, setLoading] = useState({
    photos: false,
    readings: false
  })

  const [uploadLoading, setUploadLoading] = useState({
    photo: false,
    reading: false
  })

  // Enhanced reading types with better descriptions
  const readingTypes = [
    { value: 'upstream', label: 'Upstream Reading', description: 'Measurement taken upstream of the incident location' },
    { value: 'downstream', label: 'Downstream Reading', description: 'Measurement taken downstream of the incident location' },
    { value: 'source', label: 'Source Reading', description: 'Measurement at the source of the incident' },
    { value: 'ambient', label: 'Ambient Reading', description: 'Background/environmental measurement' }
  ]

  // Load evidence photos
  const loadEvidencePhotos = async () => {
    setLoading(prev => ({ ...prev, photos: true }))
    const token = getStoredToken()
    const incidentId = safe(incident.id)

    try {
      const response = await fetch(`${API_BASE}/incident-handler/incident-evidence-photo/${incidentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          // Sort photos by upload date (newest first)
          const sortedPhotos = (data.data || []).sort((a: any, b: any) => {
            const dateA = new Date(a.uploaded_date || a.created_at || 0).getTime()
            const dateB = new Date(b.uploaded_date || b.created_at || 0).getTime()
            return dateB - dateA
          })
          setEvidencePhotos(sortedPhotos)
        } else {
          setEvidencePhotos([])
        }
      } else {
        setEvidencePhotos([])
        if (response.status >= 500 || response.status === 401 || response.status === 403) {
          console.error('Failed to load evidence photos')
        }
      }
    } catch (error) {
      console.error('Failed to load evidence photos:', error)
      setEvidencePhotos([])
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('Network error - unable to load evidence photos')
      }
    } finally {
      setLoading(prev => ({ ...prev, photos: false }))
    }
  }

  // Upload evidence photo
  const uploadEvidencePhoto = async () => {
    if (!photoUpload.file || !canEditEvidence) {
      setError('Please select a file to upload')
      return
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(photoUpload.file.type)) {
      setError('Please select a valid image file (JPG, PNG, GIF, WEBP)')
      return
    }

    const maxSizeInMB = 10
    if (photoUpload.file.size > maxSizeInMB * 1024 * 1024) {
      setError(`File size must be less than ${maxSizeInMB}MB`)
      return
    }

    setUploadLoading(prev => ({ ...prev, photo: true }))
    const token = getStoredToken()
    const incidentId = safe(incident.id)

    const formData = new FormData()
    formData.append('incident_id', incidentId)
    formData.append('url', photoUpload.file)
    if (photoUpload.description.trim()) {
      formData.append('description', photoUpload.description.trim())
    }

    try {
      const response = await fetch(`${API_BASE}/incident-handler/evidence-photo`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (response.ok && data.success !== false) {
        setSuccess('Evidence photo uploaded successfully')
        setPhotoUpload({ file: null, description: '' })
        setShowPhotoUpload(false)
        loadEvidencePhotos()
      } else {
        const errorMsg = data.message || 'Upload failed'
        setError(errorMsg)
      }
    } catch (error) {
      setError('Failed to upload photo')
    } finally {
      setUploadLoading(prev => ({ ...prev, photo: false }))
    }
  }

  // Delete evidence photo
  const deleteEvidencePhoto = async (photoId: string) => {
    if (!canEditEvidence) return

    if (!window.confirm('Are you sure you want to delete this evidence photo?')) {
      return
    }

    const token = getStoredToken()

    try {
      const formData = new FormData()

      const response = await fetch(`${API_BASE}/incident-handler/delete-evidence-photo/${photoId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        loadEvidencePhotos()
        setSuccess('Evidence photo deleted successfully')
      } else {
        setError('Failed to delete evidence photo')
      }
    } catch (error) {
      setError('Failed to delete evidence photo')
    }
  }

  // Download evidence photo
  const downloadEvidencePhoto = async (photo: any) => {
    try {
      const imageUrl = `https://apexwpc.apextechno.co.uk/evidence-photos/${photo.url}`
      const newWindow = window.open(imageUrl, '_blank')

      if (newWindow) {
        setSuccess('Image opened in new tab. Right-click on the image to save it.')
      } else {
        // Fallback: create download link
        const link = document.createElement('a')
        link.href = imageUrl
        link.target = '_blank'
        link.download = `evidence_${photo.id}_${photo.url}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setSuccess('Download initiated')
      }
    } catch (error) {
      setError('Failed to open evidence photo')
    }
  }

  // Load ammonia readings
  const loadAmmoniaReadings = async () => {
    setLoading(prev => ({ ...prev, readings: true }))
    const token = getStoredToken()
    const incidentId = safe(incident.id)

    try {
      const response = await fetch(`${API_BASE}/incident-handler/incident-ammonia-reading/${incidentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          // Sort readings by sample date (newest first) and then by type
          const sortedReadings = (data.data || []).sort((a: any, b: any) => {
            const dateA = new Date(a.sample_date || a.created_at || 0).getTime()
            const dateB = new Date(b.sample_date || b.created_at || 0).getTime()
            if (dateA !== dateB) {
              return dateB - dateA // Newest first
            }
            // Then by type
            return (a.type || '').localeCompare(b.type || '')
          })
          setAmmoniaReadings(sortedReadings)
        } else {
          setAmmoniaReadings([])
        }
      } else {
        setAmmoniaReadings([])
        if (response.status >= 500 || response.status === 401 || response.status === 403) {
          console.error('Failed to load ammonia readings')
        }
      }
    } catch (error) {
      console.error('Failed to load ammonia readings:', error)
      setAmmoniaReadings([])
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('Network error - unable to load ammonia readings')
      }
    } finally {
      setLoading(prev => ({ ...prev, readings: false }))
    }
  }

  // Add ammonia reading
  const addAmmoniaReading = async () => {
    if (!readingForm.reading_value || !readingForm.location || !canEditEvidence) {
      setError('Please fill in Reading Value and Type')
      return
    }

    // Validate reading value
    const readingValue = parseFloat(readingForm.reading_value)
    if (isNaN(readingValue) || readingValue < 0) {
      setError('Please enter a valid positive number for the reading value')
      return
    }

    setUploadLoading(prev => ({ ...prev, reading: true }))
    const token = getStoredToken()
    const incidentId = safe(incident.id)

    const formData = new FormData()
    formData.append('incident_id', incidentId)
    formData.append('type', readingForm.location)
    formData.append('sample_date', readingForm.reading_date || new Date().toISOString().split('T')[0])
    formData.append('reading', readingForm.reading_value)

    try {
      const response = await fetch(`${API_BASE}/incident-handler/ammonia-reading`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (response.ok && data.success !== false) {
        setSuccess('Ammonia reading added successfully')
        setReadingForm({
          reading_value: '',
          reading_date: new Date().toISOString().split('T')[0],
          location: ''
        })
        setShowReadingForm(false)
        loadAmmoniaReadings()
      } else {
        const errorMsg = data.message || 'Failed to add reading'
        setError(errorMsg)
      }
    } catch (error) {
      setError('Failed to add reading')
    } finally {
      setUploadLoading(prev => ({ ...prev, reading: false }))
    }
  }

  // Delete ammonia reading
  const deleteAmmoniaReading = async (readingId: string) => {
    if (!canEditEvidence) return

    if (!window.confirm('Are you sure you want to delete this ammonia reading?')) {
      return
    }

    const token = getStoredToken()

    try {
      const formData = new FormData()

      const response = await fetch(`${API_BASE}/incident-handler/delete-ammonia-reading/${readingId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        loadAmmoniaReadings()
        setSuccess('Ammonia reading deleted successfully')
      } else {
        setError('Failed to delete ammonia reading')
      }
    } catch (error) {
      setError('Failed to delete ammonia reading')
    }
  }

  // Get reading type info
  const getReadingTypeInfo = (type: string) => {
    const typeInfo = readingTypes.find(t => t.value === type)
    return typeInfo || { value: type, label: type, description: '' }
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

  // Load evidence data on component mount
  useEffect(() => {
    loadEvidencePhotos()
    loadAmmoniaReadings()
  }, [incident?.id])

  return (
    <div>
      <Row>
        {/* Evidence Photos */}
        <Col md={6}>
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <div>
                <h5>Evidence Photos</h5>
              </div>
              {canEditEvidence && (
                <Button
                  color="success"
                  size="sm"
                  onClick={() => setShowPhotoUpload(!showPhotoUpload)}
                >
                  {showPhotoUpload ? '✕ Cancel' : 'Upload Photo'}
                </Button>
              )}
            </CardHeader>
            <CardBody>
              {/* Photo Upload Form */}
              {showPhotoUpload && canEditEvidence && (
                <Card className="mb-3 border-success">
                  <CardBody>
                    <h6 className="mb-3">Upload Evidence Photo</h6>
                    <FormGroup>
                      <Label>Photo <span className="text-danger">*</span></Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPhotoUpload({
                          ...photoUpload,
                          file: e.target.files ? e.target.files[0] : null
                        })}
                      />
                      <small className="text-muted">
                        Supported formats: JPG, PNG, GIF, WEBP (Max 10MB)
                      </small>
                    </FormGroup>
                    <FormGroup>
                      <Label>Description (Optional)</Label>
                      <Input
                        type="textarea"
                        rows="2"
                        value={photoUpload.description}
                        onChange={(e) => setPhotoUpload({
                          ...photoUpload,
                          description: e.target.value
                        })}
                        placeholder="Brief description of what this photo shows..."
                        maxLength={200}
                      />
                      <small className="text-muted">{photoUpload.description.length}/200 characters</small>
                    </FormGroup>
                    <div className="d-flex gap-2">
                      <Button
                        color="success"
                        size="sm"
                        onClick={uploadEvidencePhoto}
                        disabled={!photoUpload.file || uploadLoading.photo}
                      >
                        {uploadLoading.photo ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" />
                            Uploading...
                          </>
                        ) : (
                          'Upload Photo'
                        )}
                      </Button>
                      <Button
                        color="success"
                        size="sm"
                        onClick={() => {
                          setShowPhotoUpload(false)
                          setPhotoUpload({ file: null, description: '' })
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Photos List */}
              {loading.photos ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Loading photos...</p>
                </div>
              ) : evidencePhotos.length > 0 ? (
                <div className="table-responsive">
                  <Table responsive className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Photo</th>
                        <th>Details</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evidencePhotos.map((photo: any) => (
                        <tr key={photo.id}>
                          <td>
                            <img
                              src={`https://apexwpc.apextechno.co.uk/evidence-photos/${photo.url}`}
                              alt="Evidence"
                              style={{width: '80px', height: '80px', objectFit: 'cover'}}
                              className="rounded shadow-sm"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          </td>
                          <td>
                            <div>
                              <small className="text-muted d-block">
                                <strong>Uploaded:</strong> {formatDate(photo.uploaded_date || photo.created_at)}
                              </small>
                              {photo.description && (
                                <small className="text-muted d-block mt-1">
                                  <strong>Description:</strong> {safe(photo.description)}
                                </small>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="d-flex gap-1 flex-column flex-sm-row">
                              <Button
                                color="success"
                                size="sm"
                                onClick={() => downloadEvidencePhoto(photo)}
                                title="View/Download photo"
                              >
                                View
                              </Button>
                              {canEditEvidence && (
                                <Button
                                  color="success"
                                  size="sm"
                                  onClick={() => deleteEvidencePhoto(photo.id)}
                                  title="Delete photo"
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <Alert color="none" className="mb-0">
                  <div className="text-center py-4">
                    <h6>No Evidence Photos</h6>
                    <p className="mb-0">No photos have been uploaded for this incident yet.</p>
                  </div>
                </Alert>
              )}
            </CardBody>
          </Card>
        </Col>

        {/* Ammonia Readings */}
        <Col md={6}>
          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <div>
                <h5>Ammonia Readings</h5>
              </div>
              {canEditEvidence && (
                <Button
                  color="success"
                  size="sm"
                  onClick={() => setShowReadingForm(!showReadingForm)}
                >
                  {showReadingForm ? 'Cancel' : 'Add Reading'}
                </Button>
              )}
            </CardHeader>
            <CardBody>
              {/* Reading Form */}
              {showReadingForm && canEditEvidence && (
                <Card className="mb-3 border-success">
                  <CardBody>
                    <h6 className="mb-3">Add Ammonia Reading</h6>
                    <Row>
                      <Col md={6}>
                        <FormGroup>
                          <Label>Reading Type <span className="text-danger">*</span></Label>
                          <Input
                            type="select"
                            value={readingForm.location}
                            onChange={(e) => setReadingForm({
                              ...readingForm,
                              location: e.target.value
                            })}
                          >
                            <option value="">Select Type</option>
                            {readingTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </Input>
                          {readingForm.location && (
                            <small className="text-muted">
                              {getReadingTypeInfo(readingForm.location).description}
                            </small>
                          )}
                        </FormGroup>
                      </Col>
                      <Col md={6}>
                        <FormGroup>
                          <Label>Reading Value (mg/L) <span className="text-danger">*</span></Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={readingForm.reading_value}
                            onChange={(e) => setReadingForm({
                              ...readingForm,
                              reading_value: e.target.value
                            })}
                            placeholder="0.00"
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    <FormGroup>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={readingForm.reading_date}
                        onChange={(e) => setReadingForm({
                          ...readingForm,
                          reading_date: e.target.value
                        })}
                      />
                    </FormGroup>
                    <div className="d-flex gap-2">
                      <Button
                        color="success"
                        size="sm"
                        onClick={addAmmoniaReading}
                        disabled={!readingForm.reading_value || !readingForm.location || uploadLoading.reading}
                      >
                        {uploadLoading.reading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" />
                            Adding...
                          </>
                        ) : (
                          'Add Reading'
                        )}
                      </Button>
                      <Button
                        color="success"
                        size="sm"
                        onClick={() => {
                          setShowReadingForm(false)
                          setReadingForm({
                            reading_value: '',
                            reading_date: new Date().toISOString().split('T')[0],
                            location: ''
                          })
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Readings List */}
              {loading.readings ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Loading readings...</p>
                </div>
              ) : ammoniaReadings.length > 0 ? (
                <div className="table-responsive">
                  <Table responsive className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Type</th>
                        <th>Reading (mg/L)</th>
                        <th>Date</th>
                        {canEditEvidence && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {ammoniaReadings.map((reading: any) => {
                        const typeInfo = getReadingTypeInfo(reading.type)
                        const readingValue = parseFloat(reading.reading)

                        return (
                          <tr key={reading.id}>
                            <td>
                              {typeInfo.label}
                            </td>
                            <td>
                              <span>
                                {safe(reading.reading)}
                              </span>
                            </td>
                            <td>
                              <div>
                                {formatDate(reading.sample_date)}
                              </div>
                            </td>
                            {canEditEvidence && (
                              <td>
                                <Button
                                  color="success"
                                  size="sm"
                                  onClick={() => deleteAmmoniaReading(reading.id)}
                                  title="Delete reading"
                                >
                                  Delete
                                </Button>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <Alert color="none" className="mb-0">
                  <div className="text-center py-4">
                    <h6>No Ammonia Readings</h6>
                    <p className="mb-0">No readings have been recorded for this incident yet.</p>
                  </div>
                </Alert>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default EvidenceTab
