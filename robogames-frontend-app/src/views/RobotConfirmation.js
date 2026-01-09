/**
* The `RobotConfirmation` component is responsible for displaying a list of robots and allowing the user to confirm or reject their registration.
* 
* The component fetches the list of competition years and the robots for the selected year. It allows the user to filter the robots by team name and provides buttons to confirm or reject the registration of each robot.
* 
* When the user clicks the confirm or reject button, the component sends a PUT request to the server to update the robot's registration status. Upon successful update, the component refreshes the list of robots to show the updated statuses.

*/
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardHeader, CardBody, CardTitle, Button,
  Table, Row, Col, Input,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Form, FormGroup, Label, FormFeedback
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { useAdmin } from "contexts/AdminContext";
import { useToast } from "contexts/ToastContext";
import { t } from "translations/translate";
import TeamSearchSelect from "components/TeamSearchSelect/TeamSearchSelect";

function RobotConfirmation() {
  const navigate = useNavigate();
  const { selectedYear } = useAdmin();
  const [robots, setRobots] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [disciplines, setDisciplines] = useState([]);
  const [registrations, setRegistrations] = useState([]);

  // Admin modal states
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [newRobot, setNewRobot] = useState({ teamRegistrationId: '', name: '', disciplineId: '' });
  const [editRobot, setEditRobot] = useState({ id: null, name: '', number: '', disciplineId: '', confirmed: false });
  const [selectedTeamForRobot, setSelectedTeamForRobot] = useState(null);
  const [errors, setErrors] = useState({});

  const { token, tokenExpired } = useUser();
  const toast = useToast();

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
    if (window.confirm(t("robotAction", { conf: confirmed ? t("confirm_lower") : t("remove_lower") }))) {
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

  const filteredRobots = robots.filter(robot => robot.teamName.toLowerCase().includes(searchTerm.toLowerCase()));

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
      if (response.ok) {
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
      if (response.ok) {
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
    if (!window.confirm(t("robotForceConfirmCheck", { action: confirmed ? t("confirm_lower") : t("remove_lower") }))) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}api/admin/robot/forceConfirm?id=${robotId}&confirmed=${confirmed}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (tokenExpired(response.status)) return;

      if (response.ok) {
        toast.success(t("robotForceConfirmed"));
        fetchRobotsForYear(selectedYear);
      } else {
        const result = await response.json();
        toast.error(result.data || t("robotForceConfirmFail"));
      }
    } catch (error) {
      toast.error(t("robotForceConfirmFail"));
    }
  };

  // FORCE REMOVE ROBOT (Admin)
  const handleForceRemove = async (robotId) => {
    if (!window.confirm(t("robotForceRemoveCheck"))) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/admin/robot/forceRemove?id=${robotId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tokenExpired(response.status)) return;

      if (response.ok) {
        toast.success(t("robotForceRemoved"));
        fetchRobotsForYear(selectedYear);
      } else {
        const result = await response.json();
        toast.error(result.data || t("robotForceRemoveFail"));
      }
    } catch (error) {
      toast.error(t("robotForceRemoveFail"));
    }
  };

  // REMOVE ROBOT (Admin - normal)
  const handleRemoveRobot = async (robotId) => {
    if (!window.confirm(t("robotRemoveCheck"))) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/admin/robot/remove?id=${robotId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tokenExpired(response.status)) return;

      if (response.ok) {
        toast.success(t("robotRemoved"));
        fetchRobotsForYear(selectedYear);
      } else {
        const result = await response.json();
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
      <Row>
        <Col xs="12">
          <Card>
            <CardHeader>
              <Row className="align-items-center">
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
              <Input
                type="text"
                placeholder={t("findByTeam")}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '300px', marginTop: '15px' }}
              />
            </CardHeader>
            <CardBody>
              {robots.length > 0 ? (
                <Table responsive>
                  <thead>
                    <tr>
                      <th>{t("id")}</th>
                      <th>{t("robotNum")}</th>
                      <th>{t("title")}</th>
                      <th>{t("confirmed")}</th>
                      <th>{t("category")}</th>
                      <th>{t("team")}</th>
                      <th>{t("discipline")}</th>
                      <th>{t("confirm")}</th>
                      <th style={{ textAlign: 'center' }}>{t("adminActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRobots.map(robot => (
                      <tr key={robot.id}>
                        <td>{robot.id}</td>
                        <td>{robot.number}</td>
                        <td>{robot.name}</td>
                        <td>{robot.confirmed ? t("yes") : t("no")}</td>
                        <td>{robot.category}</td>
                        <td>{robot.teamName}</td>
                        <td>{robot.diciplineName}</td>
                        <td>
                          {robot.diciplineName && (
                            <Button
                              color={robot.confirmed ? "warning" : "success"}
                              className="btn-icon btn-simple"
                              onClick={() => handleConfirmRegistration(robot.id, !robot.confirmed)}
                            >
                              <i className={robot.confirmed ? "tim-icons icon-simple-remove" : "tim-icons icon-check-2"} />
                            </Button>)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Button
                            color="info"
                            className="btn-icon btn-simple"
                            onClick={() => navigate(`/admin/robot-profile?id=${robot.id}`)}
                            title={t("showProfile")}
                          >
                            <i className="tim-icons icon-badge" />
                          </Button>
                          <Button
                            color="primary"
                            className="btn-icon btn-simple ml-1"
                            onClick={() => openEditModal(robot)}
                            title={t("edit")}
                          >
                            <i className="tim-icons icon-pencil" />
                          </Button>
                          <Button
                            color="danger"
                            className="btn-icon btn-simple ml-1"
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

export default RobotConfirmation;