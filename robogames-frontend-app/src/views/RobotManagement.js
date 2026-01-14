/**
* The `RobotManagement` component is responsible for displaying a list of robots and allowing the user to manage, confirm or reject their registration.
* 
* The component fetches the list of competition years and the robots for the selected year. It allows the user to filter the robots by team name and provides buttons to confirm or reject the registration of each robot.
* 
* When the user clicks the confirm or reject button, the component sends a PUT request to the server to update the robot's registration status. Upon successful update, the component refreshes the list of robots to show the updated statuses.

*/
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card, CardHeader, CardBody, CardTitle, Button,
  Table, Row, Col, Input, InputGroup, InputGroupText, Badge,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Form, FormGroup, Label, FormFeedback
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { useAdmin } from "contexts/AdminContext";
import { useToast } from "contexts/ToastContext";
import { useConfirm } from "components/ConfirmModal";
import { t } from "translations/translate";
import TeamSearchSelect from "components/TeamSearchSelect/TeamSearchSelect";
import TablePagination from "components/TablePagination";

function RobotManagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedYear } = useAdmin();
  const [robots, setRobots] = useState([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [searchType, setSearchType] = useState('all'); // 'all', 'id', 'number', 'name', 'team', 'discipline', 'category'
  const [disciplines, setDisciplines] = useState([]);
  const [registrations, setRegistrations] = useState([]);

  // Helper function for category display
  const getCategoryDisplay = (category) => {
    if (category === 'LOW_AGE_CATEGORY') return t("pupils");
    if (category === 'HIGH_AGE_CATEGORY') return t("students");
    return category;
  };

  // Admin modal states
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [newRobot, setNewRobot] = useState({ teamRegistrationId: '', name: '', disciplineId: '' });
  const [editRobot, setEditRobot] = useState({ id: null, name: '', number: '', disciplineId: '', confirmed: false });
  const [selectedTeamForRobot, setSelectedTeamForRobot] = useState(null);
  const [errors, setErrors] = useState({});

  const { token, tokenExpired } = useUser();
  const toast = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchDisciplines();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchRobotsForYear(selectedYear);
      fetchRegistrationsForYear(selectedYear);
    }
  }, [selectedYear]);

  const handleConfirmRegistration = async (robotId, confirmed) => {
    // Pouze při odmítnutí (confirmed=false) zobrazit potvrzovací dialog
    if (!confirmed && !await confirm({ message: t("robotAction", { conf: t("remove_lower") }) })) {
      return;
    }
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/robot/confirmRegistration?id=${robotId}&confirmed=${confirmed}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });
      if (tokenExpired(response.status)) { return; }

      const data = await response.json();
      if (response.ok) {
        fetchRobotsForYear(selectedYear); // Refresh the list of robots to show updated statuses
      } else if (data.type === 'ERROR') {
        toast.error(t("dataError", { data: data.data }));
      } else {
        toast.error(t("robotUpdateFail", { message: data.message || t("unknownError") }));
      }
    } catch (error) {
      console.error('Error confirming the robot registration:', error);
      toast.error(t("robotConfirmError", { message: error.message || t("serverCommFail") }));
    }
  };

  const fetchRobotsForYear = async (year) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/robot/allForYear?year=${year}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });
      if (tokenExpired(response.status)) { return; }

      const data = await response.json();
      if (response.ok && data.type === 'RESPONSE') {
        setRobots(data.data);
      } else if (data.type === 'ERROR') {
        toast.error(t("dataError", { data: data.data }));
      } else {
        toast.error(t("robotFetchFail", { message: data.message || t("unknownError") }));
      }
    } catch (error) {
      console.error('Failed to fetch robots for year:', error);
      toast.error(t("robotFetchError", { message: error.message || t("serverCommFail") }));
    }
  };

  const filteredRobots = robots.filter(robot => {
    const searchLower = searchTerm.toLowerCase();
    if (!searchTerm) return true;
    
    switch (searchType) {
      case 'id':
        return robot.id?.toString().includes(searchTerm);
      case 'number':
        return robot.number?.toString().includes(searchTerm);
      case 'name':
        return robot.name?.toLowerCase().includes(searchLower);
      case 'team':
        return robot.teamName?.toLowerCase().includes(searchLower);
      case 'discipline':
        return robot.diciplineName?.toLowerCase().includes(searchLower);
      case 'category':
        return robot.category?.toLowerCase().includes(searchLower) ||
               getCategoryDisplay(robot.category).toLowerCase().includes(searchLower);
      case 'all':
      default:
        return robot.id?.toString().includes(searchTerm) ||
               robot.number?.toString().includes(searchTerm) ||
               robot.name?.toLowerCase().includes(searchLower) ||
               robot.teamName?.toLowerCase().includes(searchLower) ||
               robot.diciplineName?.toLowerCase().includes(searchLower) ||
               getCategoryDisplay(robot.category).toLowerCase().includes(searchLower);
    }
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  
  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, searchType]);

  // Statistics
  const totalRobots = robots.length;
  const confirmedRobots = robots.filter(r => r.confirmed).length;
  const robotsWithEmptyTeam = robots.filter(r => r.teamMemberCount === 0).length;

  // Update URL when search term changes
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value) {
      setSearchParams({ search: value });
    } else {
      setSearchParams({});
    }
  };

  // Navigate to robot profile while preserving search term
  const navigateToProfile = (robotId) => {
    navigate(`/admin/robot-profile?id=${robotId}&from=management${searchTerm ? '&search=' + encodeURIComponent(searchTerm) : ''}`);
  };

  const fetchDisciplines = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/discipline/all`);
      const data = await response.json();
      if (response.ok && data.type === 'RESPONSE') {
        setDisciplines(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch disciplines:', error);
    }
  };

  const fetchRegistrationsForYear = async (year) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/competition/allRegistrations?year=${year}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tokenExpired(response.status)) return;

      const data = await response.json();
      if (response.ok && data.type === 'RESPONSE') {
        setRegistrations(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch registrations:', error);
    }
  };

  // Helper to convert registrations to team-like objects for TeamSearchSelect
  const getTeamsFromRegistrations = () => {
    return registrations.map(reg => ({
      id: reg.id,  // This is the registration ID which we need for creating robot
      name: reg.teamName,
      leaderName: null,  // We don't have this info from registration
      teamId: reg.teamID
    }));
  };

  // CREATE ROBOT (Admin)
  const handleCreateRobot = async () => {
    let newErrors = {};

    if (!selectedTeamForRobot) {
      newErrors.teamRegistrationId = t("fieldsRequired");
    }
    if (!newRobot.name || newRobot.name.trim().length === 0) {
      newErrors.name = t("robotFillName");
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/admin/robot/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          teamRegistrationId: selectedTeamForRobot.id,
          name: newRobot.name,
          disciplineId: newRobot.disciplineId ? parseInt(newRobot.disciplineId) : null
        })
      });
      if (tokenExpired(response.status)) return;

      const result = await response.json();
      if (response.ok && result.type !== 'ERROR') {
        toast.success(t("robotCreated"));
        setCreateModal(false);
        setNewRobot({ teamRegistrationId: '', name: '', disciplineId: '' });
        setSelectedTeamForRobot(null);
        setErrors({});
        fetchRobotsForYear(selectedYear);
      } else {
        toast.error(result.data || t("robotCreateFail"));
      }
    } catch (error) {
      toast.error(t("robotCreateFail"));
    }
  };

  // EDIT ROBOT (Admin)
  const handleEditRobot = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/admin/robot/edit?id=${editRobot.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editRobot.name || null,
          number: editRobot.number ? parseInt(editRobot.number) : null,
          disciplineId: editRobot.disciplineId === '' ? null : editRobot.disciplineId === '-1' ? -1 : parseInt(editRobot.disciplineId),
          confirmed: editRobot.confirmed
        })
      });
      if (tokenExpired(response.status)) return;

      const result = await response.json();
      if (response.ok && result.type !== 'ERROR') {
        toast.success(t("robotEdited"));
        setEditModal(false);
        fetchRobotsForYear(selectedYear);
      } else {
        toast.error(result.data || t("robotEditFail"));
      }
    } catch (error) {
      toast.error(t("robotEditFail"));
    }
  };

  // FORCE CONFIRM ROBOT (Admin)
  const handleForceConfirm = async (robotId, confirmed) => {
    if (!await confirm({ message: t("robotForceConfirmCheck", { action: confirmed ? t("confirm_lower") : t("remove_lower") }) })) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}api/admin/robot/forceConfirm?id=${robotId}&confirmed=${confirmed}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (tokenExpired(response.status)) return;

      const result = await response.json();
      if (response.ok && result.type !== 'ERROR') {
        toast.success(t("robotForceConfirmed"));
        fetchRobotsForYear(selectedYear);
      } else {
        toast.error(result.data || t("robotForceConfirmFail"));
      }
    } catch (error) {
      toast.error(t("robotForceConfirmFail"));
    }
  };

  // FORCE REMOVE ROBOT (Admin)
  const handleForceRemove = async (robotId) => {
    if (!await confirm({ message: t("robotForceRemoveCheck") })) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/admin/robot/forceRemove?id=${robotId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tokenExpired(response.status)) return;

      const result = await response.json();
      if (response.ok && result.type !== 'ERROR') {
        toast.success(t("robotForceRemoved"));
        fetchRobotsForYear(selectedYear);
      } else {
        toast.error(result.data || t("robotForceRemoveFail"));
      }
    } catch (error) {
      toast.error(t("robotForceRemoveFail"));
    }
  };

  // REMOVE ROBOT (Admin - normal)
  const handleRemoveRobot = async (robotId) => {
    if (!await confirm({ message: t("robotRemoveCheck") })) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/admin/robot/remove?id=${robotId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tokenExpired(response.status)) return;

      const result = await response.json();
      if (response.ok && result.type !== 'ERROR') {
        toast.success(t("robotRemoved"));
        fetchRobotsForYear(selectedYear);
      } else {
        toast.error(result.data || t("robotRemoveFail"));
      }
    } catch (error) {
      toast.error(t("robotRemoveFail"));
    }
  };

  const openEditModal = (robot) => {
    setEditRobot({
      id: robot.id,
      name: robot.name,
      number: robot.number || '',
      disciplineId: robot.disciplineId || '',
      confirmed: robot.confirmed
    });
    setEditModal(true);
  };

  return (
    <div className="content">
      {/* Statistics Summary */}
      <Row className="mb-3">
        <Col md="4">
          <Card className="card-stats mb-3 mb-md-0">
            <CardBody className="py-3">
              <div className="d-flex align-items-center">
                <div 
                  className="d-flex align-items-center justify-content-center mr-3"
                  style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #5e72e4 0%, #825ee4 100%)'
                  }}
                >
                  <i className="tim-icons icon-spaceship" style={{ fontSize: '20px', color: '#fff' }} />
                </div>
                <div>
                  <p className="card-category mb-0" style={{ fontSize: '12px' }}>{t("totalRobots")}</p>
                  <CardTitle tag="h3" className="mb-0">{totalRobots}</CardTitle>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md="4">
          <Card className="card-stats mb-3 mb-md-0">
            <CardBody className="py-3">
              <div className="d-flex align-items-center">
                <div 
                  className="d-flex align-items-center justify-content-center mr-3"
                  style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #2dce89 0%, #2dcecc 100%)'
                  }}
                >
                  <i className="tim-icons icon-check-2" style={{ fontSize: '20px', color: '#fff' }} />
                </div>
                <div>
                  <p className="card-category mb-0" style={{ fontSize: '12px' }}>{t("confirmedRobotsCount")}</p>
                  <CardTitle tag="h3" className="mb-0">{confirmedRobots} / {totalRobots}</CardTitle>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md="4">
          <Card className="card-stats mb-3 mb-md-0">
            <CardBody className="py-3">
              <div className="d-flex align-items-center">
                <div 
                  className="d-flex align-items-center justify-content-center mr-3"
                  style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #f5365c 0%, #f56036 100%)'
                  }}
                >
                  <i className="tim-icons icon-alert-circle-exc" style={{ fontSize: '20px', color: '#fff' }} />
                </div>
                <div>
                  <p className="card-category mb-0" style={{ fontSize: '12px' }}>{t("robotsEmptyTeam")}</p>
                  <CardTitle tag="h3" className="mb-0">{robotsWithEmptyTeam}</CardTitle>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xs="12">
          <Card>
            <CardHeader>
              <Row className="align-items-center mb-3">
                <Col>
                  <CardTitle tag="h4">{t("robotOverview")} {selectedYear && `(${selectedYear})`}</CardTitle>
                </Col>
                <Col className="text-right">
                  <Button color="success" onClick={() => setCreateModal(true)}>
                    <i className="tim-icons icon-simple-add mr-1" />
                    {t("robotAdd")}
                  </Button>
                </Col>
              </Row>
              <Row>
                <Col md="3">
                  <Input
                    type="select"
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                  >
                    <option value="all">{t('searchAll') || 'Vše'}</option>
                    <option value="id">ID</option>
                    <option value="number">{t('searchByNumber') || 'Číslo'}</option>
                    <option value="name">{t('searchByRobotName') || 'Název robota'}</option>
                    <option value="team">{t('searchByTeamName') || 'Tým'}</option>
                    <option value="discipline">{t('searchByDiscipline') || 'Disciplína'}</option>
                    <option value="category">{t('searchByCategory') || 'Kategorie'}</option>
                  </Input>
                </Col>
                <Col md="9">
                  <InputGroup>
                    <InputGroupText>
                      <i className="tim-icons icon-zoom-split" />
                    </InputGroupText>
                    <Input
                      type="text"
                      placeholder={
                        searchType === 'id' ? (t('enterId') || 'Zadejte ID...') :
                        searchType === 'number' ? (t('enterNumber') || 'Zadejte číslo...') :
                        searchType === 'name' ? (t('enterRobotName') || 'Zadejte název robota...') :
                        searchType === 'team' ? (t('enterTeamName') || 'Zadejte název týmu...') :
                        searchType === 'discipline' ? (t('enterDiscipline') || 'Zadejte disciplínu...') :
                        searchType === 'category' ? (t('enterCategory') || 'Zadejte kategorii...') :
                        (t('findByTeam') || 'Hledat...')
                      }
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                    {searchTerm && (
                      <InputGroupText 
                        style={{ cursor: 'pointer' }}
                        onClick={() => { setSearchTerm(''); setSearchParams({}); }}
                        title={t('clearSearch') || 'Vymazat'}
                      >
                        <i className="tim-icons icon-simple-remove" />
                      </InputGroupText>
                    )}
                  </InputGroup>
                </Col>
              </Row>
            </CardHeader>
            <CardBody>
              {robots.length > 0 ? (
                <>
                <Table responsive>
                  <thead>
                    <tr>
                      <th>{t("id")}</th>
                      <th>{t("robotNum")}</th>
                      <th>{t("title")}</th>
                      <th>{t("category")}</th>
                      <th>{t("team")}</th>
                      <th>{t("discipline")}</th>
                      <th>{t("confirm")}</th>
                      <th style={{ textAlign: 'center' }}>{t("action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRobots
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map(robot => (
                      <tr key={robot.id} style={robot.teamMemberCount === 0 ? { backgroundColor: 'rgba(255, 90, 90, 0.15)' } : {}}>
                        <td>
                          <a 
                            href="#" 
                            onClick={(e) => { e.preventDefault(); navigateToProfile(robot.id); }}
                            style={{ color: '#5e72e4', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            #{robot.id}
                          </a>
                        </td>
                        <td>{robot.number}</td>
                        <td>{robot.name}</td>
                        <td>{getCategoryDisplay(robot.category)}</td>
                        <td>
                          {robot.teamName}
                          {robot.teamMemberCount === 0 && (
                            <Badge color="danger" className="ml-2" title={t("teamHasNoMembers")}>
                              <i className="tim-icons icon-alert-circle-exc" />
                            </Badge>
                          )}
                        </td>
                        <td>{robot.diciplineName}</td>
                        <td style={{ textAlign: 'center' }}>
                          {robot.diciplineName && (
                            <Button
                              color={robot.confirmed ? "success" : "warning"}
                              size="sm"
                              className="btn-icon"
                              onClick={() => handleConfirmRegistration(robot.id, !robot.confirmed)}
                              title={robot.confirmed ? t("unconfirm") : t("confirm")}
                            >
                              <i className={robot.confirmed ? "tim-icons icon-check-2" : "tim-icons icon-simple-remove"} />
                            </Button>)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Button
                            color="primary"
                            size="sm"
                            className="btn-icon"
                            onClick={() => openEditModal(robot)}
                            title={t("edit")}
                          >
                            <i className="tim-icons icon-pencil" />
                          </Button>
                          <Button
                            color="danger"
                            size="sm"
                            className="btn-icon ml-1"
                            onClick={() => handleForceRemove(robot.id)}
                            title={t("remove")}
                          >
                            <i className="tim-icons icon-trash-simple" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                
                <TablePagination
                  currentPage={currentPage}
                  totalItems={filteredRobots.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={(page) => setCurrentPage(page)}
                  onItemsPerPageChange={(items) => { setItemsPerPage(items); setCurrentPage(1); }}
                />
                </>
              ) : (
                <div>{t("noRobotsFoundYear")}</div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Create Robot Modal */}
      <Modal isOpen={createModal} toggle={() => setCreateModal(false)} size="lg">
        <ModalHeader toggle={() => setCreateModal(false)}>{t("robotAdd")}</ModalHeader>
        <ModalBody style={{ padding: '20px 25px' }}>
          <Form>
            <FormGroup style={{ marginBottom: '15px' }}>
              <Label>{t("team")} *</Label>
              <TeamSearchSelect
                teams={getTeamsFromRegistrations()}
                onSelect={setSelectedTeamForRobot}
                selectedTeam={selectedTeamForRobot}
                placeholder={t("searchTeamPlaceholder")}
                showLeaderInfo={false}
              />
              {errors.teamRegistrationId && <div className="text-danger" style={{ fontSize: '12px', marginTop: '5px' }}>{errors.teamRegistrationId}</div>}
            </FormGroup>
            <FormGroup>
              <Label>{t("robotName")} *</Label>
              <Input
                type="text"
                value={newRobot.name}
                onChange={e => setNewRobot({ ...newRobot, name: e.target.value })}
                invalid={!!errors.name}
                placeholder={t("robotEnterName")}
              />
              {errors.name && <FormFeedback>{errors.name}</FormFeedback>}
            </FormGroup>
            <FormGroup>
              <Label>{t("discipline")}</Label>
              <Input
                type="select"
                value={newRobot.disciplineId}
                onChange={e => setNewRobot({ ...newRobot, disciplineId: e.target.value })}
              >
                <option value="">{t("noDiscipline")}</option>
                {disciplines.map(disc => (
                  <option key={disc.id} value={disc.id}>{disc.name}</option>
                ))}
              </Input>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter style={{ padding: '15px 25px' }}>
          <Button color="success" onClick={handleCreateRobot} style={{ marginRight: '10px' }}>{t("create")}</Button>
          <Button color="secondary" onClick={() => setCreateModal(false)}>{t("cancel")}</Button>
        </ModalFooter>
      </Modal>

      {/* Edit Robot Modal */}
      <Modal isOpen={editModal} toggle={() => setEditModal(false)} size="lg">
        <ModalHeader toggle={() => setEditModal(false)}>{t("robotEdit")}</ModalHeader>
        <ModalBody style={{ padding: '20px 25px' }}>
          <Form>
            <FormGroup>
              <Label>{t("robotName")}</Label>
              <Input
                type="text"
                value={editRobot.name}
                onChange={e => setEditRobot({ ...editRobot, name: e.target.value })}
              />
            </FormGroup>
            <FormGroup>
              <Label>{t("robotNum")}</Label>
              <Input
                type="number"
                value={editRobot.number}
                onChange={e => setEditRobot({ ...editRobot, number: e.target.value })}
              />
            </FormGroup>
            <FormGroup>
              <Label>{t("discipline")}</Label>
              <Input
                type="select"
                value={editRobot.disciplineId}
                onChange={e => setEditRobot({ ...editRobot, disciplineId: e.target.value })}
              >
                <option value="">{t("noChange")}</option>
                <option value="-1">{t("removeDiscipline")}</option>
                {disciplines.map(disc => (
                  <option key={disc.id} value={disc.id}>{disc.name}</option>
                ))}
              </Input>
            </FormGroup>
            <FormGroup check>
              <Label check>
                <Input
                  type="checkbox"
                  checked={editRobot.confirmed}
                  onChange={e => setEditRobot({ ...editRobot, confirmed: e.target.checked })}
                />
                {' '}{t("confirmed")}
              </Label>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter style={{ padding: '15px 25px' }}>
          <Button color="primary" onClick={handleEditRobot} style={{ marginRight: '10px' }}>{t("save")}</Button>
          <Button color="secondary" onClick={() => setEditModal(false)}>{t("cancel")}</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default RobotManagement;