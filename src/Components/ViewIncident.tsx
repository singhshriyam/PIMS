'use client'
import React, { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Row, Col, Badge } from 'reactstrap'
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

const ViewIncident: React.FC<ViewIncidentProps> = ({ incident, onClose, userType }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Initialize component
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  // Permission check - only end users should see this component
  const isEndUser = () => {
    const currentUserType = userType?.toLowerCase() || '';
    return currentUserType.includes('enduser');
  };

  // Helper functions - using backend data directly
  const getIncidentNumber = () => {
    return incident.incident_no || incident.id?.toString() || 'N/A';
  };

  const getShortDescription = () => {
    return incident.short_description || 'No description';
  };

  const getDescription = () => {
    return incident.description || incident.short_description || 'No description';
  };

  const getCategoryName = () => {
    if (incident.category?.name) return incident.category.name;
    return 'Not specified';
  };

  const getSubCategoryName = () => {
    return incident.subcategory?.name || 'Not specified';
  };

  const getContactTypeName = () => {
    if (incident.contact_type?.name) return incident.contact_type.name;
    return 'Not specified';
  };

  const getUrgencyName = () => {
    if (incident.urgency?.name) return incident.urgency.name;
    return 'Not specified';
  };

  const getAssetName = () => {
    if (incident.asset?.name) return incident.asset.name;
    return 'Not specified';
  };

  const getSiteName = () => {
    if (incident.site?.name) return incident.site.name;
    return 'Not specified';
  };

  const getPriorityName = () => {
    return incident.priority?.name || incident.urgency?.name || 'Not specified';
  };

  const getImpactName = () => {
    return incident.impact?.name || 'Not specified';
  };

  const getIncidentStateName = () => {
    if (incident.incidentstate?.name) return incident.incidentstate.name;

    // Convert status to display name
    const state = incident.incidentstate?.name?.toLowerCase() || '';
    if (state === 'new') return 'Pending';
    if (state === 'inprogress') return 'In Progress';
    if (state === 'resolved') return 'Resolved';
    if (state === 'closed') return 'Closed';
    return 'Not specified';
  };

  const getAssignedToName = () => {
    if (incident.assigned_to?.name) {
      const fullName = incident.assigned_to.last_name
        ? `${incident.assigned_to.name} ${incident.assigned_to.last_name}`
        : incident.assigned_to.name;
      return fullName;
    }
    return 'Unassigned';
  };

  const getReportedByName = () => {
    if (incident.user?.name) {
      const fullName = incident.user.last_name
        ? `${incident.user.name} ${incident.user.last_name}`
        : incident.user.name;
      return fullName;
    }
    return 'Not specified';
  };

  const getCreatedAt = () => {
    return incident.created_at || 'Not specified';
  };

  const getLocation = () => {
    return incident.address || 'Not specified';
  };

  // Get status for color coding
  const getStatusForColor = () => {
    const state = incident.incidentstate?.name?.toLowerCase() || '';
    if (state === 'new') return 'pending';
    if (state === 'inprogress') return 'in_progress';
    if (state === 'resolved') return 'resolved';
    if (state === 'closed') return 'closed';
    return 'pending';
  };

  // If not an end user, don't render this component
  if (!isEndUser()) {
    return null;
  }

  return (
    <Modal isOpen={true} toggle={onClose} size="lg" style={{ maxWidth: '800px', width: '90vw' }}>
      <ModalHeader toggle={onClose}>
        My Incident Details - {getIncidentNumber()}
      </ModalHeader>

      <ModalBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>
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
              <strong>Contact Type:</strong>
              <span className="ms-2 text-dark">{getContactTypeName()}</span>
            </div>
            {incident.asset_id && (
              <div className="mb-3">
                <strong>Asset:</strong>
                <span className="ms-2 text-dark">{getAssetName()}</span>
              </div>
            )}
            {incident.site_id && (
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
                  backgroundColor: getStatusColor(getStatusForColor()),
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
              <strong>Assigned to:</strong>
              <span className="ms-2 text-dark">{getAssignedToName()}</span>
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
              <div className="mt-2 p-3 bg-light rounded text-dark">
                {getDescription()}
              </div>
            </div>
          </Col>
          <Col md={6}>
            <hr />
            <div className="mb-3">
              <strong>Location:</strong>
              <div className="mt-2 p-3 bg-light rounded text-dark">
                {getLocation()}
              </div>
            </div>
            {/* {(incident.lat && incident.lng) && (
              <div className="mb-3">
                <strong>GPS Coordinates:</strong>
                <div className="mt-1 text-muted">
                  Lat: {incident.lat.toString().substring(0,8)},
                  Lng: {incident.lng.toString().substring(0,8)}
                </div>
              </div>
            )} */}
          </Col>
        </Row>

        {/* Status Information */}
        <div className="mt-4 p-3 bg-info bg-opacity-10 rounded">
          <h6 className="text-info mb-2">📋 Status Information</h6>
          <Row>
            <Col md={6}>
              <div><strong>Current Status:</strong> {getIncidentStateName()}</div>
            </Col>
            <Col md={6}>
              <div><strong>Assigned To:</strong> {getAssignedToName()}</div>
            </Col>
          </Row>
          {incident.narration && (
            <div className="mt-2">
              <strong>Latest Notes:</strong>
              <div className="text-muted">{incident.narration}</div>
            </div>
          )}
        </div>
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
