'use client'
import React, { useState, useEffect, useCallback } from 'react'
import {
  Row, Col, Button, Form, FormGroup, Label, Input, Alert
} from 'reactstrap'
import { fetchSubcategories } from '../../app/(MainBody)/services/masterService'

interface DetailsTabProps {
  incident: any
  userType?: string
  currentUser: any
  masterData: any
  isFieldEngineer: boolean
  hasFullAccess: boolean
  canEditIncident: boolean
  setError: (error: string | null) => void
  setSuccess: (success: string | null) => void
  safe: (value: any) => string
  onSave: (updateData: any) => Promise<boolean>
  loading: boolean
  readOnly?: boolean
}

const DetailsTab: React.FC<DetailsTabProps> = ({
  incident,
  currentUser,
  masterData = { loaded: false, categories: [], contactTypes: [], sites: [], assets: [], impacts: [], urgencies: [], incidentStates: [] },
  isFieldEngineer,
  hasFullAccess,
  canEditIncident,
  setError,
  setSuccess,
  safe,
  onSave,
  loading,
  readOnly = false
}) => {
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})
  const [localSubCategories, setLocalSubCategories] = useState<Array<{id: number, name: string, category_id: number}>>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [formInitialized, setFormInitialized] = useState(false)

  const [form, setForm] = useState({
    shortDescription: '',
    description: '',
    categoryId: '',
    subCategoryId: '',
    contactTypeId: '',
    impactId: '',
    urgencyId: '',
    statusId: '',
    siteId: '',
    assetId: '',
    narration: ''
  })

  const [initialForm, setInitialForm] = useState(form)

  const loadSubcategories = useCallback(async (categoryId: string) => {
    if (!categoryId) {
      setLocalSubCategories([])
      return
    }

    setSubcategoriesLoading(true)
    try {
      const subcategoriesRes = await fetchSubcategories(categoryId)
      const allSubCategories = subcategoriesRes.data || []
      const filteredSubCategories = allSubCategories.filter((sub: any) => {
        return parseInt(sub.category_id) === parseInt(categoryId)
      })
      setLocalSubCategories(filteredSubCategories)
    } catch (error: any) {
      setLocalSubCategories([])
      setError(`Failed to load subcategories: ${error.message}`)
    } finally {
      setSubcategoriesLoading(false)
    }
  }, [setError])

  const checkForChanges = useCallback((newForm: typeof form) => {
    if (!formInitialized) return false

    const hasChanges = Object.keys(newForm).some(key => {
      return newForm[key as keyof typeof newForm] !== initialForm[key as keyof typeof initialForm]
    })

    setHasUnsavedChanges(hasChanges)
    return hasChanges
  }, [formInitialized, initialForm])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    setForm(prev => {
      const newData = { ...prev, [name]: value }

      if (name === 'categoryId') {
        newData.subCategoryId = ''
        loadSubcategories(value)
      }

      checkForChanges(newData)
      return newData
    })

    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }, [formErrors, loadSubcategories, checkForChanges])

  const validateForm = useCallback(() => {
    const errors: {[key: string]: string} = {}

    // Very minimal validation for all users
    if (form.shortDescription.trim() && form.shortDescription.trim().length < 3) {
      errors.shortDescription = 'Too short'
    }

    if (form.description.trim() && form.description.trim().length < 5) {
      errors.description = 'Too short'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [form])

  const handleSave = useCallback(async () => {
    if (!canEditIncident || !currentUser?.id || readOnly) {
      setError('You do not have permission to edit this incident')
      return
    }

    setError(null)
    setFormErrors({})

    if (!validateForm()) {
      setError('Please check your input and try again')
      return
    }

    if (!hasUnsavedChanges) {
      setSuccess('No changes detected')
      return
    }

    // Prepare update data
    let updateData: any = {
      user_id: currentUser.id,
      incident_id: parseInt(safe(incident.id)),
      short_description: form.shortDescription.trim() || incident?.short_description || '',
      description: form.description.trim() || incident?.description || ''
    }

    // Add additional fields for advanced users
    if (hasFullAccess) {
      updateData = {
        ...updateData,
        from: currentUser.id,
        to: currentUser.id,
        site_id: form.siteId ? parseInt(form.siteId) : null,
        asset_id: form.assetId ? parseInt(form.assetId) : null,
        category_id: form.categoryId ? parseInt(form.categoryId) : null,
        subcategory_id: form.subCategoryId ? parseInt(form.subCategoryId) : null,
        contact_type_id: form.contactTypeId ? parseInt(form.contactTypeId) : null,
        impact_id: form.impactId ? parseInt(form.impactId) : null,
        urgency_id: form.urgencyId ? parseInt(form.urgencyId) : null,
        incidentstate_id: form.statusId ? parseInt(form.statusId) : null,
        narration: form.narration.trim() || null
      }
    }

    const success = await onSave(updateData)
    if (success) {
      setInitialForm({ ...form })
      setHasUnsavedChanges(false)
      setSuccess('Incident details updated successfully')
    }
  }, [canEditIncident, currentUser?.id, readOnly, setError, validateForm, hasUnsavedChanges, setSuccess, hasFullAccess, safe, incident, form, onSave])

  const getLookupDisplayValue = useCallback((lookupArray: any[], id: any, nameField = 'name'): string => {
    if (!id || !lookupArray || lookupArray.length === 0) return ''

    const item = lookupArray.find(item => item.id === parseInt(id.toString()))
    if (!item) return ''

    return item[nameField] || item.name || item.premises || item.street || item.locality || item.description || item.asset_name || `ID: ${id}`
  }, [])

  const initializeForm = useCallback(() => {
    if (!masterData?.loaded || !incident || formInitialized) return

    const newForm = {
      shortDescription: safe(incident?.short_description),
      description: safe(incident?.description),
      categoryId: safe(incident?.category_id),
      subCategoryId: safe(incident?.subcategory_id),
      contactTypeId: safe(incident?.contact_type_id),
      impactId: safe(incident?.impact_id),
      urgencyId: safe(incident?.urgency_id),
      statusId: safe(incident?.incidentstate_id),
      siteId: safe(incident?.site_id),
      assetId: safe(incident?.asset_id),
      narration: safe(incident?.narration)
    }

    setForm(newForm)
    setInitialForm(newForm)
    setHasUnsavedChanges(false)
    setFormInitialized(true)

    // Load subcategories for advanced users
    if (incident?.category_id) {
      loadSubcategories(safe(incident.category_id))
    }
  }, [masterData?.loaded, incident, formInitialized, safe, loadSubcategories])

  useEffect(() => {
    initializeForm()
  }, [initializeForm])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const renderForm = () => {
    if (!formInitialized) {
      return (
        <div className="text-center py-4">
          <div className="spinner-border text-primary mb-3"></div>
          <p>Loading incident details...</p>
        </div>
      )
    }

    if (isFieldEngineer) {
      return (
        <Form>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>Incident Number</Label>
                <Input value={safe(incident?.incident_no)} disabled className="bg-light text-dark" />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>Contact Type</Label>
                <Input
                  type="text"
                  value={getLookupDisplayValue(masterData?.contactTypes || [], form.contactTypeId)}
                  disabled
                  className="bg-light text-dark"
                />
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>Category</Label>
                <Input
                  type="text"
                  value={getLookupDisplayValue(masterData?.categories || [], form.categoryId)}
                  disabled
                  className="bg-light text-dark"
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>Sub Category</Label>
                <Input
                  type="text"
                  value={getLookupDisplayValue(localSubCategories, form.subCategoryId) || 'None'}
                  disabled
                  className="bg-light text-dark"
                />
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>Site</Label>
                <Input
                  type="text"
                  value={getLookupDisplayValue(masterData?.sites || [], form.siteId)}
                  disabled
                  className="bg-light text-dark"
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>Asset</Label>
                <Input
                  type="text"
                  value={getLookupDisplayValue(masterData?.assets || [], form.assetId)}
                  disabled
                  className="bg-light text-dark"
                />
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>Short Description</Label>
                <Input
                  type="textarea"
                  rows="3"
                  value={form.shortDescription}
                  disabled
                  className="bg-light text-dark"
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>Description</Label>
                <Input
                  type="textarea"
                  rows="3"
                  value={form.description}
                  disabled
                  className="bg-light text-dark"
                />
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>Impact</Label>
                <Input
                  type="text"
                  value={getLookupDisplayValue(masterData?.impacts || [], form.impactId)}
                  disabled
                  className="bg-light text-dark"
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>Urgency</Label>
                <Input
                  type="text"
                  value={getLookupDisplayValue(masterData?.urgencies || [], form.urgencyId)}
                  disabled
                  className="bg-light text-dark"
                />
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>Status</Label>
                <Input
                  type="text"
                  value={getLookupDisplayValue(masterData?.incidentStates || [], form.statusId)}
                  disabled
                  className="bg-light text-dark"
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>Notes</Label>
                <Input
                  type="textarea"
                  rows="4"
                  value={form.narration}
                  disabled
                  className="bg-light text-dark"
                />
              </FormGroup>
            </Col>
          </Row>
        </Form>
      )
    }

    return (
      <Form>
        <Row>
          <Col md={6}>
            <FormGroup>
              <Label>Incident Number</Label>
              <Input value={safe(incident?.incident_no)} disabled className="bg-light text-dark" />
            </FormGroup>
          </Col>
          <Col md={6}>
            <FormGroup>
              <Label>Contact Type</Label>
              <Input
                type="select"
                value={form.contactTypeId}
                onChange={handleInputChange}
                name="contactTypeId"
                className={formErrors.contactTypeId ? 'is-invalid' : ''}
                disabled={readOnly || !canEditIncident}
              >
                <option value="">Select Contact Type</option>
                {masterData?.contactTypes?.map((type: any) => (
                  <option key={type.id} value={type.id}>{safe(type.name)}</option>
                )) || []}
              </Input>
              {formErrors.contactTypeId && (
                <div className="invalid-feedback">{formErrors.contactTypeId}</div>
              )}
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col md={6}>
            <FormGroup>
              <Label>Category</Label>
              <Input
                type="select"
                value={form.categoryId}
                onChange={handleInputChange}
                name="categoryId"
                className={formErrors.categoryId ? 'is-invalid' : ''}
                disabled={readOnly || !canEditIncident}
              >
                <option value="">Select Category</option>
                {masterData?.categories?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{safe(cat.name)}</option>
                )) || []}
              </Input>
              {formErrors.categoryId && (
                <div className="invalid-feedback">{formErrors.categoryId}</div>
              )}
            </FormGroup>
          </Col>
          <Col md={6}>
            <FormGroup>
              <Label>Sub Category</Label>
              <Input
                type="select"
                value={form.subCategoryId}
                onChange={handleInputChange}
                name="subCategoryId"
                disabled={readOnly || !canEditIncident || !form.categoryId || subcategoriesLoading}
              >
                <option value="">
                  {subcategoriesLoading
                    ? "Loading subcategories..."
                    : !form.categoryId
                      ? "Select Category first"
                      : localSubCategories.length === 0
                        ? "No subcategories available"
                        : "Select Sub Category"}
                </option>
                {localSubCategories.map((subCat: any) => (
                  <option key={subCat.id} value={subCat.id}>{safe(subCat.name)}</option>
                ))}
              </Input>
              {subcategoriesLoading && (
                <small className="text-info">
                  <i className="fa fa-spinner fa-spin me-1"></i>
                  Loading subcategories...
                </small>
              )}
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col md={6}>
            <FormGroup>
              <Label>Site</Label>
              <Input
                type="select"
                value={form.siteId}
                onChange={handleInputChange}
                name="siteId"
                className={formErrors.siteId ? 'is-invalid' : ''}
                disabled={readOnly || !canEditIncident}
              >
                <option value="">Select Site</option>
                {masterData?.sites?.map((site: any) => (
                  <option key={site.id} value={site.id}>
                    {safe(site.name) || safe(site.street) || safe(site.locality) || safe(site.premises) || `Site ${site.id}`}
                  </option>
                )) || []}
              </Input>
              {formErrors.siteId && (
                <div className="invalid-feedback">{formErrors.siteId}</div>
              )}
            </FormGroup>
          </Col>
          <Col md={6}>
            <FormGroup>
              <Label>Asset</Label>
              <Input
                type="select"
                value={form.assetId}
                onChange={handleInputChange}
                name="assetId"
                className={formErrors.assetId ? 'is-invalid' : ''}
                disabled={readOnly || !canEditIncident}
              >
                <option value="">Select Asset</option>
                {masterData?.assets?.map((asset: any) => (
                  <option key={asset.id} value={asset.id}>
                    {safe(asset.name) || safe(asset.description) || safe(asset.asset_name) || `Asset ${asset.id}`}
                  </option>
                )) || []}
              </Input>
              {formErrors.assetId && (
                <div className="invalid-feedback">{formErrors.assetId}</div>
              )}
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col md={6}>
            <FormGroup>
              <Label>Short Description <span className="text-danger">*</span></Label>
              <Input
                type="textarea"
                rows="3"
                value={form.shortDescription}
                onChange={handleInputChange}
                name="shortDescription"
                className={formErrors.shortDescription ? 'is-invalid' : ''}
                placeholder="Brief summary of the incident (minimum 5 characters)..."
                maxLength={500}
                disabled={readOnly || !canEditIncident}
              />
              {formErrors.shortDescription && (
                <div className="invalid-feedback">{formErrors.shortDescription}</div>
              )}
              <small className="text-muted">{form.shortDescription.length}/500 characters</small>
            </FormGroup>
          </Col>
          <Col md={6}>
            <FormGroup>
              <Label>Description <span className="text-danger">*</span></Label>
              <Input
                type="textarea"
                rows="3"
                value={form.description}
                onChange={handleInputChange}
                name="description"
                className={formErrors.description ? 'is-invalid' : ''}
                placeholder="Detailed description of the incident (minimum 10 characters)..."
                maxLength={2000}
                disabled={readOnly || !canEditIncident}
              />
              {formErrors.description && (
                <div className="invalid-feedback">{formErrors.description}</div>
              )}
              <small className="text-muted">{form.description.length}/2000 characters</small>
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col md={6}>
            <FormGroup>
              <Label>Impact</Label>
              <Input
                type="select"
                value={form.impactId}
                onChange={handleInputChange}
                name="impactId"
                className={formErrors.impactId ? 'is-invalid' : ''}
                disabled={readOnly || !canEditIncident}
              >
                <option value="">Select Impact</option>
                {masterData?.impacts?.map((impact: any) => (
                  <option key={impact.id} value={impact.id}>{safe(impact.name)}</option>
                )) || []}
              </Input>
              {formErrors.impactId && (
                <div className="invalid-feedback">{formErrors.impactId}</div>
              )}
            </FormGroup>
          </Col>
          <Col md={6}>
            <FormGroup>
              <Label>Urgency</Label>
              <Input
                type="select"
                value={form.urgencyId}
                onChange={handleInputChange}
                name="urgencyId"
                className={formErrors.urgencyId ? 'is-invalid' : ''}
                disabled={readOnly || !canEditIncident}
              >
                <option value="">Select Urgency</option>
                {masterData?.urgencies?.map((urgency: any) => (
                  <option key={urgency.id} value={urgency.id}>{safe(urgency.name)}</option>
                )) || []}
              </Input>
              {formErrors.urgencyId && (
                <div className="invalid-feedback">{formErrors.urgencyId}</div>
              )}
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col md={6}>
            <FormGroup>
              <Label>Status</Label>
              <Input
                type="select"
                value={form.statusId}
                onChange={handleInputChange}
                name="statusId"
                className={formErrors.statusId ? 'is-invalid' : ''}
                disabled={readOnly || !canEditIncident}
              >
                <option value="">Select Status</option>
                {masterData?.incidentStates?.map((state: any) => (
                  <option key={state.id} value={state.id}>{safe(state.name)}</option>
                )) || []}
              </Input>
              {formErrors.statusId && (
                <div className="invalid-feedback">{formErrors.statusId}</div>
              )}
            </FormGroup>
          </Col>
          <Col md={6}>
            <FormGroup>
              <Label>Notes</Label>
              <Input
                type="textarea"
                rows="4"
                value={form.narration}
                onChange={handleInputChange}
                name="narration"
                placeholder="Additional notes or comments..."
                maxLength={1000}
                disabled={readOnly || !canEditIncident}
              />
              <small className="text-muted">{form.narration.length}/1000 characters</small>
            </FormGroup>
          </Col>
        </Row>
      </Form>
    )
  }

  return (
    <div>
      {!masterData?.loaded && (
        <Alert color="info">
          <div className="d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2"></div>
            <strong>Loading form data...</strong>
          </div>
        </Alert>
      )}

      {masterData?.loaded && (
        <>
          {renderForm()}

          {canEditIncident && !readOnly && formInitialized && (
            <div className="mt-4 pt-3 border-top">
              <div className="d-flex justify-content-end align-items-center">
                <Button
                  color="success"
                  onClick={handleSave}
                  disabled={loading || !hasUnsavedChanges}
                  size="md"
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving Changes...
                    </>
                  ) : hasUnsavedChanges ? (
                    'Save Changes'
                  ) : (
                    'No Changes to Save'
                  )}
                </Button>
              </div>
            </div>
          )}
          {/* Hardcoded SLA Info */}
          <div className="mt-5 p-3 border rounded bg-light text-dark">
            <h6 className="mb-3 text-success">SLA Information</h6>
            <Row className="mb-2">
              <Col md={3}><strong>SLA Name:</strong> Basic Response SLA</Col>
              <Col md={3}><strong>Type:</strong> Response</Col>
              <Col md={3}><strong>Target:</strong> 4 hours</Col>
              <Col md={3}><strong>Stage:</strong> Active</Col>
            </Row>
            <Row className="mb-2">
              <Col md={3}><strong>Business Time Left:</strong> 2h 15m</Col>
              <Col md={3}><strong>Business Time Elapsed:</strong> 1h 45m</Col>
              <Col md={3}><strong>Start Time:</strong> 2025-07-08 10:30</Col>
              <Col md={3}>
                <strong>Progress:</strong>
                <div className="progress mt-1" style={{ height: '8px' }}>
                  <div className="progress-bar bg-success" role="progressbar" style={{ width: '44%' }}></div>
                </div>
                <small>44% elapsed</small>
              </Col>
            </Row>
          </div>
        </>
      )}
    </div>
  )
}

export default DetailsTab
