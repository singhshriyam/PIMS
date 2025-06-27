'use client'
import React, { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Row, Col, Badge, Nav, NavItem, NavLink, TabContent, TabPane, Table, Spinner } from 'reactstrap'
import {
  getStatusColor,
  getPriorityColor,
  formatDate
} from '../app/(MainBody)/services/incidentService';
import { getCurrentUser } from '../app/(MainBody)/services/userService';

interface ViewIncidentProps {
  incident: any;
  onClose: () => void;
  userType?: string;
}

const API_BASE = 'https://apexwpc.apextechno.co.uk/api';

const ViewIncident: React.FC<ViewIncidentProps> = ({ incident, onClose, userType }) => {
  // ========== STATE MANAGEMENT ==========
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Master data for display
  const [masterData, setMasterData] = useState({
    categories: [] as Array<{id: number, name: string}>,
    contactTypes: [] as Array<{id: number, name: string}>,
    urgencies: [] as Array<{id: number, name: string}>,
    incidentStates: [] as Array<{id: number, name: string}>,
    assets: [] as Array<{id: number, name: string}>,
    sites: [] as Array<{id: number, name: string}>
  });

  // Evidence data
  const [evidenceData, setEvidenceData] = useState({
    images: [] as Array<{id: number, name: string, url: string, uploadedAt: string, size: string}>,
    readings: [] as Array<{id: number, type: string, reading: string, date: string, unit: string}>,
    actions: [] as Array<{
      id: string,
      action_type_id: string,
      action_status_id: string,
      action_priority_id: string,
      detail: string,
      raised: string,
      complete: boolean,
      created_at: string
    }>
  });

  // SLA status
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

  // History and audit trail
  const [historyData, setHistoryData] = useState({
    auditTrail: [] as Array<{
      id: number,
      field_name: string,
      old_value: string,
      new_value: string,
      changed_by: string,
      changed_at: string,
      change_type: string
    }>,
    timeline: [] as Array<{
      id: number,
      action: string,
      description: string,
      performed_by: string,
      performed_at: string,
      details: any
    }>
  });

  // ========== PERMISSION HELPERS ==========
  const hasElevatedPermissions = () => {
    const currentUserType = userType?.toLowerCase() || '';
    return currentUserType.includes('handler') ||
           currentUserType.includes('manager') ||
           currentUserType.includes('admin') ||
           currentUserType.includes('field_engineer') ||
           currentUserType.includes('expert_team');
  };

  const isHandler = hasElevatedPermissions();

  // ========== DATA LOADING FUNCTIONS ==========
  const loadMasterData = async () => {
    try {
      const [
        categoriesRes,
        contactTypesRes,
        urgenciesRes,
        incidentStatesRes,
        assetsRes,
        sitesRes
      ] = await Promise.all([
        fetch(`${API_BASE}/master/categories`),
        fetch(`${API_BASE}/master/contact-types`),
        fetch(`${API_BASE}/master/urgencies`),
        fetch(`${API_BASE}/master/incident-states`),
        fetch(`${API_BASE}/master/assets`),
        fetch(`${API_BASE}/master/sites`)
      ]);

      const [categories, contactTypes, urgencies, incidentStates, assets, sites] = await Promise.all([
        categoriesRes.json(),
        contactTypesRes.json(),
        urgenciesRes.json(),
        incidentStatesRes.json(),
        assetsRes.json(),
        sitesRes.json()
      ]);

      setMasterData({
        categories: categories.data || [],
        contactTypes: contactTypes.data || [],
        urgencies: urgencies.data || [],
        incidentStates: incidentStates.data || [],
        assets: assets.data || [],
        sites: sites.data || []
      });
    } catch (error) {
      // Silent fail for master data
    }
  };

  const loadSLAStatus = async () => {
    try {
      const incidentId = incident.id || incident.incident_id;
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

  const loadEvidenceData = async () => {
    if (!isHandler) return;

    setLoading(true);
    try {
      const incidentId = incident.id || incident.incident_id;

      // Load evidence photos
      try {
        const photosRes = await fetch(`${API_BASE}/incident-handler/evidence-photos/${incidentId}`);
        if (photosRes.ok) {
          const photosData = await photosRes.json();
          if (photosData.success && photosData.data) {
            setEvidenceData(prev => ({
              ...prev,
              images: photosData.data.map((photo: any) => ({
                id: photo.id,
                name: photo.name || 'Evidence Photo',
                url: photo.url,
                uploadedAt: new Date(photo.created_at).toLocaleString(),
                size: photo.size || 'Unknown'
              }))
            }));
          }
        }
      } catch (error) {
        // Silent fail for photos
      }

      // Load ammonia readings
      try {
        const readingsRes = await fetch(`${API_BASE}/incident-handler/ammonia-readings/${incidentId}`);
        if (readingsRes.ok) {
          const readingsData = await readingsRes.json();
          if (readingsData.success && readingsData.data) {
            setEvidenceData(prev => ({
              ...prev,
              readings: readingsData.data.map((reading: any) => ({
                id: reading.id,
                type: reading.type,
                reading: reading.reading,
                date: reading.sample_date,
                unit: 'mg/L'
              }))
            }));
          }
        }
      } catch (error) {
        // Silent fail for readings
      }

      // Load actions
      try {
        const actionsRes = await fetch(`${API_BASE}/incident-handler/actions/${incidentId}`);
        if (actionsRes.ok) {
          const actionsData = await actionsRes.json();
          if (actionsData.success && actionsData.data) {
            setEvidenceData(prev => ({
              ...prev,
              actions: actionsData.data
            }));
          }
        }
      } catch (error) {
        // Silent fail for actions
      }

    } catch (error) {
      // Silent fail for evidence data
    } finally {
      setLoading(false);
    }
  };

  const extractHistoryFromIncident = () => {
    const auditTrail: any[] = [];
    const timeline: any[] = [];

    // Extract audit trail from incident data
    if (incident.audit_trail && Array.isArray(incident.audit_trail)) {
      auditTrail.push(...incident.audit_trail);
    }

    if (incident.changes && Array.isArray(incident.changes)) {
      auditTrail.push(...incident.changes);
    }

    // Extract timeline from incident data
    if (incident.history && Array.isArray(incident.history)) {
      timeline.push(...incident.history);
    }

    if (incident.activities && Array.isArray(incident.activities)) {
      timeline.push(...incident.activities);
    }

    // Create basic timeline entries from incident data
    if (incident.created_at) {
      timeline.push({
        id: 0,
        action: 'created',
        description: 'Incident was created',
        performed_by: incident.user?.name || 'System',
        performed_at: incident.created_at,
        details: null
      });
    }

    if (incident.updated_at && incident.updated_at !== incident.created_at) {
      timeline.push({
        id: timeline.length,
        action: 'updated',
        description: 'Incident was updated',
        performed_by: incident.updated_by?.name || 'System',
        performed_at: incident.updated_at,
        details: null
      });
    }

    if (incident.assigned_to?.name) {
      timeline.push({
        id: timeline.length,
        action: 'assigned',
        description: `Assigned to ${incident.assigned_to.name}`,
        performed_by: incident.assigned_by?.name || 'System',
        performed_at: incident.assigned_at || incident.updated_at,
        details: { assigned_to: incident.assigned_to.name }
      });
    }

    // Sort by date (newest first)
    timeline.sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime());
    auditTrail.sort((a, b) => new Date(b.changed_at || b.created_at).getTime() - new Date(a.changed_at || a.created_at).getTime());

    setHistoryData({ auditTrail, timeline });
  };

  // ========== INITIALIZATION ==========
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    const loadAdditionalData = async () => {
      await loadSLAStatus();
      await loadEvidenceData();
      extractHistoryFromIncident();
    };

    if (incident.id || incident.incident_id) {
      loadAdditionalData();
    }
  }, [incident, isHandler]);

  // ========== UTILITY FUNCTIONS ==========
  const getSLAColor = () => {
    if (slaStatus.percentage >= 100) return 'danger';
    if (slaStatus.percentage >= 80) return 'warning';
    return 'success';
  };

  const getIncidentNumber = () => {
    return incident.number || incident.incident_no || 'N/A';
  };

  const getShortDescription = () => {
    return incident.shortDescription || incident.short_description || 'No description';
  };

  const getDescription = () => {
    return incident.description || incident.short_description || incident.shortDescription || 'No description';
  };

  const getCategoryName = () => {
    if (incident.category?.name) return incident.category.name;
    if (incident.category && typeof incident.category === 'string') return incident.category;
    const categoryId = incident.categoryId || incident.category_id;
    if (categoryId && masterData.categories.length > 0) {
      const category = masterData.categories.find(cat => cat.id === parseInt(categoryId.toString()));
      return category?.name || 'Unknown';
    }
    return 'Not specified';
  };

  const getSubCategoryName = () => {
    if (incident.subcategory?.name) return incident.subcategory.name;
    if (incident.subCategory?.name) return incident.subCategory.name;
    if (incident.subCategory && typeof incident.subCategory === 'string') return incident.subCategory;
    return 'Not specified';
  };

  const getContactTypeName = () => {
    if (incident.contact_type?.name) return incident.contact_type.name;
    if (incident.contactType?.name) return incident.contactType.name;
    if (incident.contactType && typeof incident.contactType === 'string') return incident.contactType;
    const contactTypeId = incident.contactTypeId || incident.contact_type_id;
    if (contactTypeId && masterData.contactTypes.length > 0) {
      const contactType = masterData.contactTypes.find(type => type.id === parseInt(contactTypeId.toString()));
      return contactType?.name || 'Unknown';
    }
    return 'Not specified';
  };

  const getUrgencyName = () => {
    if (incident.urgency?.name) return incident.urgency.name;
    if (incident.urgency && typeof incident.urgency === 'string') return incident.urgency;
    const urgencyId = incident.urgencyId || incident.urgency_id;
    if (urgencyId && masterData.urgencies.length > 0) {
      const urgency = masterData.urgencies.find(urg => urg.id === parseInt(urgencyId.toString()));
      return urgency?.name || 'Unknown';
    }
    return 'Not specified';
  };

  const getAssetName = () => {
    if (incident.asset?.name) return incident.asset.name;
    const assetId = incident.assetId || incident.asset_id;
    if (assetId && masterData.assets.length > 0) {
      const asset = masterData.assets.find(asset => asset.id === parseInt(assetId.toString()));
      return asset?.name || 'Unknown';
    }
    return 'Not specified';
  };

  const getSiteName = () => {
    if (incident.site?.name) return incident.site.name;
    const siteId = incident.siteId || incident.site_id;
    if (siteId && masterData.sites.length > 0) {
      const site = masterData.sites.find(site => site.id === parseInt(siteId.toString()));
      return site?.name || 'Unknown';
    }
    return 'Not specified';
  };

  const getPriorityName = () => {
    if (incident.priority?.name) return incident.priority.name;
    if (incident.priority && typeof incident.priority === 'string') return incident.priority;
    return 'Not specified';
  };

  const getImpactName = () => {
    if (incident.impact?.name) return incident.impact.name;
    if (incident.impact && typeof incident.impact === 'string') return incident.impact;
    return 'Not specified';
  };

  const getIncidentStateName = () => {
    if (incident.incidentstate?.name) return incident.incidentstate.name;
    if (incident.incidentState?.name) return incident.incidentState.name;
    if (incident.status) {
      return incident.status.replace('_', ' ').toUpperCase();
    }
    return 'Not specified';
  };

  const getAssignedToName = () => {
    if (incident.assigned_to?.name) {
      const fullName = incident.assigned_to.last_name
        ? `${incident.assigned_to.name} ${incident.assigned_to.last_name}`
        : incident.assigned_to.name;
      return fullName;
    }
    if (incident.assignedTo && typeof incident.assignedTo === 'string') return incident.assignedTo;
    return 'Unassigned';
  };

  const getReportedByName = () => {
    if (incident.user?.name) {
      const fullName = incident.user.last_name
        ? `${incident.user.name} ${incident.user.last_name}`
        : incident.user.name;
      return fullName;
    }
    if (incident.reportedByName) return incident.reportedByName;
    if (incident.caller) return incident.caller;
    return 'Not specified';
  };

  const getCreatedAt = () => {
    return incident.createdAt || incident.created_at || 'Not specified';
  };

  const getLocation = () => {
    return incident.address;
  };

  const getActionTypeName = (typeId: string) => {
    const types: { [key: string]: string } = {
      '1': 'Investigation',
      '2': 'Resolution',
      '3': 'Follow-up',
      '4': 'Escalation',
      '5': 'Site Visit',
      '6': 'Customer Contact'
    };
    return types[typeId] || 'Unknown';
  };

  const getActionStatusName = (statusId: string) => {
    const statuses: { [key: string]: string } = {
      '1': 'Open',
      '2': 'In Progress',
      '3': 'Completed',
      '4': 'Cancelled',
      '5': 'On Hold'
    };
    return statuses[statusId] || 'Unknown';
  };

  const getActionPriorityName = (priorityId: string) => {
    const priorities: { [key: string]: string } = {
      '1': 'High',
      '2': 'Medium',
      '3': 'Low'
    };
    return priorities[priorityId] || 'Unknown';
  };

  // ========== MAIN RENDER ==========
  return (
    <Modal isOpen={true} toggle={onClose} size="xl" style={{ maxWidth: '95vw', width: '95vw' }}>
      <ModalHeader toggle={onClose}>
        Incident Details - {getIncidentNumber()}
      </ModalHeader>

      <ModalBody style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        {/* Navigation Tabs for Handlers */}
        {isHandler && (
          <Nav tabs className="mb-4">
            <NavItem>
              <NavLink
                className={activeTab === 'details' ? 'active' : ''}
                onClick={() => setActiveTab('details')}
                style={{ cursor: 'pointer' }}
              >
                Details
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === 'evidence' ? 'active' : ''}
                onClick={() => setActiveTab('evidence')}
                style={{ cursor: 'pointer' }}
              >
                Evidence ({evidenceData.images.length + evidenceData.readings.length})
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === 'actions' ? 'active' : ''}
                onClick={() => setActiveTab('actions')}
                style={{ cursor: 'pointer' }}
              >
                Actions ({evidenceData.actions.length})
              </NavLink>
            </NavItem>
            {/* <NavItem>
              <NavLink
                className={activeTab === 'history' ? 'active' : ''}
                onClick={() => setActiveTab('history')}
                style={{ cursor: 'pointer' }}
              >
                History ({historyData.auditTrail.length + historyData.timeline.length})
              </NavLink>
            </NavItem> */}
          </Nav>
        )}

        <TabContent activeTab={isHandler ? activeTab : 'details'}>
          {/* DETAILS TAB */}
          <TabPane tabId="details">
            <Row>
              <Col md={6}>
                <div className="mb-3">
                  <strong>Incident Number:</strong>
                  <span className="ms-2 text-primary fw-medium">{getIncidentNumber()}</span>
                </div>
                <div className="mb-3">
                  <strong>Title:</strong>
                  <span className="ms-2 text-dark">{getShortDescription()}</span>
                </div>
                <div className="mb-3">
                  <strong>Category:</strong>
                  <span className="ms-2 text-dark">{getCategoryName()}</span>
                </div>
                <div className="mb-3">
                  <strong>Sub Category:</strong>
                  <span className="ms-2 text-dark">{getSubCategoryName()}</span>
                </div>
                <div className="mb-3">
                  <strong>Reported By:</strong>
                  <span className="ms-2 text-dark">{getReportedByName()}</span>
                </div>
                <div className="mb-3">
                  <strong>Assigned to:</strong>
                  <span className="ms-2 text-dark">{getAssignedToName()}</span>
                </div>
                {(incident.assetId || incident.asset_id || incident.asset) && (
                  <div className="mb-3">
                    <strong>Asset:</strong>
                    <span className="ms-2 text-dark">{getAssetName()}</span>
                  </div>
                )}
                {(incident.siteId || incident.site_id || incident.site) && (
                  <div className="mb-3">
                    <strong>Site:</strong>
                    <span className="ms-2 text-dark">{getSiteName()}</span>
                  </div>
                )}
              </Col>
              <Col md={6}>
                <div className="mb-3">
                  <strong>Status:</strong>
                  <Badge
                    className="ms-2"
                    style={{
                      backgroundColor: getStatusColor(incident.status || 'pending'),
                      color: 'white'
                    }}
                  >
                    {getIncidentStateName()}
                  </Badge>
                </div>
                <div className="mb-3">
                  <strong>Priority:</strong>
                  <Badge
                    className="ms-2"
                    style={{
                      backgroundColor: getPriorityColor(getPriorityName()),
                      color: 'white'
                    }}
                  >
                    {getPriorityName()}
                  </Badge>
                </div>
                <div className="mb-3">
                  <strong>Impact:</strong>
                  <span className="ms-2 text-dark">{getImpactName()}</span>
                </div>
                <div className="mb-3">
                  <strong>Urgency:</strong>
                  <span className="ms-2 text-dark">{getUrgencyName()}</span>
                </div>
                <div className="mb-3">
                  <strong>Contact Type:</strong>
                  <span className="ms-2 text-dark">{getContactTypeName()}</span>
                </div>
                <div className="mb-3">
                  <strong>Created:</strong>
                  <span className="ms-2 text-dark">{formatDate(getCreatedAt())}</span>
                </div>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <hr />
                <div className="mb-3">
                  <strong>Detailed Description:</strong>
                  <p className="mt-2 p-3 bg-light rounded text-dark">
                    {getDescription()}
                  </p>
                </div>
              </Col>
              <Col md={6}>
                <hr />
                <div className="mb-3">
                  <strong>Location:</strong>
                  <p className="mt-2 p-3 bg-light rounded text-dark">
                    {getLocation()}
                  </p>
                </div>
                <div className="mb-3">
                  <strong>SLA Status:</strong>
                  <div className="mt-2 p-3 bg-light rounded">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-dark">{slaStatus.name || 'Not specified'}</span>
                      <div className="progress" style={{ width: '40%', height: '20px' }}>
                        <div
                          className={`progress-bar bg-${getSLAColor()}`}
                          style={{ width: `${Math.min(slaStatus.percentage, 100)}%` }}
                        >
                          {slaStatus.percentage}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </TabPane>

          {/* EVIDENCE TAB */}
          {isHandler && (
            <TabPane tabId="evidence">
              <h5 className="text-dark mb-4">Evidence & Data</h5>

              {loading ? (
                <div className="text-center py-4">
                  <Spinner color="primary" />
                  <p className="mt-2 text-muted">Loading evidence data...</p>
                </div>
              ) : (
                <>
                  {/* Photos Section */}
                  {evidenceData.images.length > 0 && (
                    <div className="mb-4">
                      <h6 className="text-dark">Evidence Photos ({evidenceData.images.length})</h6>
                      <div className="table-responsive">
                        <Table striped>
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
                            {evidenceData.images.map((image) => (
                              <tr key={image.id}>
                                <td>
                                  <img
                                    src={image.url}
                                    alt="Evidence"
                                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }}
                                    onClick={() => window.open(image.url, '_blank')}
                                    title="Click to view full size"
                                  />
                                </td>
                                <td>{image.name}</td>
                                <td>{image.size}</td>
                                <td><small>{image.uploadedAt}</small></td>
                                <td>
                                  <Button
                                    color="primary"
                                    size="sm"
                                    onClick={() => window.open(image.url, '_blank')}
                                  >
                                    View
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Ammonia Readings Section */}
                  {evidenceData.readings.length > 0 && (
                    <div className="mb-4">
                      <h6 className="text-dark">Ammonia Readings ({evidenceData.readings.length})</h6>
                      <div className="table-responsive">
                        <Table striped>
                          <thead>
                            <tr>
                              <th>Type</th>
                              <th>Reading</th>
                              <th>Unit</th>
                              <th>Date</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {evidenceData.readings.map((reading) => (
                              <tr key={reading.id}>
                                <td>
                                  <Badge color={reading.type === 'downstream' ? 'info' : 'warning'}>
                                    {reading.type.charAt(0).toUpperCase() + reading.type.slice(1)}
                                  </Badge>
                                </td>
                                <td className="fw-medium">{reading.reading}</td>
                                <td>{reading.unit}</td>
                                <td>{new Date(reading.date).toLocaleDateString()}</td>
                                <td>
                                  <Badge color={parseFloat(reading.reading) > 1.5 ? 'danger' : 'success'}>
                                    {parseFloat(reading.reading) > 1.5 ? 'High' : 'Normal'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* No Evidence Message */}
                  {evidenceData.images.length === 0 && evidenceData.readings.length === 0 && (
                    <div className="text-center py-5">
                      <div className="mb-3">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21,15 16,10 5,21"/>
                        </svg>
                      </div>
                      <h6 className="text-muted">No Evidence Available</h6>
                      <p className="text-muted">
                        No photos or readings have been uploaded for this incident yet.
                      </p>
                    </div>
                  )}
                </>
              )}
            </TabPane>
          )}

          {/* ACTIONS TAB */}
          {isHandler && (
            <TabPane tabId="actions">
              <h5 className="text-dark mb-4">Actions & Tasks</h5>

              {loading ? (
                <div className="text-center py-4">
                  <Spinner color="primary" />
                  <p className="mt-2 text-muted">Loading actions...</p>
                </div>
              ) : (
                <>
                  {evidenceData.actions.length > 0 ? (
                    <div className="table-responsive">
                      <Table striped>
                        <thead>
                          <tr>
                            <th>Action ID</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Details</th>
                            <th>Due Date</th>
                            <th>Complete</th>
                            <th>Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {evidenceData.actions.map((action) => (
                            <tr key={action.id}>
                              <td><small className="text-monospace">{action.id}</small></td>
                              <td>
                                <Badge color="secondary">
                                  {getActionTypeName(action.action_type_id)}
                                </Badge>
                              </td>
                              <td>
                                <Badge color={
                                  action.action_status_id === '3' ? 'success' :
                                  action.action_status_id === '2' ? 'warning' :
                                  action.action_status_id === '5' ? 'secondary' :
                                  action.action_status_id === '4' ? 'danger' : 'info'
                                }>
                                  {getActionStatusName(action.action_status_id)}
                                </Badge>
                              </td>
                              <td>
                                <Badge color={
                                  action.action_priority_id === '1' ? 'danger' :
                                  action.action_priority_id === '2' ? 'warning' : 'info'
                                }>
                                  {getActionPriorityName(action.action_priority_id)}
                                </Badge>
                              </td>
                              <td>
                                <div style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={action.detail}>
                                  {action.detail}
                                </div>
                              </td>
                              <td><small>{new Date(action.raised).toLocaleDateString()}</small></td>
                              <td>
                                <Badge color={action.complete ? 'success' : 'warning'}>
                                  {action.complete ? 'Yes' : 'No'}
                                </Badge>
                              </td>
                              <td><small>{new Date(action.created_at).toLocaleDateString()}</small></td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <div className="mb-3">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted">
                          <path d="M9 11l3 3l8-8"/>
                          <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9s4.03-9 9-9c1.51 0 2.93.37 4.18 1.03"/>
                        </svg>
                      </div>
                      <h6 className="text-muted">No Actions Recorded</h6>
                      <p className="text-muted">
                        No actions have been created for this incident yet.
                      </p>
                    </div>
                  )}
                </>
              )}
            </TabPane>
          )}

          {/* HISTORY TAB */}
          {/* {isHandler && (
            <TabPane tabId="history">
              <h5 className="text-dark mb-4">Incident History & Changes</h5>

              {/* Audit Trail Section */}
              {/* {historyData.auditTrail.length > 0 && (
                <div className="mb-4">
                  <h6 className="text-dark">Field Changes ({historyData.auditTrail.length})</h6>
                  <div className="table-responsive">
                    <Table striped size="sm">
                      <thead>
                        <tr>
                          <th>Date & Time</th>
                          <th>Field</th>
                          <th>Previous Value</th>
                          <th>New Value</th>
                          <th>Changed By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyData.auditTrail.map((change) => (
                          <tr key={change.id}>
                            <td>
                              <small>{new Date(change.changed_at).toLocaleString()}</small>
                            </td>
                            <td>
                              <Badge color="info" className="text-capitalize">
                                {change.field_name.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td>
                              <small className="text-muted">
                                {change.old_value || 'Empty'}
                              </small>
                            </td>
                            <td>
                              <small className="text-dark fw-medium">
                                {change.new_value || 'Empty'}
                              </small>
                            </td>
                            <td>
                              <small>{change.changed_by}</small>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>
              )}  */}

              {/* Timeline Section */}
              {/* {historyData.timeline.length > 0 && (
                <div className="mb-4">
                  <h6 className="text-dark">Activity Timeline ({historyData.timeline.length})</h6>
                  <div className="timeline-container">
                    {historyData.timeline.map((activity, index) => (
                      <div key={activity.id} className="timeline-item mb-3">
                        <div className="d-flex">
                          <div className="timeline-marker me-3">
                            <div className={`rounded-circle d-flex align-items-center justify-content-center ${
                              activity.action === 'created' ? 'bg-success' :
                              activity.action === 'updated' ? 'bg-warning' :
                              activity.action === 'assigned' ? 'bg-info' :
                              activity.action === 'status_changed' ? 'bg-primary' :
                              activity.action === 'resolved' ? 'bg-success' :
                              activity.action === 'closed' ? 'bg-secondary' : 'bg-light'
                            } text-white`} style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                              {activity.action === 'created' && '+'}
                              {activity.action === 'updated' && '✎'}
                              {activity.action === 'assigned' && '👤'}
                              {activity.action === 'status_changed' && '🔄'}
                              {activity.action === 'resolved' && '✓'}
                              {activity.action === 'closed' && '🔒'}
                              {!['created', 'updated', 'assigned', 'status_changed', 'resolved', 'closed'].includes(activity.action) && '•'}
                            </div>
                          </div>
                          <div className="timeline-content flex-grow-1">
                            <div className="bg-light p-3 rounded">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <h6 className="mb-0 text-capitalize">
                                  {activity.action.replace('_', ' ')}
                                </h6>
                                <small className="text-muted">
                                  {new Date(activity.performed_at).toLocaleString()}
                                </small>
                              </div>
                              <p className="mb-2 text-dark">{activity.description}</p>
                              <small className="text-muted">
                                <strong>By:</strong> {activity.performed_by}
                              </small>
                            </div>
                          </div>
                        </div>
                        {index < historyData.timeline.length - 1 && (
                          <div className="timeline-line ms-3" style={{
                            width: '2px',
                            height: '20px',
                            backgroundColor: '#dee2e6',
                            marginLeft: '15px'
                          }}></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )} */}

              {/* No History Message */}
              {/* {historyData.auditTrail.length === 0 && historyData.timeline.length === 0 && (
                <div className="text-center py-5">
                  <div className="mb-3">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                      <path d="M3 3v5h5"/>
                      <path d="M12 7v5l4 2"/>
                    </svg>
                  </div>
                  <h6 className="text-muted">No History Available</h6>
                  <p className="text-muted">
                    No changes or activities have been recorded for this incident yet.
                  </p>
                </div>
              )} */}
            {/* </TabPane>
          )} */}
        </TabContent>

        {/* Summary Footer */}
        {/* <div className="mt-4 p-3 bg-light rounded">
          <Row>
            <Col md={6}>
              <small className="text-muted">
                <strong>Last Updated:</strong> {formatDate(incident.updated_at || incident.created_at)}
              </small>
            </Col>
            <Col md={6} className="text-end">
              <small className="text-muted">
                <strong>Changes:</strong> {historyData.auditTrail.length} •
                <strong className="ms-2">Activities:</strong> {historyData.timeline.length}
              </small>
            </Col>
          </Row>
        </div> */}
      </ModalBody>

      <ModalFooter>
        <Button color="secondary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ViewIncident;
