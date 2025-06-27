"use client";
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, CardBody, Form, FormGroup, Label, Input, Button, Alert } from 'reactstrap';

import {
  createIncident,
  type Incident
} from '../../app/(MainBody)/services/incidentService';

import {
  fetchCategories,
  fetchSubcategories,
  fetchContactTypes,
  fetchImpacts,
  fetchUrgencies,
  fetchAssets,
  fetchSites,
} from '../../app/(MainBody)/services/masterService';

import {
  getCurrentUser
} from '../../app/(MainBody)/services/userService';

interface IncidentFormData {
  caller: string;
  category_id: string;
  subcategory_id: string;
  short_description: string;
  contact_type_id: string;
  impact_id: string;
  urgency_id: string;
  description: string;
  address: string;
  postcode: string;
  latitude: string;
  longitude: string;
  asset_id: string;
  site_id: string;
}

interface IncidentCreationFormProps {
  userRole: string;
  userEmail: string;
  userName: string;
  onCancel?: () => void;
  onIncidentCreated?: (incident: Incident) => void;
  onSuccess?: () => void;
  showBackButton?: boolean;
  compactMode?: boolean;
}

const IncidentCreationForm: React.FC<IncidentCreationFormProps> = ({
  userRole,
  userEmail,
  userName,
  onCancel,
  onIncidentCreated,
  onSuccess,
  showBackButton = true,
  compactMode = false
}) => {
  const [formData, setFormData] = useState<IncidentFormData>({
    caller: userName || '',
    category_id: '',
    subcategory_id: '',
    short_description: '',
    contact_type_id: '',
    impact_id: '',
    urgency_id: '',
    description: '',
    address: '',
    postcode: '',
    latitude: '',
    longitude: '',
    asset_id: '',
    site_id: ''
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [aiDescriptions, setAiDescriptions] = useState<string[]>([]);

  const [masterData, setMasterData] = useState({
    categories: [] as Array<{id: number, name: string}>,
    subcategories: [] as Array<{id: number, name: string, category_id: number}>,
    contactTypes: [] as Array<{id: number, name: string}>,
    impacts: [] as Array<{id: number, name: string}>,
    urgencies: [] as Array<{id: number, name: string}>,
    assets: [] as Array<{id: number, name: string}>,
    sites: [] as Array<{id: number, name?: string, premises?: string, catchment?: string}>,
    loading: false,
    error: null as string | null
  });

  useEffect(() => {
    const loadMasterData = async () => {
      setMasterData(prev => ({ ...prev, loading: true, error: null }));

      try {
        console.log('Starting to load master data...');

        const results = await Promise.allSettled([
          fetchCategories(),
          fetchContactTypes(),
          fetchImpacts(),
          fetchUrgencies(),
          fetchAssets(),
          fetchSites()
        ]);

        console.log('All API results:', results);

        const [categoriesRes, contactTypesRes, impactsRes, urgenciesRes, assetsRes, sitesRes] = results;

        // Extract data from successful results
        const categories = categoriesRes.status === 'fulfilled' ? categoriesRes.value.data || [] : [];
        const contactTypes = contactTypesRes.status === 'fulfilled' ? contactTypesRes.value.data || [] : [];
        const impacts = impactsRes.status === 'fulfilled' ? impactsRes.value.data || [] : [];
        const urgencies = urgenciesRes.status === 'fulfilled' ? urgenciesRes.value.data || [] : [];
        const assets = assetsRes.status === 'fulfilled' ? assetsRes.value.data || [] : [];
        const sites = sitesRes.status === 'fulfilled' ? sitesRes.value.data || [] : [];

        // Log any failures
        if (sitesRes.status === 'rejected') {
          console.error('Sites API failed:', sitesRes.reason);
        }

        console.log('Extracted data:', {
          categories: categories.length,
          contactTypes: contactTypes.length,
          impacts: impacts.length,
          urgencies: urgencies.length,
          assets: assets.length,
          sites: sites.length
        });

        setMasterData(prev => ({
          ...prev,
          categories,
          contactTypes,
          impacts,
          urgencies,
          assets,
          sites,
          loading: false,
          error: null
        }));

        // Set default values for required fields
        setFormData(prev => ({
          ...prev,
          contact_type_id: contactTypes[0]?.id?.toString() || '',
          impact_id: impacts[0]?.id?.toString() || '',
          urgency_id: urgencies[0]?.id?.toString() || ''
        }));

      } catch (error: any) {
        console.error('Master data loading error:', error);
        setMasterData(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Failed to load form data'
        }));
      }
    };

    loadMasterData();
  }, []);

  const loadSubcategories = async (categoryId: string) => {
    if (!categoryId) {
      setMasterData(prev => ({ ...prev, subcategories: [] }));
      setFormData(prev => ({ ...prev, subcategory_id: '' }));
      return;
    }

    setSubcategoriesLoading(true);
    try {
      const subcategoriesRes = await fetchSubcategories(categoryId);
      setMasterData(prev => ({
        ...prev,
        subcategories: subcategoriesRes.data || []
      }));
    } catch (error: any) {
      setMasterData(prev => ({ ...prev, subcategories: [] }));
      setError(`Failed to load subcategories: ${error.message}`);
    } finally {
      setSubcategoriesLoading(false);
    }
  };

  const lookupPostcode = async (postcode: string) => {
    if (!postcode || postcode.length < 5) return;

    setLoadingAddress(true);
    try {
      const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
      const data = await response.json();

      if (data.status === 200 && data.result) {
        const result = data.result;
        const fullAddress = [result.admin_district, result.admin_county, result.country]
          .filter(Boolean).join(', ');

        const latitude = result.latitude ? result.latitude.toString() : '';
        const longitude = result.longitude ? result.longitude.toString() : '';

        setFormData(prev => ({
          ...prev,
          address: fullAddress,
          latitude,
          longitude
        }));
      }
    } catch (error) {
      console.error('Error looking up postcode:', error);
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // Handle category change properly
      if (name === 'category_id') {
        newData.subcategory_id = ''; // Clear subcategory when category changes
        loadSubcategories(value); // Load new subcategories
      }

      // Handle postcode lookup
      if (name === 'postcode' && value.length >= 5) {
        setTimeout(() => lookupPostcode(value), 500);
      }

      return newData;
    });

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleAIGeneration = async () => {
    if (!formData.category_id || !formData.subcategory_id) {
      setError('Please select both category and subcategory first');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setAiDescriptions([]);

    try {
      const categoryName = getCategoryName(formData.category_id);
      const subcategoryName = getSubCategoryName(formData.subcategory_id);

      const response = await fetch('/api/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          category: categoryName,
          subcategory: subcategoryName
        })
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const result = await response.json();

      if (result.descriptions && Array.isArray(result.descriptions)) {
        setAiDescriptions(result.descriptions);
      } else {
        throw new Error('No descriptions received from AI service');
      }

    } catch (error) {
      console.error('AI Generation Error:', error);
      setError('Failed to generate descriptions. Please write manually.');
    } finally {
      setIsGenerating(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.caller.trim()) errors.caller = 'Caller name is required';
    if (!formData.category_id) errors.category_id = 'Category is required';
    if (!formData.subcategory_id) errors.subcategory_id = 'Sub Category is required';
    if (!formData.contact_type_id) errors.contact_type_id = 'Contact Type is required';
    if (!formData.impact_id) errors.impact_id = 'Impact is required';
    if (!formData.urgency_id) errors.urgency_id = 'Urgency is required';
    if (!formData.short_description.trim()) errors.short_description = 'Short description is required';
    if (!formData.description.trim()) errors.description = 'Detailed description is required';
    if (!formData.postcode.trim()) {
      errors.postcode = 'Postcode is required';
    } else if (!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(formData.postcode.trim())) {
      errors.postcode = 'Please enter a valid UK postcode';
    }
    if (!formData.address.trim()) errors.address = 'Address is required';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    setError(null);

    try {
      const currentUser = getCurrentUser();
      if (!currentUser?.id) throw new Error('User not authenticated');

      const incidentData = {
        user_id: parseInt(currentUser.id),
        incidentstate_id: 1,
        urgency_id: parseInt(formData.urgency_id),
        category_id: parseInt(formData.category_id),
        subcategory_id: parseInt(formData.subcategory_id),
        contact_type_id: parseInt(formData.contact_type_id),
        impact_id: parseInt(formData.impact_id),
        short_description: formData.short_description,
        description: formData.description,
        address: formData.address,
        postcode: formData.postcode,
        lat: formData.latitude ? parseFloat(formData.latitude) : null,
        lng: formData.longitude ? parseFloat(formData.longitude) : null,
        asset_id: formData.asset_id ? parseInt(formData.asset_id) : null,
        site_id: formData.site_id ? parseInt(formData.site_id) : null
      };

      console.log('Creating incident with data:', incidentData);

      // Validate required fields
      if (!incidentData.user_id || isNaN(incidentData.user_id)) {
        throw new Error('Invalid user ID');
      }
      if (!incidentData.category_id || isNaN(incidentData.category_id)) {
        throw new Error('Invalid category ID');
      }
      if (!incidentData.subcategory_id || isNaN(incidentData.subcategory_id)) {
        throw new Error('Invalid subcategory ID');
      }

      const createdIncident = await createIncident(incidentData);

      if (onIncidentCreated) {
        onIncidentCreated(createdIncident);
      }

      setShowSuccess(true);

      // Reset form
      setFormData({
        caller: userName || '',
        category_id: '',
        subcategory_id: '',
        short_description: '',
        contact_type_id: masterData.contactTypes[0]?.id?.toString() || '',
        impact_id: masterData.impacts[0]?.id?.toString() || '',
        urgency_id: masterData.urgencies[0]?.id?.toString() || '',
        description: '',
        address: '',
        postcode: '',
        latitude: '',
        longitude: '',
        asset_id: '',
        site_id: ''
      });

      // Clear subcategories and AI descriptions since category was reset
      setMasterData(prev => ({ ...prev, subcategories: [] }));
      setAiDescriptions([]);

      setTimeout(() => {
        setShowSuccess(false);
        if (onSuccess) onSuccess();
      }, 3000);

    } catch (error: any) {
      console.error('Error creating incident:', error);
      setError(error.message || 'Failed to create incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSubCategoryOptions = () => {
    if (!formData.category_id) {
      return [];
    }

    const selectedCategoryId = parseInt(formData.category_id);
    return masterData.subcategories.filter(subcat =>
      subcat.category_id === selectedCategoryId
    );
  };

  const getCategoryName = (id: string) => {
    const category = masterData.categories.find(cat => cat.id === parseInt(id));
    return category?.name || '';
  };

  const getSubCategoryName = (id: string) => {
    const subCat = masterData.subcategories.find(sub => sub.id === parseInt(id));
    return subCat?.name || '';
  };

  const getImpactName = (id: string) => {
    const impact = masterData.impacts.find(imp => imp.id === parseInt(id));
    return impact?.name || '';
  };

  const getUrgencyName = (id: string) => {
    const urgency = masterData.urgencies.find(urg => urg.id === parseInt(id));
    return urgency?.name || '';
  };

  const getContactTypeName = (id: string) => {
    const contactType = masterData.contactTypes.find(ct => ct.id === parseInt(id));
    return contactType?.name || '';
  };

  const getAssetName = (id: string) => {
    const asset = masterData.assets.find(asset => asset.id === parseInt(id));
    return asset?.name || '';
  };

  const getSiteName = (id: string) => {
    const site = masterData.sites.find(site => site.id === parseInt(id));
    return site?.premises || site?.catchment || `Site ${id}` || '';
  };

  if (masterData.loading) {
    return (
      <Container fluid>
        <Card>
          <CardBody>
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading form data...</p>
            </div>
          </CardBody>
        </Card>
      </Container>
    );
  }

  if (masterData.error) {
    return (
      <Container fluid>
        <Card>
          <CardBody>
            <Alert color="danger">
              <strong>Error:</strong> {masterData.error}
              <div className="mt-2">
                <Button color="danger" size="sm" onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            </Alert>
          </CardBody>
        </Card>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Card>
        <CardBody>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h4 className="mb-0">New Incident Creation</h4>
              <small className="text-muted">Reporting as: {userRole} ({userName})</small>
            </div>
            {showBackButton && onCancel && (
              <Button color="secondary" size="sm" onClick={onCancel}>
                ← Back to Dashboard
              </Button>
            )}
          </div>

          {error && (
            <Alert color="danger" className="mb-4">
              <strong>Error!</strong> {error}
            </Alert>
          )}

          {showSuccess && (
            <Alert color="success" className="mb-4">
              <strong>Success!</strong> Incident has been created successfully!
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label for="caller">Caller Name *</Label>
                  <Input
                    type="text"
                    id="caller"
                    name="caller"
                    value={formData.caller}
                    onChange={handleInputChange}
                    placeholder="Enter caller's name"
                    required
                    invalid={!!validationErrors.caller}
                  />
                  {validationErrors.caller && (
                    <div className="invalid-feedback">{validationErrors.caller}</div>
                  )}
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label for="contact_type_id">Contact Type *</Label>
                  <Input
                    type="select"
                    id="contact_type_id"
                    name="contact_type_id"
                    value={formData.contact_type_id}
                    onChange={handleInputChange}
                    required
                    invalid={!!validationErrors.contact_type_id}
                  >
                    <option value="">Select Contact Type</option>
                    {masterData.contactTypes.map(option => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </Input>
                  {validationErrors.contact_type_id && (
                    <div className="invalid-feedback">{validationErrors.contact_type_id}</div>
                  )}
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label for="category_id">Category *</Label>
                  <Input
                    type="select"
                    id="category_id"
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    required
                    invalid={!!validationErrors.category_id}
                  >
                    <option value="">Select Category</option>
                    {masterData.categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </Input>
                  {validationErrors.category_id && (
                    <div className="invalid-feedback">{validationErrors.category_id}</div>
                  )}
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label for="subcategory_id">Sub Category *</Label>
                  <Input
                    type="select"
                    id="subcategory_id"
                    name="subcategory_id"
                    value={formData.subcategory_id}
                    onChange={handleInputChange}
                    required
                    disabled={!formData.category_id || subcategoriesLoading}
                    invalid={!!validationErrors.subcategory_id}
                  >
                    <option value="">
                      {subcategoriesLoading
                        ? "Loading subcategories..."
                        : !formData.category_id
                          ? "Select Category first"
                          : getSubCategoryOptions().length === 0
                            ? "No subcategories available"
                            : "Select Sub Category"}
                    </option>
                    {getSubCategoryOptions().map(subCat => (
                      <option key={subCat.id} value={subCat.id}>{subCat.name}</option>
                    ))}
                  </Input>
                  {subcategoriesLoading && (
                    <small className="text-info">
                      <i className="fa fa-spinner fa-spin me-1"></i>
                      Loading subcategories...
                    </small>
                  )}
                  {validationErrors.subcategory_id && (
                    <div className="invalid-feedback">{validationErrors.subcategory_id}</div>
                  )}
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label for="impact_id">Impact *</Label>
                  <Input
                    type="select"
                    id="impact_id"
                    name="impact_id"
                    value={formData.impact_id}
                    onChange={handleInputChange}
                    required
                    invalid={!!validationErrors.impact_id}
                  >
                    <option value="">Select Impact</option>
                    {masterData.impacts.map(option => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </Input>
                  {validationErrors.impact_id && (
                    <div className="invalid-feedback">{validationErrors.impact_id}</div>
                  )}
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label for="urgency_id">Urgency *</Label>
                  <Input
                    type="select"
                    id="urgency_id"
                    name="urgency_id"
                    value={formData.urgency_id}
                    onChange={handleInputChange}
                    required
                    invalid={!!validationErrors.urgency_id}
                  >
                    <option value="">Select Urgency</option>
                    {masterData.urgencies.map(option => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </Input>
                  {validationErrors.urgency_id && (
                    <div className="invalid-feedback">{validationErrors.urgency_id}</div>
                  )}
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label for="asset_id">Asset</Label>
                  <Input
                    type="select"
                    id="asset_id"
                    name="asset_id"
                    value={formData.asset_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Asset (Optional)</option>
                    {masterData.assets.map(option => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label for="site_id">Site</Label>
                  <Input
                    type="select"
                    id="site_id"
                    name="site_id"
                    value={formData.site_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Site (Optional)</option>
                    {masterData.sites.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.premises || option.catchment || `Site ${option.id}`}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label for="postcode">Postcode *</Label>
                  <Input
                    type="text"
                    id="postcode"
                    name="postcode"
                    value={formData.postcode}
                    onChange={handleInputChange}
                    placeholder="e.g., SW1A 1AA"
                    required
                    invalid={!!validationErrors.postcode}
                    style={{ textTransform: 'uppercase' }}
                  />
                  {loadingAddress && (
                    <small className="text-info">
                      <i className="fa fa-spinner fa-spin me-1"></i>
                      Looking up address...
                    </small>
                  )}
                  {validationErrors.postcode && (
                    <div className="invalid-feedback">{validationErrors.postcode}</div>
                  )}
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label for="address">Address/Location *</Label>
                  <Input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Address will be auto-filled from postcode"
                    required
                    invalid={!!validationErrors.address}
                  />
                  <small className="text-muted d-block mt-1">
                    Address will be auto-filled from postcode
                  </small>
                  {validationErrors.address && (
                    <div className="invalid-feedback">{validationErrors.address}</div>
                  )}
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <FormGroup>
                  <Label for="short_description">Short Description *</Label>
                  <Input
                    type="text"
                    id="short_description"
                    name="short_description"
                    value={formData.short_description}
                    onChange={handleInputChange}
                    placeholder="Brief summary of the incident"
                    required
                    maxLength={100}
                    invalid={!!validationErrors.short_description}
                  />
                  <small className="text-muted">
                    {formData.short_description.length}/100 characters
                  </small>
                  {validationErrors.short_description && (
                    <div className="invalid-feedback">{validationErrors.short_description}</div>
                  )}
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <FormGroup>
                  <Label for="description">Detailed Description *</Label>
                  <Input
                    type="textarea"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Provide detailed information about the incident (or use AI generated options below)"
                    rows={4}
                    required
                    invalid={!!validationErrors.description}
                  />
                  {validationErrors.description && (
                    <div className="invalid-feedback">{validationErrors.description}</div>
                  )}
                </FormGroup>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <FormGroup>
                  <div className="d-flex justify-content-center mb-3">
                    <Button
                      type="button"
                      color="info"
                      size="sm"
                      onClick={handleAIGeneration}
                      disabled={!formData.category_id || !formData.subcategory_id || isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" />
                          Generating...
                        </>
                      ) : (
                        <>🤖 Generate 3 Options</>
                      )}
                    </Button>
                  </div>

                  {/* AI Generated Options */}
                  {aiDescriptions.length > 0 && (
                    <div className="mb-3 p-3 border rounded bg-light">
                      <small className="text-muted d-block mb-2">
                        <strong>AI Generated Options:</strong> Click any option to use it as your description
                      </small>
                      {aiDescriptions.map((description, index) => (
                        <div key={index} className="mb-2">
                          <Button
                            type="button"
                            color="outline-primary"
                            size="sm"
                            className="w-100 text-start"
                            style={{
                              whiteSpace: 'normal',
                              height: 'auto',
                              padding: '8px 12px',
                              fontSize: '0.9rem',
                              lineHeight: '1.4'
                            }}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, description: description }));
                              setAiDescriptions([]); // Clear options after selection
                            }}
                          >
                            <strong>Option {index + 1}:</strong> {description}
                          </Button>
                        </div>
                      ))}
                      <div className="mt-2">
                        <Button
                          type="button"
                          color="secondary"
                          size="sm"
                          onClick={() => setAiDescriptions([])}
                        >
                          Clear Options
                        </Button>
                      </div>
                    </div>
                  )}
                </FormGroup>
              </Col>
            </Row>

            <div className="d-flex justify-content-end gap-2 mt-4">
              {onCancel && (
                <Button type="button" color="secondary" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                color="primary"
                disabled={isSubmitting}
                className="d-flex align-items-center"
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Submitting...
                  </>
                ) : (
                  'Submit Incident'
                )}
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Incident Submission</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowConfirmModal(false)}
                >
                </button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to submit this incident?</p>
                <div className="bg-light p-3 rounded text-dark">
                  <div className="row">
                    <div className="col-6">
                      <strong>Category:</strong> {getCategoryName(formData.category_id)}<br/>
                      <strong>Sub Category:</strong> {getSubCategoryName(formData.subcategory_id)}<br/>
                      <strong>Contact Type:</strong> {getContactTypeName(formData.contact_type_id)}<br/>
                    </div>
                    <div className="col-6">
                      <strong>Impact:</strong> {getImpactName(formData.impact_id)}<br/>
                      <strong>Urgency:</strong> {getUrgencyName(formData.urgency_id)}<br/>
                      <strong>Postcode:</strong> {formData.postcode}<br/>
                    </div>
                  </div>
                  <div className="mt-2">
                    <strong>Address:</strong> {formData.address}<br/>
                    <strong>Short Description:</strong> {formData.short_description}
                  </div>
                  {(formData.asset_id || formData.site_id) && (
                    <div className="mt-2">
                      {formData.asset_id && <><strong>Asset:</strong> {getAssetName(formData.asset_id)}<br/></>}
                      {formData.site_id && <><strong>Site:</strong> {getSiteName(formData.site_id)}</>}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <Button color="secondary" onClick={() => setShowConfirmModal(false)}>
                  Cancel
                </Button>
                <Button color="primary" onClick={handleConfirmSubmit}>
                  Submit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default IncidentCreationForm;
