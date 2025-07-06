'use client'
import React, { useState, useEffect } from 'react'
import {
  Row, Col, Button, Form, FormGroup, Label, Input, Alert
} from 'reactstrap'
import { fetchSubcategories } from '../../app/(MainBody)/services/masterService'

interface DetailsTabProps {
  incident: any
  userType?: string
  currentUser: any
  masterData: any
  isEndUser: boolean
  isFieldEngineer: boolean
  hasFullAccess: boolean
  canEditIncident: boolean
  setError: (error: string | null) => void
  setSuccess: (success: string | null) => void
  safe: (value: any) => string
  onSave: (updateData: any) => Promise<boolean>
  loading: boolean
}

const DetailsTab: React.FC<DetailsTabProps> = ({
  incident,
  currentUser,
  masterData,
  isEndUser,
  isFieldEngineer,
  hasFullAccess,
  canEditIncident,
  setError,
  setSuccess,
  safe,
  onSave,
  loading
}) => {
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})
  const [localSubCategories, setLocalSubCategories] = useState<Array<{id: number, name: string, category_id: number}>>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

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

  // Track initial form state for change detection
  const [initialForm, setInitialForm] = useState(form)

  // Load subcategories when category changes
  const loadSubcategories = async (categoryId: string) => {
    if (!categoryId) {
      setLocalSubCategories([])
      setForm(prev => ({ ...prev, subCategoryId: '' }))
      return
    }

    setSubcategoriesLoading(true)
    try {
      console.log('Loading subcategories for category:', categoryId)
      const subcategoriesRes = await fetchSubcategories(categoryId)
      console.log('Subcategories response:', subcategoriesRes)

      const allSubCategories = subcategoriesRes.data || []
      const filteredSubCategories = allSubCategories.filter((sub: any) => {
        return parseInt(sub.category_id) === parseInt(categoryId)
      })

      console.log('Filtered subcategories:', filteredSubCategories.length)
      setLocalSubCategories(filteredSubCategories)

    } catch (error: any) {
      console.error('Error loading subcategories:', error)
      setLocalSubCategories([])
      setError(`Failed to load subcategories: ${error.message}`)
    } finally {
      setSubcategoriesLoading(false)
    }
  }

  // Check if form has changes
  const checkForChanges = (newForm: typeof form) => {
    const hasChanges = Object.keys(newForm).some(key => {
      return newForm[key as keyof typeof newForm] !== initialForm[key as keyof typeof initialForm]
    })
    setHasUnsavedChanges(hasChanges)
  }

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    setForm(prev => {
      const newData = { ...prev, [name]: value }

      // Handle category change
      if (name === 'categoryId') {
        newData.subCategoryId = '' // Clear subcategory when category changes
        loadSubcategories(value) // Load new subcategories
      }

      // Check for changes
      checkForChanges(newData)

      return newData
    })

    // Clear validation error for this field
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Form validation
  const validateForm = () => {
    const errors: {[key: string]: string} = {}

    // Basic validation for all users who can edit
    if (!form.shortDescription.trim()) {
      errors.shortDescription = 'Short description is required'
    } else if (form.shortDescription.trim().length < 10) {
      errors.shortDescription = 'Short description must be at least 10 characters'
    }

    if (!form.description.trim()) {
      errors.description = 'Description is required'
    } else if (form.description.trim().length < 20) {
      errors.description = 'Description must be at least 20 characters'
    }

    // Advanced validation only for advanced users
    if (hasFullAccess) {
      if (!form.categoryId) {
        errors.categoryId = 'Category is required'
      }
      if (!form.contactTypeId) {
        errors.contactTypeId = 'Contact type is required'
      }
      if (!form.impactId) {
        errors.impactId = 'Impact is required'
      }
      if (!form.urgencyId) {
        errors.urgencyId = 'Urgency is required'
      }
      if (!form.statusId) {
        errors.statusId = 'Status is required'
      }
      if (!form.siteId) {
        errors.siteId = 'Site is required'
      }
      if (!form.assetId) {
        errors.assetId = 'Asset is required'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle save
  const handleSave = async () => {
    if (!canEditIncident || !currentUser?.id) {
      setError('You do not have permission to edit this incident')
      return
    }

    // Clear previous errors
    setError(null)
    setFormErrors({})

    // Validate form
    if (!validateForm()) {
      setError('Please fill in all required fields correctly')
      return
    }

    // Check if there are actually changes to save
    if (!hasUnsavedChanges) {
      setSuccess('No changes detected')
      return
    }

    // Prepare update data
    let updateData: any = {
      user_id: currentUser.id,
      incident_id: parseInt(safe(incident.id)),
      from: currentUser.id,
      to: currentUser.id,
      short_description: form.shortDescription.trim(),
      description: form.description.trim()
    }

    // Add additional fields for advanced users
    if (hasFullAccess) {
      updateData = {
        ...updateData,
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

    // Call the save function from parent
    const success = await onSave(updateData)
    if (success) {
      // Update initial form state to reflect saved changes
      setInitialForm({ ...form })
      setHasUnsavedChanges(false)
      setSuccess('Incident details updated successfully')
    }
  }

  // Get lookup display value
  const getLookupDisplayValue = (lookupArray: any[], id: any, nameField = 'name'): string => {
    if (!id || !lookupArray || lookupArray.length === 0) return ''

    const item = lookupArray.find(item => item.id === parseInt(id.toString()))
    if (!item) return ''

    // Try different name fields
    return item[nameField] || item.name || item.premises || item.street || item.locality || item.description || item.asset_name || `ID: ${id}`
  }

  // Initialize form data when incident or master data loads
  useEffect(() => {
    if (!masterData.loaded || !incident) return

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
    setInitialForm(newForm) // Set as baseline for change detection
    setHasUnsavedChanges(false)

    // Load subcategories if category is selected
    if (incident?.category_id) {
      loadSubcategories(safe(incident.category_id))
    }
  }, [incident, masterData.loaded])

  // Warn user about unsaved changes
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

  // Render form based on user permissions
  const renderForm = () => {
    if (isEndUser) {
      // End users only see and can edit description fields
      return (
        <Form>
          <Row>
            <Col md={12}>
              <FormGroup>
                <Label>Short Description <span className="text-danger">*</span></Label>
                <Input
                  type="textarea"
                  rows="3"
                  value={form.shortDescription}
                  onChange={handleInputChange}
                  name="shortDescription"
                  className={formErrors.shortDescription ? 'is-invalid' : ''}
                  placeholder="Brief summary of the incident (minimum 10 characters)..."
                  maxLength={500}
                />
                {formErrors.shortDescription && (
                  <div className="invalid-feedback">{formErrors.shortDescription}</div>
                )}
                <small className="text-muted">{form.shortDescription.length}/500 characters</small>
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              <FormGroup>
                <Label>Description <span className="text-danger">*</span></Label>
                <Input
                  type="textarea"
                  rows="6"
                  value={form.description}
                  onChange={handleInputChange}
                  name="description"
                  className={formErrors.description ? 'is-invalid' : ''}
                  placeholder="Detailed description of the incident (minimum 20 characters)..."
                  maxLength={2000}
                />
                {formErrors.description && (
                  <div className="invalid-feedback">{formErrors.description}</div>
                )}
                <small className="text-muted">{form.description.length}/2000 characters</small>
              </FormGroup>
            </Col>
          </Row>
        </Form>
      )
    }

    if (isFieldEngineer) {
      // Field engineers see all fields but read-only
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
                  value={getLookupDisplayValue(masterData.contactTypes, form.contactTypeId)}
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
                  value={getLookupDisplayValue(masterData.categories, form.categoryId)}
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
                  value={getLookupDisplayValue(masterData.sites, form.siteId)}
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
                  value={getLookupDisplayValue(masterData.assets, form.assetId)}
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
                  value={getLookupDisplayValue(masterData.impacts, form.impactId)}
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
                  value={getLookupDisplayValue(masterData.urgencies, form.urgencyId)}
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
                  value={getLookupDisplayValue(masterData.incidentStates, form.statusId)}
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

    // Advanced users get full editable form
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
              <Label>Contact Type <span className="text-danger">*</span></Label>
              <Input
                type="select"
                value={form.contactTypeId}
                onChange={handleInputChange}
                name="contactTypeId"
                className={formErrors.contactTypeId ? 'is-invalid' : ''}
              >
                <option value="">Select Contact Type</option>
                {masterData.contactTypes.map((type: any) => (
                  <option key={type.id} value={type.id}>{safe(type.name)}</option>
                ))}
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
              <Label>Category <span className="text-danger">*</span></Label>
              <Input
                type="select"
                value={form.categoryId}
                onChange={handleInputChange}
                name="categoryId"
                className={formErrors.categoryId ? 'is-invalid' : ''}
              >
                <option value="">Select Category</option>
                {masterData.categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{safe(cat.name)}</option>
                ))}
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
                disabled={!form.categoryId || subcategoriesLoading}
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
              <Label>Site <span className="text-danger">*</span></Label>
              <Input
                type="select"
                value={form.siteId}
                onChange={handleInputChange}
                name="siteId"
                className={formErrors.siteId ? 'is-invalid' : ''}
              >
                <option value="">Select Site</option>
                {masterData.sites.map((site: any) => (
                  <option key={site.id} value={site.id}>
                    {safe(site.name) || safe(site.street) || safe(site.locality) || safe(site.premises) || `Site ${site.id}`}
                  </option>
                ))}
              </Input>
              {formErrors.siteId && (
                <div className="invalid-feedback">{formErrors.siteId}</div>
              )}
            </FormGroup>
          </Col>
          <Col md={6}>
            <FormGroup>
              <Label>Asset <span className="text-danger">*</span></Label>
              <Input
                type="select"
                value={form.assetId}
                onChange={handleInputChange}
                name="assetId"
                className={formErrors.assetId ? 'is-invalid' : ''}
              >
                <option value="">Select Asset</option>
                {masterData.assets.map((asset: any) => (
                  <option key={asset.id} value={asset.id}>
                    {safe(asset.name) || safe(asset.description) || safe(asset.asset_name) || `Asset ${asset.id}`}
                  </option>
                ))}
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
                placeholder="Brief summary of the incident (minimum 10 characters)..."
                maxLength={500}
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
                placeholder="Detailed description of the incident (minimum 20 characters)..."
                maxLength={2000}
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
              <Label>Impact <span className="text-danger">*</span></Label>
              <Input
                type="select"
                value={form.impactId}
                onChange={handleInputChange}
                name="impactId"
                className={formErrors.impactId ? 'is-invalid' : ''}
              >
                <option value="">Select Impact</option>
                {masterData.impacts.map((impact: any) => (
                  <option key={impact.id} value={impact.id}>{safe(impact.name)}</option>
                ))}
              </Input>
              {formErrors.impactId && (
                <div className="invalid-feedback">{formErrors.impactId}</div>
              )}
            </FormGroup>
          </Col>
          <Col md={6}>
            <FormGroup>
              <Label>Urgency <span className="text-danger">*</span></Label>
              <Input
                type="select"
                value={form.urgencyId}
                onChange={handleInputChange}
                name="urgencyId"
                className={formErrors.urgencyId ? 'is-invalid' : ''}
              >
                <option value="">Select Urgency</option>
                {masterData.urgencies.map((urgency: any) => (
                  <option key={urgency.id} value={urgency.id}>{safe(urgency.name)}</option>
                ))}
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
              <Label>Status <span className="text-danger">*</span></Label>
              <Input
                type="select"
                value={form.statusId}
                onChange={handleInputChange}
                name="statusId"
                className={formErrors.statusId ? 'is-invalid' : ''}
              >
                <option value="">Select Status</option>
                {masterData.incidentStates.map((state: any) => (
                  <option key={state.id} value={state.id}>{safe(state.name)}</option>
                ))}
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
      {!masterData.loaded && (
        <Alert color="info">
          <div className="d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2"></div>
            <strong>Loading form data...</strong>
          </div>
        </Alert>
      )}

      {masterData.loaded && (
        <>
          {/* Unsaved changes warning */}
          {hasUnsavedChanges && (
            <Alert color="warning" className="mb-3">
              <div className="d-flex align-items-center">
                <span className="me-2">⚠️</span>
                <strong>You have unsaved changes!</strong>
                <span className="ms-2">Don't forget to save your modifications.</span>
              </div>
            </Alert>
          )}

          {renderForm()}

          {canEditIncident && (
            <div className="mt-4 pt-3 border-top">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  {hasUnsavedChanges && (
                    <small className="text-warning">
                      <span className="me-1">⚠️</span>
                      Unsaved changes detected
                    </small>
                  )}
                </div>
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
                    <>
                    Save Changes
                    </>
                  ) : (
                    <>
                      No Changes to Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default DetailsTab
