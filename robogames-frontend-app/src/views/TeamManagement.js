import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Table,
  Row,
  Col,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
  Input,
  FormFeedback,
} from "reactstrap";
import { useUser } from "contexts/UserContext";
import { useToast } from "contexts/ToastContext";
import { t } from "translations/translate";
import UserSearchSelect from "components/UserSearchSelect/UserSearchSelect";

/**
 * Admin component for managing teams - CRUD operations, user management within teams
 */
function TeamManagement() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [addUserModal, setAddUserModal] = useState(false);

  // Form states
  const [newTeam, setNewTeam] = useState({ name: '', leader: null });
  const [editTeam, setEditTeam] = useState({ id: null, name: '', leader: null });
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const { token, tokenExpired } = useUser();
  const toast = useToast();

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tokenExpired(response.status)) return;

      const json = await response.json();
      if (response.ok && json.type === 'RESPONSE') {
        const teamsWithLeader = json.data.map(team => {
          const leader = team.memberNames.find(member => member.id === team.leaderID);
          return {
            ...team,
            leaderName: leader ? `${leader.name} ${leader.surname}` : t("leaderUnknown")
          };
        });
        setTeams(teamsWithLeader);
      }
    } catch (error) {
      console.error(t("teamLoadError"), error);
    } finally {
      setLoading(false);
    }
  };

  // Validate team name
  const validateTeamName = (name) => {
    if (!name || name.trim().length === 0) return 'empty';
    if (name.length < 2) return 'short';
    if (name.length > 50) return 'long';
    return true;
  };

  // CREATE TEAM
  const handleCreateTeam = async () => {
    const nameCheck = validateTeamName(newTeam.name);
    if (nameCheck !== true) {
      setErrors({ name: nameCheck === 'empty' ? t("fieldsRequired") : nameCheck === 'short' ? t("shortTitle") : t("longTitle") });
      return;
    }

    if (!newTeam.leader) {
      setErrors({ leaderId: t("fieldsRequired") });
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/admin/team/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newTeam.name,
          leaderId: newTeam.leader.id,
          memberIds: [newTeam.leader.id]
        })
      });
      if (tokenExpired(response.status)) return;

      const result = await response.json();
      if (response.ok) {
        toast.success(t("teamCreated"));
        setCreateModal(false);
        setNewTeam({ name: '', leader: null });
        setErrors({});
        fetchTeams();
      } else {
        toast.error(result.data || t("teamCreateFail"));
      }
    } catch (error) {
      toast.error(t("teamCreateFail"));
    }
  };

  // EDIT TEAM
  const handleEditTeam = async () => {
    const nameCheck = validateTeamName(editTeam.name);
    if (nameCheck !== true) {
      setErrors({ name: nameCheck === 'empty' ? t("fieldsRequired") : nameCheck === 'short' ? t("shortTitle") : t("longTitle") });
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/admin/team/edit?id=${editTeam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editTeam.name,
          leaderId: editTeam.leader ? editTeam.leader.id : null
        })
      });
      if (tokenExpired(response.status)) return;

      const result = await response.json();
      if (response.ok) {
        toast.success(t("teamEdited"));
        setEditModal(false);
        setErrors({});
        fetchTeams();
      } else {
        toast.error(result.data || t("teamEditFail"));
      }
    } catch (error) {
      toast.error(t("teamEditFail"));
    }
  };

  // DELETE TEAM
  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm(t("teamRemoveCheck"))) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/admin/team/remove?id=${teamId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tokenExpired(response.status)) return;

      if (response.ok) {
        toast.success(t("teamRemoved"));
        fetchTeams();
      } else {
        const result = await response.json();
        toast.error(result.data || t("teamRemoveFail"));
      }
    } catch (error) {
      toast.error(t("teamRemoveFail"));
    }
  };

  // ADD USER TO TEAM
  const handleAddUserToTeam = async () => {
    if (!selectedUser || !selectedTeam) {
      toast.warning(t("fieldsRequired"));
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}api/admin/team/addUser?teamId=${selectedTeam.id}&userId=${selectedUser.id}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (tokenExpired(response.status)) return;

      if (response.ok) {
        toast.success(t("userAddedToTeam"));
        setAddUserModal(false);
        setSelectedUser(null);
        fetchTeams();
      } else {
        const result = await response.json();
        toast.error(result.data || t("userAddToTeamFail"));
      }
    } catch (error) {
      toast.error(t("userAddToTeamFail"));
    }
  };

  // REMOVE USER FROM TEAM
  const handleRemoveUserFromTeam = async (teamId, userId) => {
    if (!window.confirm(t("teamRemoveUser"))) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}api/admin/team/removeUser?teamId=${teamId}&userId=${userId}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (tokenExpired(response.status)) return;

      if (response.ok) {
        toast.success(t("teamUserRemoved"));
        fetchTeams();
      } else {
        const result = await response.json();
        toast.error(result.data || t("teamUserRemoveFail"));
      }
    } catch (error) {
      toast.error(t("teamUserRemoveFail"));
    }
  };

  // SET TEAM LEADER
  const handleSetLeader = async (teamId, newLeaderId) => {
    if (!window.confirm(t("setLeaderConfirm"))) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}api/admin/team/setLeader?teamId=${teamId}&newLeaderId=${newLeaderId}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (tokenExpired(response.status)) return;

      if (response.ok) {
        toast.success(t("leaderChanged"));
        fetchTeams();
      } else {
        const result = await response.json();
        toast.error(result.data || t("leaderChangeFail"));
      }
    } catch (error) {
      toast.error(t("leaderChangeFail"));
    }
  };

  const openEditModal = (team) => {
    setEditTeam({
      id: team.id,
      name: team.name,
      leader: null
    });
    setEditModal(true);
  };

  const openAddUserModal = (team) => {
    setSelectedTeam(team);
    setSelectedUser(null);
    setAddUserModal(true);
  };

  // Get IDs of users already in the selected team (for exclusion in search)
  const getExcludedUserIds = () => {
    if (!selectedTeam) return [];
    return selectedTeam.memberNames.map(m => m.id);
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.leaderName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="content"><p>{t("loading")}</p></div>;
  }

  return (
    <div className="content">
      <Row>
        <Col xs="12">
          <Card>
            <CardHeader>
              <Row className="align-items-center">
                <Col>
                  <CardTitle tag="h4">{t("teamManagement")}</CardTitle>
                </Col>
                <Col className="text-right">
                  <Button color="success" onClick={() => setCreateModal(true)}>
                    <i className="tim-icons icon-simple-add mr-1" />
                    {t("teamCreateNew")}
                  </Button>
                </Col>
              </Row>
              <Input
                type="text"
                placeholder={t("searchTeam")}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '300px', marginTop: '15px' }}
              />
            </CardHeader>
            <CardBody>
              <Table responsive>
                <thead className="text-primary">
                  <tr>
                    <th>{t("id")}</th>
                    <th>{t("title")}</th>
                    <th>{t("leader")}</th>
                    <th>{t("members")}</th>
                    <th style={{ textAlign: 'center' }}>{t("action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeams.map((team) => (
                    <tr key={team.id}>
                      <td>{team.id}</td>
                      <td>{team.name}</td>
                      <td>{team.leaderName}</td>
                      <td>
                        {team.memberNames.map((member, idx) => (
                          <span key={member.id}>
                            {`${member.name} ${member.surname}`}
                            {member.id === team.leaderID && ' ⭐'}
                            {member.id !== team.leaderID && (
                              <>
                                <Button
                                  color="warning"
                                  size="sm"
                                  className="btn-icon btn-simple ml-1"
                                  onClick={() => handleSetLeader(team.id, member.id)}
                                  title={t("setAsLeader")}
                                >
                                  <i className="tim-icons icon-badge" />
                                </Button>
                                <Button
                                  color="danger"
                                  size="sm"
                                  className="btn-icon btn-simple ml-1"
                                  onClick={() => handleRemoveUserFromTeam(team.id, member.id)}
                                  title={t("removeFromTeam")}
                                >
                                  <i className="tim-icons icon-simple-remove" />
                                </Button>
                              </>
                            )}
                            {idx < team.memberNames.length - 1 && ', '}
                          </span>
                        ))}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Button
                          color="info"
                          size="sm"
                          className="btn-icon"
                          onClick={() => openAddUserModal(team)}
                          title={t("addUserToTeam")}
                        >
                          <i className="tim-icons icon-single-02" />
                        </Button>
                        <Button
                          color="primary"
                          size="sm"
                          className="btn-icon ml-1"
                          onClick={() => openEditModal(team)}
                          title={t("edit")}
                        >
                          <i className="tim-icons icon-pencil" />
                        </Button>
                        <Button
                          color="danger"
                          size="sm"
                          className="btn-icon ml-1"
                          onClick={() => handleDeleteTeam(team.id)}
                          title={t("remove")}
                        >
                          <i className="tim-icons icon-trash-simple" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {filteredTeams.length === 0 && (
                <p className="text-center">{t("noTeamsFound")}</p>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Create Team Modal */}
      <Modal isOpen={createModal} toggle={() => setCreateModal(false)} size="lg">
        <ModalHeader toggle={() => setCreateModal(false)}>{t("teamCreateNew")}</ModalHeader>
        <ModalBody style={{ padding: '20px 25px' }}>
          <Form>
            <FormGroup style={{ marginBottom: '20px' }}>
              <Label>{t("teamName")} *</Label>
              <Input
                type="text"
                value={newTeam.name}
                onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                invalid={!!errors.name}
                placeholder={t("nameEg")}
              />
              {errors.name && <FormFeedback>{errors.name}</FormFeedback>}
            </FormGroup>
            <FormGroup style={{ marginBottom: '20px' }}>
              <Label>{t("leader")} *</Label>
              <UserSearchSelect
                onSelect={(user) => setNewTeam({ ...newTeam, leader: user })}
                selectedUser={newTeam.leader}
                placeholder={t("searchUserPlaceholder")}
              />
              {errors.leaderId && (
                <div className="text-danger" style={{ fontSize: '12px', marginTop: '5px' }}>
                  {errors.leaderId}
                </div>
              )}
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter style={{ padding: '15px 25px' }}>
          <Button color="success" onClick={handleCreateTeam} style={{ marginRight: '10px' }}>{t("create")}</Button>
          <Button color="secondary" onClick={() => setCreateModal(false)}>{t("cancel")}</Button>
        </ModalFooter>
      </Modal>

      {/* Edit Team Modal */}
      <Modal isOpen={editModal} toggle={() => setEditModal(false)} size="lg">
        <ModalHeader toggle={() => setEditModal(false)}>{t("teamEdit")}</ModalHeader>
        <ModalBody style={{ padding: '20px 25px' }}>
          <Form>
            <FormGroup style={{ marginBottom: '20px' }}>
              <Label>{t("teamName")} *</Label>
              <Input
                type="text"
                value={editTeam.name}
                onChange={e => setEditTeam({ ...editTeam, name: e.target.value })}
                invalid={!!errors.name}
              />
              {errors.name && <FormFeedback>{errors.name}</FormFeedback>}
            </FormGroup>
            <FormGroup style={{ marginBottom: '20px' }}>
              <Label>{t("newLeader")} ({t("optional")})</Label>
              <UserSearchSelect
                onSelect={(user) => setEditTeam({ ...editTeam, leader: user })}
                selectedUser={editTeam.leader}
                placeholder={t("searchUserPlaceholder")}
              />
              <small className="text-muted">{t("leaveEmptyNoChange")}</small>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter style={{ padding: '15px 25px' }}>
          <Button color="primary" onClick={handleEditTeam} style={{ marginRight: '10px' }}>{t("save")}</Button>
          <Button color="secondary" onClick={() => setEditModal(false)}>{t("cancel")}</Button>
        </ModalFooter>
      </Modal>

      {/* Add User to Team Modal */}
      <Modal isOpen={addUserModal} toggle={() => setAddUserModal(false)} size="lg">
        <ModalHeader toggle={() => setAddUserModal(false)}>
          {t("addUserToTeam")} - {selectedTeam?.name}
        </ModalHeader>
        <ModalBody style={{ padding: '20px 25px' }}>
          <Form>
            <FormGroup style={{ marginBottom: '20px' }}>
              <Label>{t("searchAndSelectUser")} *</Label>
              <UserSearchSelect
                onSelect={setSelectedUser}
                selectedUser={selectedUser}
                placeholder={t("searchUserPlaceholder")}
                excludeUserIds={getExcludedUserIds()}
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter style={{ padding: '15px 25px' }}>
          <Button color="success" onClick={handleAddUserToTeam} style={{ marginRight: '10px' }}>{t("add")}</Button>
          <Button color="secondary" onClick={() => setAddUserModal(false)}>{t("cancel")}</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default TeamManagement;
