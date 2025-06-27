'use client'
import React, { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter, Row, Col, Button, Badge, Nav, NavItem, NavLink, TabContent, TabPane, Form, FormGroup, Label, Input, Table, Alert } from 'reactstrap'
import {
  getStatusColor,
  getPriorityColor,
  formatDate,
  type Incident
} from '../app/(MainBody)/services/incidentService';
import { getCurrentUser } from '../app/(MainBody)/services/userService';
import {
  fetchCategories,
  fetchSubcategories,
  fetchContactTypes,
  fetchImpacts,
  fetchUrgencies,
  fetchIncidentStates,
  fetchAssets,
  fetchSites,
} from '../app/(MainBody)/services/masterService';

interface EditIncidentProps {
  incident: any;
  userType?: string;
  onClose: () => void;
  onSave: () => void;
}

const API_BASE = 'https://apexwpc.apextechno.co.uk/api';

const EditIncident: React.FC<EditIncidentProps> = ({ incident, userType, onClose, onSave }) => {
  // ========== STATE MANAGEMENT ==========
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Master data states
  const [masterData, setMasterData] = useState({
    categories: [] as Array<{id: number, name: string}>,
    subCategories: [] as Array<{id: number, name: string, category_id: number}>,
    contactTypes: [] as Array<{id: number, name: string}>,
    urgencies: [] as Array<{id: number, name: string}>,
    impacts: [] as Array<{id: number, name: string}>,
    incidentStates: [] as Array<{id: number, name: string}>,
    assets: [] as Array<{id: number, name: string}>,
    sites: [] as Array<{id: number, name: string}>,
    loading: false,
    error: null as string | null
  });

  // Evidence tab states
  const [uploadedImages, setUploadedImages] = useState<Array<{
    id: number;
    name: string;
    url: string;
    uploadedAt: string;
    size: string;
  }>>([]);

  const [ammoniaReadings, setAmmoniaReadings] = useState<Array<{
    id: number;
    type: string;
    reading: string;
    date: string;
    unit: string;
  }>>([]);

  const [actions, setActions] = useState<Array<{
    id: string;
    action_type_id: string;
    action_status_id: string;
    action_priority_id: string;
    detail: string;
    raised: string;
    complete: boolean;
    created_at: string;
  }>>([]);

  const [similarIncidents, setSimilarIncidents] = useState<any[]>([]);

  // Form states
  const [editForm, setEditForm] = useState({
    shortDescription: '',
    description: ''
  });

  const [advancedEditForm, setAdvancedEditForm] = useState({
    shortDescription: '',
    description: '',
    categoryId: '',
    subCategoryId: '',
    contactTypeId: '',
    impactId: '',
    urgencyId: '',
    statusId: '',
    narration: '',
    assignedTo: '',
    assetId: '',
    siteId: ''
  });

  const [newAmmoniaReading, setNewAmmoniaReading] = useState({
    type: 'downstream',
    date: '',
    reading: ''
  });

  const [newAction, setNewAction] = useState({
    actionType: '',
    actionStatus: '',
    priority: '',
    raisedOn: '',
    details: '',
    isComplete: false
  });

  // SLA Status state
  const [slaStatus, setSlaStatus] = useState({
    name: '',
    type: '',
    target: '',
    stage: '',
    businessTimeLeft: '',
    businessTimeElapsed: '',
    startTime: '',
    percentage: 0
  });

  // ========== PERMISSION HELPERS ==========
  const hasAdvancedEditPermissions = () => {
    const currentUserType = userType?.toLowerCase() || '';
    return currentUserType.includes('handler') ||
           currentUserType.includes('manager') ||
           currentUserType.includes('admin') ||
           currentUserType.includes('field_engineer') ||
           currentUserType.includes('expert_team');
  };

  const shouldShowIncidentStatusFlow = () => {
    const currentUserType = userType?.toLowerCase() || '';
    return (currentUserType.includes('handler') ||
            currentUserType.includes('manager') ||
            currentUserType.includes('admin') ||
            currentUserType.includes('expert_team')) &&
           !currentUserType.includes('field_engineer');
  };

  // ========== DATA LOADING FUNCTIONS ==========
  const loadMasterData = async () => {
    setMasterData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [
        categoriesRes,
        contactTypesRes,
        impactsRes,
        urgenciesRes,
        incidentStatesRes,
        assetsRes,
        sitesRes
      ] = await Promise.all([
        fetchCategories(),
        fetchContactTypes(),
        fetchImpacts(),
        fetchUrgencies(),
        fetchIncidentStates(),
        fetchAssets(),
        fetchSites()
      ]);

      setMasterData(prev => ({
        ...prev,
        categories: categoriesRes.data || [],
        contactTypes: contactTypesRes.data || [],
        impacts: impactsRes.data || [],
        urgencies: urgenciesRes.data || [],
        incidentStates: incidentStatesRes.data || [],
        assets: assetsRes.data || [],
        sites: sitesRes.data || [],
        loading: false,
        error: null
      }));

    } catch (error: any) {
      setMasterData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load master data'
      }));
    }
  };

  const loadSubCategories = async (categoryId: string) => {
    if (!categoryId) {
      setMasterData(prev => ({ ...prev, subCategories: [] }));
      return;
    }

    try {
      const response = await fetchSubcategories(categoryId);
      setMasterData(prev => ({
        ...prev,
        subCategories: response.data || []
      }));
    } catch (error: any) {
      setMasterData(prev => ({ ...prev, subCategories: [] }));
    }
  };

  const loadSLAStatus = async () => {
    try {
      const incidentId = incident.id;
      const response = await fetch(`${API_BASE}/incident-sla-details?incident_id=${incidentId}`);
      if (response.ok) {
        const slaData = await response.json();
        if (slaData.success && slaData.data) {
          setSlaStatus({
            name: slaData.data.sla_name || '',
            type: slaData.data.sla_type || '',
            target: slaData.data.target_time || '',
            stage: slaData.data.current_stage || '',
            businessTimeLeft: slaData.data.business_time_left || '',
            businessTimeElapsed: slaData.data.business_time_elapsed || '',
            startTime: slaData.data.start_time || '',
            percentage: slaData.data.percentage_elapsed || 0
          });
        }
      }
    } catch (error) {
      // Silent fail for SLA status
    }
  };

  const loadExistingData = async () => {
    if (!hasAdvancedEditPermissions()) return;

    try {
      const incidentId = incident.id;

      // Load existing evidence photos
      try {
        const photosRes = await fetch(`${API_BASE}/incident-handler/evidence-photos/${incidentId}`);
        if (photosRes.ok) {
          const photosData = await photosRes.json();
          if (photosData.success && photosData.data) {
            setUploadedImages(photosData.data.map((photo: any) => ({
              id: photo.id,
              name: photo.name || 'Evidence Photo',
              url: photo.url,
              uploadedAt: new Date(photo.created_at).toLocaleString(),
              size: photo.size || 'Unknown'
            })));
          }
        }
      } catch (error) {
        // Silent fail for photos
      }

      // Load existing ammonia readings
      try {
        const readingsRes = await fetch(`${API_BASE}/incident-handler/ammonia-readings/${incidentId}`);
        if (readingsRes.ok) {
          const readingsData = await readingsRes.json();
          if (readingsData.success && readingsData.data) {
            setAmmoniaReadings(readingsData.data.map((reading: any) => ({
              id: reading.id,
              type: reading.type,
              reading: reading.reading,
              date: reading.sample_date,
              unit: 'mg/L'
            })));
          }
        }
      } catch (error) {
        // Silent fail for readings
      }

      // Load existing actions
      try {
        const actionsRes = await fetch(`${API_BASE}/incident-handler/actions/${incidentId}`);
        if (actionsRes.ok) {
          const actionsData = await actionsRes.json();
          if (actionsData.success && actionsData.data) {
            setActions(actionsData.data);
          }
        }
      } catch (error) {
        // Silent fail for actions
      }

      // Load similar incidents for knowledge base
      try {
        const similarRes = await fetch(`${API_BASE}/incident-handeler/similar-incidents/${incidentId}`);
        if (similarRes.ok) {
          const similarData = await similarRes.json();
          if (similarData.success && similarData.data) {
            setSimilarIncidents(similarData.data);
          }
        }
      } catch (error) {
        // Silent fail for similar incidents
      }

    } catch (error) {
      // Silent fail for existing data
    }
  };

  // ========== INITIALIZATION ==========
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    const loadIncidentData = async () => {
      try {
        setLoading(true);

        // Load master data first
        await loadMasterData();

        if (hasAdvancedEditPermissions()) {
          // Populate advanced form with incident data
          const categoryId = incident.category_id?.toString() || incident.category?.id?.toString() || '';
          const subCategoryId = incident.subcategory_id?.toString() || incident.subcategory?.id?.toString() || '';

          setAdvancedEditForm({
            shortDescription: incident.short_description || '',
            description: incident.description || '',
            categoryId: categoryId,
            subCategoryId: subCategoryId,
            contactTypeId: incident.contact_type_id?.toString() || incident.contact_type?.id?.toString() || '',
            impactId: incident.impact_id?.toString() || incident.impact?.id?.toString() || '',
            urgencyId: incident.urgency_id?.toString() || incident.urgency?.id?.toString() || '',
            statusId: incident.incidentstate_id?.toString() || incident.incident_state?.id?.toString() || '',
            narration: incident.narration || '',
            assignedTo: incident.assigned_to?.name || '',
            assetId: incident.asset_id?.toString() || incident.asset?.id?.toString() || '',
            siteId: incident.site_id?.toString() || incident.site?.id?.toString() || ''
          });

          // Load subcategories if category is selected
          if (categoryId) {
            await loadSubCategories(categoryId);
          }

          // Load existing evidence and actions
          await loadExistingData();

          // Load SLA details
          await loadSLAStatus();
        } else {
          // Populate simple form with existing incident data
          setEditForm({
            shortDescription: incident.short_description || '',
            description: incident.description || ''
          });
        }

      } catch (error: any) {
        setError('Failed to load incident data');
      } finally {
        setLoading(false);
      }
    };

    loadIncidentData();
  }, [incident]);

  // ========== EVENT HANDLERS ==========
  const handleCategoryChange = async (categoryId: string) => {
    setAdvancedEditForm(prev => ({
      ...prev,
      categoryId,
      subCategoryId: '' // Reset subcategory when category changes
    }));
    await loadSubCategories(categoryId);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('url', file);
        formData.append('incident_id', incident.id.toString());

        const response = await fetch(`${API_BASE}/incident-handler/evidence-photo`, {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const responseText = await response.text();
          let uploadResult;

          try {
            uploadResult = JSON.parse(responseText);
          } catch {
            uploadResult = { success: true };
          }

          const newImage = {
            id: uploadResult.photo_id || Date.now() + Math.random(),
            name: file.name,
            url: uploadResult.photo_url || URL.createObjectURL(file),
            uploadedAt: new Date().toLocaleString(),
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
          };

          setUploadedImages(prev => [...prev, newImage]);
          setSuccess('Image uploaded successfully');
        } else {
          const errorText = await response.text();
          throw new Error(`Upload failed: ${response.status} - ${errorText}`);
        }
      }
    } catch (error: any) {
      setError(`Failed to upload images: ${error.message}`);
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleImageDelete = async (id: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/incident-handler/evidence-photo/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setUploadedImages(prev => prev.filter(img => img.id !== id));
        setSuccess('Image deleted successfully');
      } else {
        throw new Error('Failed to delete image');
      }
    } catch (error: any) {
      setError(`Failed to delete image: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAmmoniaSubmit = async () => {
    if (!newAmmoniaReading.type || !newAmmoniaReading.date || !newAmmoniaReading.reading) {
      setError('Please fill in all ammonia reading fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestBody = {
        incident_id: parseInt(incident.id.toString()),
        type: newAmmoniaReading.type,
        sample_date: newAmmoniaReading.date,
        reading: parseFloat(newAmmoniaReading.reading)
      };

      const response = await fetch(`${API_BASE}/incident-handler/ammonia-reading`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const responseText = await response.text();
        let result;

        try {
          result = JSON.parse(responseText);
        } catch {
          result = { success: true };
        }

        const newReading = {
          id: result.reading_id || Date.now(),
          type: newAmmoniaReading.type,
          reading: newAmmoniaReading.reading,
          date: newAmmoniaReading.date,
          unit: 'mg/L'
        };

        setAmmoniaReadings(prev => [...prev, newReading]);
        setNewAmmoniaReading({ type: 'downstream', date: '', reading: '' });
        setSuccess('Ammonia reading submitted successfully');
      } else {
        const errorText = await response.text();
        throw new Error(`Submission failed: ${response.status} - ${errorText}`);
      }
    } catch (error: any) {
      setError(`Failed to submit ammonia reading: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleActionSubmit = async () => {
    setError('Action functionality temporarily disabled - master data APIs not available');
    return;
  };

  const handleSaveEdit = async () => {
    if (!currentUser?.id) {
      setError('User authentication error. Please log in again.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      let updateData: any = {
        user_id: parseInt(currentUser.id),
        incident_id: parseInt(incident.id.toString()),
        from: parseInt(currentUser.id),
        to: parseInt(currentUser.id)
      };

      if (hasAdvancedEditPermissions()) {
        updateData = {
          ...updateData,
          short_description: advancedEditForm.shortDescription,
          description: advancedEditForm.description,
          category_id: advancedEditForm.categoryId ? parseInt(advancedEditForm.categoryId) : null,
          subcategory_id: advancedEditForm.subCategoryId ? parseInt(advancedEditForm.subCategoryId) : null,
          contact_type_id: advancedEditForm.contactTypeId ? parseInt(advancedEditForm.contactTypeId) : null,
          impact_id: advancedEditForm.impactId ? parseInt(advancedEditForm.impactId) : null,
          urgency_id: advancedEditForm.urgencyId ? parseInt(advancedEditForm.urgencyId) : null,
          incidentstate_id: advancedEditForm.statusId ? parseInt(advancedEditForm.statusId) : null,
          narration: advancedEditForm.narration || null,
          asset_id: advancedEditForm.assetId ? parseInt(advancedEditForm.assetId) : null,
          site_id: advancedEditForm.siteId ? parseInt(advancedEditForm.siteId) : null
        };
      } else {
        updateData = {
          ...updateData,
          short_description: editForm.shortDescription,
          description: editForm.description
        };
      }

      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/incident-handler/edit-incident`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const responseText = await response.text();
        let result;
        try {
          result = JSON.parse(responseText);
        } catch {
          result = { success: true };
        }

        if (result.success !== false) {
          setSuccess('Incident updated successfully');
          setTimeout(() => {
            onSave(); // Trigger parent refresh
          }, 1500);
        } else {
          throw new Error(result.message || 'Update failed');
        }
      } else {
        const errorText = await response.text();
        throw new Error(`Update request failed: ${response.status} - ${errorText}`);
      }

    } catch (error: any) {
      setError(error.message || 'Failed to update incident');
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // ========== UTILITY FUNCTIONS ==========
  const getSLAColor = () => {
    if (slaStatus.percentage >= 100) return 'danger';
    if (slaStatus.percentage >= 80) return 'warning';
    return 'success';
  };

  const getCategoryName = (id: string) => {
    const category = masterData.categories.find(cat => cat.id === parseInt(id));
    return category?.name || '';
  };

  const getSubCategoryName = (id: string) => {
    const subCat = masterData.subCategories.find(sub => sub.id === parseInt(id));
    return subCat?.name || '';
  };

  const getContactTypeName = (id: string) => {
    const contactType = masterData.contactTypes.find(ct => ct.id === parseInt(id));
    return contactType?.name || '';
  };

  const getImpactName = (id: string) => {
    const impact = masterData.impacts.find(imp => imp.id === parseInt(id));
    return impact?.name || '';
  };

  const getUrgencyName = (id: string) => {
    const urgency = masterData.urgencies.find(urg => urg.id === parseInt(id));
    return urgency?.name || '';
  };

  const getIncidentStateName = (id: string) => {
    const state = masterData.incidentStates.find(state => state.id === parseInt(id));
    return state?.name || '';
  };

  const getAssetName = (id: string) => {
    const asset = masterData.assets.find(asset => asset.id === parseInt(id));
    return asset?.name || '';
  };

  const getSiteName = (id: string) => {
    const site = masterData.sites.find(site => site.id === parseInt(id));
    return site?.name || '';
  };

  // ========== LOADING STATES ==========
  if (masterData.loading) {
    return (
      <Modal isOpen={true} toggle={onClose} size="xl" style={{ maxWidth: '95vw', width: '95vw' }}>
        <ModalHeader toggle={onClose}>
          Edit Incident - {incident.incident_no || incident.number || 'N/A'}
        </ModalHeader>
        <ModalBody style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading form data...</span>
            </div>
            <p className="mt-2 text-muted">Loading incident details and options...</p>
          </div>
        </ModalBody>
      </Modal>
    );
  }

  if (masterData.error) {
    return (
      <Modal isOpen={true} toggle={onClose} size="xl" style={{ maxWidth: '95vw', width: '95vw' }}>
        <ModalHeader toggle={onClose}>
          Edit Incident - {incident.incident_no || incident.number || 'N/A'}
        </ModalHeader>
        <ModalBody style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <Alert color="danger">
            <strong>Error loading form data:</strong> {masterData.error}
            <div className="mt-2">
              <Button color="danger" size="sm" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </Alert>
        </ModalBody>
      </Modal>
    );
  }

  // ========== MAIN RENDER ==========
  return (
    <Modal isOpen={true} toggle={onClose} size="xl" style={{ maxWidth: '95vw', width: '95vw' }}>
      <ModalHeader toggle={onClose}>
        Edit Incident - {incident.incident_no || incident.number || 'N/A'}
        {currentUser && (
          <div className="ms-3">
            <small className="text-muted">Editing as: {currentUser.name} (ID: {currentUser.id})</small>
          </div>
        )}
      </ModalHeader>

      <ModalBody style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        {/* Error and Success Messages */}
        {error && (
          <Alert color="danger" toggle={clearMessages}>
            <strong>Error:</strong> {error}
          </Alert>
        )}
        {success && (
          <Alert color="success" toggle={clearMessages}>
            <strong>Success:</strong> {success}
          </Alert>
        )}

        {/* Incident Status Flow - Hidden for field engineers */}
        {shouldShowIncidentStatusFlow() && (
          <div className="mb-4">
            <h6 className="text-dark mb-3">Incident State Flow</h6>
            <div className="d-flex w-100" style={{ height: '50px' }}>
              <div
                className={`d-flex align-items-center justify-content-center text-white ${incident.status === 'pending' ? 'fw-bold' : ''}`}
                style={{
                  flex: 1,
                  height: '50px',
                  backgroundColor: incident.status === 'pending' ? '#007bff' : '#6c757d',
                  position: 'relative',
                  clipPath: 'polygon(0 0, calc(100% - 25px) 0, 100% 50%, calc(100% - 25px) 100%, 0 100%)',
                  zIndex: 4
                }}
              >
                Pending
              </div>
              <div
                className={`d-flex align-items-center justify-content-center text-white ${incident.status === 'in_progress' ? 'fw-bold' : ''}`}
                style={{
                  flex: 1,
                  height: '50px',
                  backgroundColor: incident.status === 'in_progress' ? '#007bff' : '#6c757d',
                  position: 'relative',
                  clipPath: 'polygon(25px 0, calc(100% - 25px) 0, 100% 50%, calc(100% - 25px) 100%, 25px 100%, 0 50%)',
                  marginLeft: '-25px',
                  zIndex: 3
                }}
              >
                In Progress
              </div>
              <div
                className={`d-flex align-items-center justify-content-center text-white ${incident.status === 'resolved' ? 'fw-bold' : ''}`}
                style={{
                  flex: 1,
                  height: '50px',
                  backgroundColor: incident.status === 'resolved' ? '#007bff' : '#6c757d',
                  position: 'relative',
                  clipPath: 'polygon(25px 0, calc(100% - 25px) 0, 100% 50%, calc(100% - 25px) 100%, 25px 100%, 0 50%)',
                  marginLeft: '-25px',
                  zIndex: 1
                }}
              >
                Resolved
              </div>
              <div
                className={`d-flex align-items-center justify-content-center text-white ${incident.status === 'closed' ? 'fw-bold' : ''}`}
                style={{
                  flex: 1,
                  height: '50px',
                  backgroundColor: incident.status === 'closed' ? '#007bff' : '#6c757d',
                  position: 'relative',
                  clipPath: 'polygon(25px 0, 100% 0, 100% 100%, 25px 100%, 0 50%)',
                  marginLeft: '-25px',
                  zIndex: 0
                }}
              >
                Closed
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs - Only for advanced users */}
        {hasAdvancedEditPermissions() ? (
          <Nav tabs className="mb-4">
            <NavItem>
              <NavLink
                className={activeTab === 'details' ? 'active' : ''}
                onClick={() => setActiveTab('details')}
                style={{ cursor: 'pointer' }}
              >
                Incident Details
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === 'evidence' ? 'active' : ''}
                onClick={() => setActiveTab('evidence')}
                style={{ cursor: 'pointer' }}
              >
                Evidence ({uploadedImages.length + ammoniaReadings.length})
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === 'action' ? 'active' : ''}
                onClick={() => setActiveTab('action')}
                style={{ cursor: 'pointer' }}
              >
                Actions ({actions.length})
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === 'knowledge' ? 'active' : ''}
                onClick={() => setActiveTab('knowledge')}
                style={{ cursor: 'pointer' }}
              >
                Knowledge Base ({similarIncidents.length})
              </NavLink>
            </NavItem>
          </Nav>
        ) : null}

        {/* Tab Content */}
        <TabContent activeTab={hasAdvancedEditPermissions() ? activeTab : 'details'}>
          {/* DETAILS TAB */}
          <TabPane tabId="details">
            {hasAdvancedEditPermissions() ? (
              <>
                <h5 className="text-dark mb-4">Edit Incident Details</h5>
                <Form>
                  <Row>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="incidentNo" className="text-dark">Incident No</Label>
                        <Input
                          type="text"
                          id="incidentNo"
                          value={incident.incident_no || incident.number || 'N/A'}
                          disabled
                          className="bg-light"
                        />
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="contactType" className="text-dark">Contact Type</Label>
                        <Input
                          type="select"
                          id="contactType"
                          value={advancedEditForm.contactTypeId}
                          onChange={(e) => setAdvancedEditForm({...advancedEditForm, contactTypeId: e.target.value})}
                        >
                          <option value="">Select Contact Type</option>
                          {masterData.contactTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="category" className="text-dark">Category</Label>
                        <Input
                          type="select"
                          id="category"
                          value={advancedEditForm.categoryId}
                          onChange={(e) => handleCategoryChange(e.target.value)}
                        >
                          <option value="">Select Category</option>
                          {masterData.categories.map(category => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="subCategory" className="text-dark">Sub Category</Label>
                        <Input
                          type="select"
                          id="subCategory"
                          value={advancedEditForm.subCategoryId}
                          onChange={(e) => setAdvancedEditForm({...advancedEditForm, subCategoryId: e.target.value})}
                          disabled={!advancedEditForm.categoryId}
                        >
                          <option value="">Select Sub Category</option>
                          {masterData.subCategories.map(subCat => (
                            <option key={subCat.id} value={subCat.id}>{subCat.name}</option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="asset" className="text-dark">Asset</Label>
                        <Input
                          type="select"
                          id="asset"
                          value={advancedEditForm.assetId}
                          onChange={(e) => setAdvancedEditForm({...advancedEditForm, assetId: e.target.value})}
                        >
                          <option value="">Select Asset</option>
                          {masterData.assets.map(asset => (
                            <option key={asset.id} value={asset.id}>{asset.name}</option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="site" className="text-dark">Site</Label>
                        <Input
                          type="select"
                          id="site"
                          value={advancedEditForm.siteId}
                          onChange={(e) => setAdvancedEditForm({...advancedEditForm, siteId: e.target.value})}
                        >
                          <option value="">Select Site</option>
                          {masterData.sites.map(site => (
                            <option key={site.id} value={site.id}>{site.name}</option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="shortDescription" className="text-dark">Short Description</Label>
                        <Input
                          type="textarea"
                          id="shortDescription"
                          rows="3"
                          value={advancedEditForm.shortDescription}
                          onChange={(e) => setAdvancedEditForm({...advancedEditForm, shortDescription: e.target.value})}
                        />
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="description" className="text-dark">Description</Label>
                        <Input
                          type="textarea"
                          id="description"
                          rows="3"
                          value={advancedEditForm.description}
                          onChange={(e) => setAdvancedEditForm({...advancedEditForm, description: e.target.value})}
                        />
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="impact" className="text-dark">Impact</Label>
                        <Input
                          type="select"
                          id="impact"
                          value={advancedEditForm.impactId}
                          onChange={(e) => setAdvancedEditForm({...advancedEditForm, impactId: e.target.value})}
                        >
                          <option value="">Select Impact</option>
                          {masterData.impacts.map(impact => (
                            <option key={impact.id} value={impact.id}>{impact.name}</option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="urgency" className="text-dark">Urgency</Label>
                        <Input
                          type="select"
                          id="urgency"
                          value={advancedEditForm.urgencyId}
                          onChange={(e) => setAdvancedEditForm({...advancedEditForm, urgencyId: e.target.value})}
                        >
                          <option value="">Select Urgency</option>
                          {masterData.urgencies.map(urgency => (
                            <option key={urgency.id} value={urgency.id}>{urgency.name}</option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="incidentState" className="text-dark">Incident State</Label>
                        <Input
                          type="select"
                          id="incidentState"
                          value={advancedEditForm.statusId}
                          onChange={(e) => setAdvancedEditForm({...advancedEditForm, statusId: e.target.value})}
                        >
                          <option value="">Select Incident State</option>
                          {masterData.incidentStates.map(state => (
                            <option key={state.id} value={state.id}>{state.name}</option>
                          ))}
                        </Input>
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="narration" className="text-dark">Narration</Label>
                        <Input
                          type="textarea"
                          id="narration"
                          rows="4"
                          value={advancedEditForm.narration}
                          onChange={(e) => setAdvancedEditForm({...advancedEditForm, narration: e.target.value})}
                          placeholder="Add your notes here..."
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                </Form>
              </>
            ) : (
              <>
                <h5 className="text-dark mb-4">Edit Incident</h5>
                <Form>
                  <FormGroup>
                    <Label className="form-label text-dark"><strong>Title/Short Description:</strong></Label>
                    <Input
                      type="text"
                      value={editForm.shortDescription}
                      onChange={(e) => setEditForm({...editForm, shortDescription: e.target.value})}
                      placeholder="Enter short description"
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label className="form-label text-dark"><strong>Detailed Description:</strong></Label>
                    <Input
                      type="textarea"
                      rows={6}
                      value={editForm.description}
                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      placeholder="Enter detailed description"
                    />
                  </FormGroup>
                  <div className="p-3 bg-light rounded">
                    <small className="text-muted">
                      <strong>Note:</strong> You can only edit the title and description of this incident.
                      Other fields like status, priority, and assignment are managed by the support team.
                    </small>
                  </div>
                </Form>
              </>
            )}

            <hr />

            {/* SLA Status Section */}
            <div className="mb-3">
              <h6 className="text-dark">SLA Status</h6>
              <div className="p-3 bg-light rounded">
                <Row className="gx-4 gy-2 align-items-start">
                  <Col md={3} className="text-dark">
                    <strong>SLA Name:</strong>
                    <div className="text-primary">{slaStatus.name || 'Not specified'}</div>
                  </Col>
                  <Col md={3} className="text-dark">
                    <strong>Type:</strong>
                    <div className="text-muted">{slaStatus.type || 'Not specified'}</div>
                  </Col>
                  <Col md={3} className="text-dark">
                    <strong>Target:</strong>
                    <div className="text-muted">{slaStatus.target || 'Not specified'}</div>
                  </Col>
                  <Col md={3} className="text-dark">
                    <strong>Stage:</strong>
                    <div className="text-muted">{slaStatus.stage || 'Not specified'}</div>
                  </Col>
                </Row>
                <Row className="gx-4 gy-2 align-items-start mt-2">
                  <Col md={3} className="text-dark">
                    <strong>Time Left:</strong>
                    <div className="text-info">{slaStatus.businessTimeLeft || 'Not specified'}</div>
                  </Col>
                  <Col md={3} className="text-dark">
                    <strong>Time Elapsed:</strong>
                    <div className="text-warning">{slaStatus.businessTimeElapsed || 'Not specified'}</div>
                  </Col>
                  <Col md={3} className="text-dark">
                    <strong>Start Time:</strong>
                    <div className="text-muted">{slaStatus.startTime || 'Not specified'}</div>
                  </Col>
                  <Col md={3} className="text-dark">
                    <strong>Progress:</strong>
                    <div className="progress mt-1" style={{ height: '20px' }}>
                      <div
                        className={`progress-bar bg-${getSLAColor()}`}
                        style={{ width: `${Math.min(slaStatus.percentage, 100)}%` }}
                      >
                        {slaStatus.percentage}%
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            </div>
          </TabPane>

          {/* EVIDENCE TAB */}
          {hasAdvancedEditPermissions() && (
            <TabPane tabId="evidence">
              <h5 className="text-dark mb-4">Evidence Collection</h5>

              {/* Photo Upload Section */}
              <div className="mb-4">
                <h6 className="text-dark">Upload Photos</h6>
                <FormGroup>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={loading}
                  />
                  <small className="text-muted">Select multiple images to upload evidence</small>
                </FormGroup>

                {uploadedImages.length > 0 && (
                  <div className="table-responsive mt-3">
                    <Table>
                      <thead>
                        <tr>
                          <th>Preview</th>
                          <th>Name</th>
                          <th>Size</th>
                          <th>Uploaded</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadedImages.map((image) => (
                          <tr key={image.id}>
                            <td>
                              <img src={image.url} alt="Evidence" style={{ width: '50px', height: '50px', objectFit: 'cover' }} />
                            </td>
                            <td>{image.name}</td>
                            <td>{image.size}</td>
                            <td><small>{image.uploadedAt}</small></td>
                            <td>
                              <Button
                                color="danger"
                                size="sm"
                                onClick={() => handleImageDelete(image.id)}
                                disabled={loading}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </div>

              <hr />

              {/* Ammonia Reading Section */}
              <div className="mb-4">
                <h6 className="text-dark">Ammonia Reading</h6>
                <Row>
                  <Col md={4}>
                    <FormGroup>
                      <Label>Type</Label>
                      <Input
                        type="select"
                        value={newAmmoniaReading.type}
                        onChange={(e) => setNewAmmoniaReading({...newAmmoniaReading, type: e.target.value})}
                      >
                        <option value="downstream">Downstream</option>
                        <option value="upstream">Upstream</option>
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md={4}>
                    <FormGroup>
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={newAmmoniaReading.date}
                        onChange={(e) => setNewAmmoniaReading({...newAmmoniaReading, date: e.target.value})}
                      />
                    </FormGroup>
                  </Col>
                  <Col md={4}>
                    <FormGroup>
                      <Label>Reading (mg/L)</Label>
                      <div className="d-flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Enter reading"
                          value={newAmmoniaReading.reading}
                          onChange={(e) => setNewAmmoniaReading({...newAmmoniaReading, reading: e.target.value})}
                        />
                        <Button
                          color="primary"
                          onClick={handleAmmoniaSubmit}
                          disabled={loading}
                        >
                          Submit
                        </Button>
                      </div>
                    </FormGroup>
                  </Col>
                </Row>

                {ammoniaReadings.length > 0 && (
                  <div className="table-responsive mt-3">
                    <Table>
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Reading</th>
                          <th>Unit</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ammoniaReadings.map((reading) => (
                          <tr key={reading.id}>
                            <td>
                              <Badge color={reading.type === 'downstream' ? 'info' : 'warning'}>
                                {reading.type}
                              </Badge>
                            </td>
                            <td>{reading.reading}</td>
                            <td>{reading.unit}</td>
                            <td>{reading.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </div>
            </TabPane>
          )}

          {/* ACTIONS TAB */}
          {hasAdvancedEditPermissions() && (
            <TabPane tabId="action">
              <h5 className="text-dark mb-4">Action Management</h5>

              <Alert color="warning">
                <strong>Note:</strong> Action functionality is temporarily disabled until master data APIs are available.
                Contact your system administrator for more information.
              </Alert>

              <Form className="mb-4">
                <Row>
                  <Col md={6}>
                    <FormGroup>
                      <Label>Action Type</Label>
                      <Input
                        type="select"
                        value={newAction.actionType}
                        onChange={(e) => setNewAction({...newAction, actionType: e.target.value})}
                        disabled
                      >
                        <option value="">Master data not available</option>
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup>
                      <Label>Action Status</Label>
                      <Input
                        type="select"
                        value={newAction.actionStatus}
                        onChange={(e) => setNewAction({...newAction, actionStatus: e.target.value})}
                        disabled
                      >
                        <option value="">Master data not available</option>
                      </Input>
                    </FormGroup>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <FormGroup>
                      <Label>Priority</Label>
                      <Input
                        type="select"
                        value={newAction.priority}
                        onChange={(e) => setNewAction({...newAction, priority: e.target.value})}
                        disabled
                      >
                        <option value="">Master data not available</option>
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md={6}>
                    <FormGroup>
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={newAction.raisedOn}
                        onChange={(e) => setNewAction({...newAction, raisedOn: e.target.value})}
                        disabled
                      />
                    </FormGroup>
                  </Col>
                </Row>

                <FormGroup>
                  <Label>Action Details</Label>
                  <Input
                    type="textarea"
                    rows="4"
                    placeholder="Action details..."
                    value={newAction.details}
                    onChange={(e) => setNewAction({...newAction, details: e.target.value})}
                    disabled
                  />
                </FormGroup>

                <FormGroup check>
                  <Input
                    type="checkbox"
                    id="isComplete"
                    checked={newAction.isComplete}
                    onChange={(e) => setNewAction({...newAction, isComplete: e.target.checked})}
                    disabled
                  />
                  <Label check for="isComplete">Mark as Complete</Label>
                </FormGroup>

                <div className="text-end">
                  <Button
                    color="primary"
                    onClick={handleActionSubmit}
                    disabled
                  >
                    Add Action (Disabled)
                  </Button>
                </div>
              </Form>

              {/* Action History */}
              {actions.length > 0 && (
                <>
                  <hr />
                  <h6 className="text-dark">Action History</h6>
                  <div className="table-responsive">
                    <Table>
                      <thead>
                        <tr>
                          <th>Action ID</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Priority</th>
                          <th>Details</th>
                          <th>Due Date</th>
                          <th>Complete</th>
                        </tr>
                      </thead>
                      <tbody>
                        {actions.map((action) => (
                          <tr key={action.id}>
                            <td><small>{action.id}</small></td>
                            <td>Type {action.action_type_id}</td>
                            <td>
                              <Badge color="info">
                                Status {action.action_status_id}
                              </Badge>
                            </td>
                            <td>
                              <Badge color="info">
                                Priority {action.action_priority_id}
                              </Badge>
                            </td>
                            <td>
                              <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {action.detail}
                              </div>
                            </td>
                            <td><small>{action.raised}</small></td>
                            <td>
                              <Badge color={action.complete ? 'success' : 'warning'}>
                                {action.complete ? 'Yes' : 'No'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </>
              )}
            </TabPane>
          )}

          {/* KNOWLEDGE BASE TAB */}
          {hasAdvancedEditPermissions() && (
            <TabPane tabId="knowledge">
              <h5 className="text-dark mb-4">Knowledge Base</h5>
              <p className="text-muted mb-4">
                Similar resolved incidents that may help with this case.
              </p>

              {similarIncidents.length > 0 ? (
                <div className="table-responsive">
                  <Table>
                    <thead>
                      <tr>
                        <th>Incident No</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Resolution</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {similarIncidents.map((incident) => (
                        <tr key={incident.id}>
                          <td><small>{incident.incident_no}</small></td>
                          <td>
                            <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {incident.short_description}
                            </div>
                          </td>
                          <td>{incident.category?.name || 'N/A'}</td>
                          <td>
                            <Badge color={getStatusColor(incident.status)}>
                              {incident.status}
                            </Badge>
                          </td>
                          <td>
                            <div style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {incident.resolution || 'N/A'}
                            </div>
                          </td>
                          <td><small>{formatDate(incident.created_at)}</small></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                  <h6 className="text-muted">No Similar Incidents Found</h6>
                  <p className="text-muted">
                    No similar incidents available for reference at this time.
                  </p>
                </div>
              )}
            </TabPane>
          )}
        </TabContent>
      </ModalBody>

      <ModalFooter>
        <Button
          color="primary"
          onClick={handleSaveEdit}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Saving...
            </>
          ) : (
            hasAdvancedEditPermissions() ? 'Update Incident' : 'Save Changes'
          )}
        </Button>
        <Button color="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default EditIncident;
