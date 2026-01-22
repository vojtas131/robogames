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
  InputGroup,
  InputGroupText,
  FormFeedback,
} from "reactstrap";
import { useUser } from "contexts/UserContext";
import { useToast } from "contexts/ToastContext";
import { useConfirm } from "components/ConfirmModal";
import { t } from "translations/translate";
import UserSearchSelect from "components/UserSearchSelect/UserSearchSelect";
import TablePagination from "components/TablePagination";

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

  // Search/Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('all'); // 'all', 'id', 'name', 'leader', 'member'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Retrieve user roles
  const rolesString = localStorage.getItem('roles');
  const rolesArray = rolesString ? rolesString.split(', ') : [];
  const isAdmin = rolesArray.some(role => ['ADMIN'].includes(role));

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, searchType]);

  const { token, tokenExpired } = useUser();
  const toast = useToast();
  const { confirm } = useConfirm();

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
      if (response.ok && result.type !== 'ERROR') {
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
      if (response.ok && result.type !== 'ERROR') {
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
    if (!await confirm({ message: t("teamRemoveCheck") })) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/admin/team/remove?id=${teamId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tokenExpired(response.status)) return;

      const result = await response.json();

      if (response.ok && result.type !== 'ERROR') {
        toast.success(t("teamRemoved"));
        fetchTeams();
      } else {
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

      const result = await response.json();
      if (response.ok && result.type !== 'ERROR') {
        toast.success(t("userAddedToTeam"));
        setAddUserModal(false);
        setSelectedUser(null);
        fetchTeams();
      } else if (result.type === 'ERROR' && result.data.includes('team already has maximum')) {
        toast.error(t("teamFull"));
      } else {
        toast.error(result.data || t("userAddToTeamFail"));
      }
    } catch (error) {
      toast.error(t("userAddToTeamFail"));
    }
  };

  // REMOVE USER FROM TEAM
  const handleRemoveUserFromTeam = async (teamId, userId) => {
    if (!await confirm({ message: t("teamRemoveUser") })) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}api/admin/team/removeUser?teamId=${teamId}&userId=${userId}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (tokenExpired(response.status)) return;

      const result = await response.json();
      if (response.ok && result.type !== 'ERROR') {
        toast.success(t("teamUserRemoved"));
        fetchTeams();
      } else {
        toast.error(result.data || t("teamUserRemoveFail"));
      }
    } catch (error) {
      toast.error(t("teamUserRemoveFail"));
    }
  };

  // SET TEAM LEADER
  const handleSetLeader = async (teamId, newLeaderId) => {
    if (!await confirm({ message: t("setLeaderConfirm") })) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}api/admin/team/setLeader?teamId=${teamId}&newLeaderId=${newLeaderId}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (tokenExpired(response.status)) return;

      const result = await response.json();
      if (response.ok && result.type !== 'ERROR') {
        toast.success(t("leaderChanged"));
        fetchTeams();
      } else {
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

  const filteredTeams = teams.filter(team => {
    const searchLower = searchTerm.toLowerCase();
    if (!searchTerm) return true;

    switch (searchType) {
      case 'id':
        return team.id.toString().includes(searchTerm);
      case 'name':
        return team.name.toLowerCase().includes(searchLower);
      case 'leader':
        return team.leaderName.toLowerCase().includes(searchLower);
      case 'member':
        return team.memberNames.some(member =>
          `${member.name} ${member.surname}`.toLowerCase().includes(searchLower) ||
          member.name.toLowerCase().includes(searchLower) ||
          member.surname.toLowerCase().includes(searchLower)
        );
      case 'all':
      default:
        // Search by team ID
        if (team.id.toString().includes(searchTerm)) return true;
        // Search by team name
        if (team.name.toLowerCase().includes(searchLower)) return true;
        // Search by leader name
        if (team.leaderName.toLowerCase().includes(searchLower)) return true;
        // Search by any member name
        if (team.memberNames.some(member =>
          `${member.name} ${member.surname}`.toLowerCase().includes(searchLower) ||
          member.name.toLowerCase().includes(searchLower) ||
          member.surname.toLowerCase().includes(searchLower)
        )) return true;
        return false;
    }
  });

  // Calculate summary statistics
  const totalTeams = teams.length;
  const emptyTeams = teams.filter(team => team.memberNames.length === 0 || (team.memberNames.length === 1 && team.memberNames[0].id === team.leaderID)).length;
  const singleMemberTeams = teams.filter(team => team.memberNames.length === 1).length;
  const totalMembers = teams.reduce((acc, team) => acc + team.memberNames.length, 0);
  const avgMembersPerTeam = totalTeams > 0 ? (totalMembers / totalTeams).toFixed(1) : 0;

  if (loading) {
    return <div className="content"><p>{t("loading")}</p></div>;
  }

  return (
    <div className="content">
      {/* Summary Statistics */}
      <Row className="mb-3">
        <Col md="3">
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
                  <i className="tim-icons icon-single-02" style={{ fontSize: '20px', color: '#fff' }} />
                </div>
                <div>
                  <p className="card-category mb-0" style={{ fontSize: '12px' }}>{t("totalTeams") || "Celkem týmů"}</p>
                  <CardTitle tag="h3" className="mb-0">{totalTeams}</CardTitle>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md="3">
          <Card className="card-stats mb-3 mb-md-0">
            <CardBody className="py-3">
              <div className="d-flex align-items-center">
                <div
                  className="d-flex align-items-center justify-content-center mr-3"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #fb6340 0%, #fbb140 100%)'
                  }}
                >
                  <i className="tim-icons icon-alert-circle-exc" style={{ fontSize: '20px', color: '#fff' }} />
                </div>
                <div>
                  <p className="card-category mb-0" style={{ fontSize: '12px' }}>{t("singleMemberTeams") || "Jednočlenné týmy"}</p>
                  <CardTitle tag="h3" className="mb-0">{singleMemberTeams}</CardTitle>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md="3">
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
                  <i className="tim-icons icon-single-02" style={{ fontSize: '20px', color: '#fff' }} />
                </div>
                <div>
                  <p className="card-category mb-0" style={{ fontSize: '12px' }}>{t("totalMembers") || "Celkem členů"}</p>
                  <CardTitle tag="h3" className="mb-0">{totalMembers}</CardTitle>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md="3">
          <Card className="card-stats mb-3 mb-md-0">
            <CardBody className="py-3">
              <div className="d-flex align-items-center">
                <div
                  className="d-flex align-items-center justify-content-center mr-3"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #11cdef 0%, #1171ef 100%)'
                  }}
                >
                  <i className="tim-icons icon-chart-bar-32" style={{ fontSize: '20px', color: '#fff' }} />
                </div>
                <div>
                  <p className="card-category mb-0" style={{ fontSize: '12px' }}>{t("avgMembersPerTeam") || "Průměr členů/tým"}</p>
                  <CardTitle tag="h3" className="mb-0">{avgMembersPerTeam}</CardTitle>
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
                  <CardTitle tag="h4">{t("teamManagement")}</CardTitle>
                </Col>
                {isAdmin && (
                  <Col className="text-right">
                    <Button color="success" onClick={() => setCreateModal(true)}>
                      <i className="tim-icons icon-simple-add mr-1" />
                      {t("teamCreateNew")}
                    </Button>
                  </Col>
                )}
              </Row>
              <Row>
                <Col md="3">
                  <Input
                    type="select"
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                  >
                    <option value="all">{t('searchAll') || 'Vše'}</option>
                    <option value="id">{t('searchTeamById') || 'ID'}</option>
                    <option value="name">{t('searchByTeamName') || 'Název týmu'}</option>
                    <option value="leader">{t('searchByLeader') || 'Vedoucí'}</option>
                    <option value="member">{t('searchByMember') || 'Člen'}</option>
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
                          searchType === 'name' ? (t('enterTeamName') || 'Zadejte název týmu...') :
                            searchType === 'leader' ? (t('enterLeaderName') || 'Zadejte jméno vedoucího...') :
                              searchType === 'member' ? (t('enterMemberName') || 'Zadejte jméno člena...') :
                                (t('searchTeamOrMember') || 'Hledat tým...')
                      }
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <InputGroupText
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSearchTerm('')}
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
              <Table responsive>
                <thead className="text-primary">
                  <tr>
                    <th>{t("id")}</th>
                    <th>{t("title")}</th>
                    <th>{t("leader")}</th>
                    <th>{t("members")}</th>
                    {isAdmin && (
                      <th style={{ textAlign: 'center' }}>{t("action")}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredTeams
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((team) => (
                      <tr key={team.id}>
                        <td>#{team.id}</td>
                        <td>{team.name}</td>
                        <td>{team.leaderName}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {team.memberNames.map((member) => (
                              <div key={member.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '4px 8px',
                                backgroundColor: member.id === team.leaderID ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255,255,255,0.05)',
                                borderRadius: '4px',
                                borderLeft: member.id === team.leaderID ? '3px solid #ffd700' : '3px solid transparent'
                              }}>
                                <span style={{ flex: 1 }}>
                                  {`${member.name} ${member.surname}`}
                                  {member.id === team.leaderID && (
                                    <span style={{ marginLeft: '6px', color: '#ffd700' }}>⭐</span>
                                  )}
                                </span>
                                {member.id !== team.leaderID && isAdmin && (
                                  <div style={{ display: 'flex', gap: '2px', marginLeft: '8px' }}>
                                    <Button
                                      color="info"
                                      size="sm"
                                      className="btn-icon"
                                      style={{ padding: '2px 5px', fontSize: '10px', width: '22px', height: '22px', minWidth: '22px' }}
                                      onClick={() => handleSetLeader(team.id, member.id)}
                                      title={t("setAsLeader")}
                                    >
                                      <i className="tim-icons icon-badge" />
                                    </Button>
                                    <Button
                                      color="danger"
                                      size="sm"
                                      className="btn-icon"
                                      style={{ padding: '2px 5px', fontSize: '10px', width: '22px', height: '22px', minWidth: '22px' }}
                                      onClick={() => handleRemoveUserFromTeam(team.id, member.id)}
                                      title={t("removeFromTeam")}
                                    >
                                      <i className="tim-icons icon-simple-remove" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                            {team.memberNames.length === 0 && (
                              <span style={{ color: '#aaa', fontStyle: 'italic' }}>
                                {t("noMembers") || "Žádní členové"}
                              </span>
                            )}
                          </div>
                        </td>
                        {isAdmin && (
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
                          </td>)}
                      </tr>
                    ))}
                </tbody>
              </Table>

              <TablePagination
                currentPage={currentPage}
                totalItems={filteredTeams.length}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
                onItemsPerPageChange={(items) => { setItemsPerPage(items); setCurrentPage(1); }}
              />

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
              <Label>{t("newLeader")} ({t("optionalLabel")})</Label>
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
