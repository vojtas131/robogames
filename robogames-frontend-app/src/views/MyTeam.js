import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  Table,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormGroup,
  Label,
  Input,
  Alert,
  CardFooter,
  ListGroup,
  ListGroupItem
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { useToast } from "contexts/ToastContext";
import { t } from "translations/translate";

export function validateTitle(title) {
  const allowed = /^[A-Za-z0-9ČŠŽŘŤĎŇÁÉĚÍÓÚŮÝčšžřťďňáéěíóúůýßäöüÄÖÜàèìòùâêîôûãõñëïÿ\s'-.:,/?!+]+$/;
  if (allowed.test(title)) {
    if (title.length < process.env.REACT_APP_TITLE_MIN_LENGTH) {
      return "too short"
    } else if (title.length > process.env.REACT_APP_TITLE_MAX_LENGTH) {
      return "too long"
    } else {
      return true;
    }
  } else { return false; }
}

function MyTeam() {
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [leaderName, setLeaderName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creationError, setCreationError] = useState('');
  const [searchModal, setSearchModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const userID = localStorage.getItem('UserID');
  const [users, setUsers] = useState([]); // Full list of users
  const [filteredUsers, setFilteredUsers] = useState([]);

  const { token, tokenExpired } = useUser();
  const toast = useToast();

  useEffect(() => {
    if (!token) return;

    fetchMyTeam();
  }, [token]);

  const fetchMyTeam = async () => {
    if (!token) {
      setError(t("teamShowLogin"));
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/myTeam`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tokenExpired(response.status)) { return; }

      if (!response.ok) {
        setError(t("teamFetchFail"));
        return;
      }

      const data = await response.json();
      if (data.type !== 'ERROR') {
        setTeam(data.data);
        const leader = data.data.memberNames.find(member => member.id === data.data.leaderID);
        setLeaderName(leader ? `${leader.name} ${leader.surname}` : t("leaderUnknown"));
      } else {
        setError(t("inNoTeam"));
      }
    } catch (error) {
      setError(t("teamFetchFail"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!token) {
      setCreationError(t("teamCreateLogin"));
      return;
    }

    var titleCheck = validateTitle(newTeamName);
    if (!titleCheck) {
      setCreationError(t("invalidTitle"));
      return;
    } else if (titleCheck === "too short") {
      setCreationError(t("shortTitle"));
      return;
    } else if (titleCheck === "too long") {
      setCreationError(t("longTitle"));
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newTeamName })
      });
      if (tokenExpired(response.status)) { return; }

      const data = await response.json();
      if (response.ok && data.type != 'ERROR') {
        setTeam(data.data);

        setCreateModal(false);
        setNewTeamName('');
        window.location.reload();
      } else {
        // Handle specific error for duplicate team name
        if (data.type == 'ERROR' && data.data == 'failure, team with this name already exists') {
          setCreationError(t("teamExists"));
          console.log(data);


        } else {
          setCreationError(data.data || t("teamCreateFail"));
        }
      }
    } catch (error) {
      setCreationError(t("serverCommError"));
    }
  };

  const handleRenameTeam = async () => {
    var titleCheck = validateTitle(newTeamName);
    if (!titleCheck) {
      setCreationError(t("invalidTitle"));
      return;
    } else if (titleCheck === "too short") {
      setCreationError(t("shortTitle"));
      return;
    } else if (titleCheck === "too long") {
      setCreationError(t("longTitle"));
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/rename?name=${newTeamName}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (tokenExpired(response.status)) { return; }

      if (!response.ok) throw new Error(t("teamRenameFail"));

      const data = await response.json();
      if (response.ok && data.type != 'ERROR') {
        console.log('Uložení se podařilo:', data);
        toast.success(t("teamRenamed"));
        window.location.reload();
      } else if (data.type === "ERROR" && data.data.includes("already exists")) {
        setCreationError(t("teamExists"));  // Team name is already in database
      } else {
        setCreationError(t("teamRenameFail"));
      }
    } catch (error) {
      console.error('Update selhal:', error);
      toast.error(t("dataSaveFail"));
    }
  }

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/user/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tokenExpired(response.status)) { return; }

        const data = await response.json();
        if (response.ok) {
          setUsers(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    if (searchModal) { // Load users when the modal is opened
      fetchUsers();
    }
  }, [searchModal, token]);

  useEffect(() => {
    // Check if the search term is less than 3 characters
    if (searchTerm.length < 3) {
      setFilteredUsers([]);  // Set filtered users to empty if not enough characters
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      const filteredData = users.filter(item => {
        // Prepare combined name variants
        const fullName = item.name.toLowerCase() + " " + item.surname.toLowerCase();
        const fullNameReverse = item.surname.toLowerCase() + " " + item.name.toLowerCase();

        return (
          item.name.toLowerCase().includes(lowercasedFilter) ||
          item.surname.toLowerCase().includes(lowercasedFilter) ||
          item.email.toLowerCase().includes(lowercasedFilter) ||
          fullName.includes(lowercasedFilter) ||
          fullNameReverse.includes(lowercasedFilter)
        ) && item.teamID === -1; // Ensure user is not in any team
      });
      setFilteredUsers(filteredData);  // Update state with filtered data
    }
  }, [searchTerm, users]);  // React to changes in searchTerm and users

  const removeMember = async (memberId) => {
    if (window.confirm(t("teamRemoveUser"))) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/removeMember?id=${memberId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (tokenExpired(response.status)) { return; }

        if (response.ok) {
          toast.success(t("teamUserRemoved"));
          window.location.reload();
        } else {
          toast.error(t("teamUserRemoveFail"));
        }
      } catch (error) {
        console.error('Error removing the team member:', error);
        toast.error(t("teamUserRemoveError"));
      }
    }
  };

  // funkce pro opuštění týmu
  const leaveTeam = async () => {
    // Zobrazit potvrzovací dialog a uložit výsledek
    const confirmLeave = window.confirm(t("teamLeaveCheck"));
    if (confirmLeave) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/leave`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (tokenExpired(response.status)) { return; }

        if (response.ok) {
          console.log('Successfully left the team');
          // navigate('/admin/my-team');
          window.location.reload();
        } else {
          console.error('Failed to leave the team:', await response.text());
        }
      } catch (error) {
        console.error('Error leaving the team:', error);
      }
    } else {
      console.log('User decided not to leave the team');
    }
  };

  const handleRemoveTeam = async () => {
    if (window.confirm(t("teamRemoveCheck"))) {
      if (!token) {
        console.error('Authentication token is missing');
        return;
      }

      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/remove?name=${team.name}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (tokenExpired(response.status)) { return; }

        if (response.ok) {
          toast.success(t("teamRemoved"));
          setTeam(null); // Reset team state
        } else {
          toast.error(t("teamRemoveFail"));
        }
      } catch (error) {
        console.error('Error removing the team:', error);
      }
    }
  };

  const handleAddUser = async (userId) => {
    if (!token) {
      console.error('Authentication token is missing');
      return;
    }

    if (!window.confirm(t("inviteUser"))) {
      return; // If user cancels, exit the function
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/addMember?id=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (tokenExpired(response.status)) { return; }

      const result = await response.json();
      if (result.data === "success") {
        setSearchModal(false); // Zavřít modal po úspěšném odeslání
        setSearchTerm(''); // Vyčistit vyhledávání
        toast.success(t("inviteSent"));
      } else if (result.data === "failure, user already invited") {
        toast.warning(t("alreadyInvited"));
      } else {
        toast.error(result.data || t("somethingFailed"));
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(t("somethingFailed"));
    }
  };

  if (isLoading) {
    return <p>{t("loading")}</p>;
  }

  // Získání unikátních roků registrace
  const getUniqueYears = () => {
    if (!team?.registrationYears) return [];
    const uniqueYears = [...new Set(team.registrationYears.map(y => y.year))];
    return uniqueYears.sort((a, b) => b - a); // Seřadit sestupně
  };

  const isLeader = team?.leaderID === parseInt(userID, 10);

  return (
    <div className="content">
      {error || !team ? (
        // Stav kdy uživatel není v týmu
        <Row>
          <Col lg="8" md="10" className="mx-auto">
            <Card>
              <CardBody className="text-center py-5">
                <i className="tim-icons icon-molecule-40" style={{ fontSize: '4rem', opacity: 0.3, marginBottom: '20px' }} />
                <Alert color="info" className="mb-4">
                  {error}
                </Alert>
                <Button color="primary" size="lg" onClick={() => setCreateModal(true)}>
                  <i className="tim-icons icon-simple-add mr-2" />
                  {t("teamCreate")}
                </Button>
              </CardBody>
            </Card>
          </Col>
        </Row>
      ) : (
        // Zobrazení týmu
        <>
          <Row>
            <Col lg="8">
              {/* Hlavní karta týmu */}
              <Card>
                <CardHeader>
                  <Row className="align-items-center">
                    <Col>
                      <CardTitle tag="h2" className="mb-0" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="tim-icons icon-molecule-40" style={{ opacity: 0.7 }} />
                        {team.name}
                        {isLeader && (
                          <Button color="link" className="p-0 ml-2" onClick={() => setCreateModal(true)} title={t("rename")}>
                            <i className="fa-solid fa-pencil" style={{ fontSize: '0.8rem' }} />
                          </Button>
                        )}
                      </CardTitle>
                    </Col>
                  </Row>
                </CardHeader>
                <CardBody>
                  {/* Sekce členů */}
                  <h5 className="mb-3">
                    <i className="tim-icons icon-single-02 mr-2" />
                    {t("members")} ({team.memberNames.length})
                  </h5>
                  <Table responsive className="table-hover">
                    <thead className="text-primary">
                      <tr>
                        <th>{t("name")}</th>
                        <th>{t("surname")}</th>
                        <th>{t("role")}</th>
                        {isLeader && <th style={{ width: '60px' }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {team.memberNames.map(member => (
                        <tr key={member.id}>
                          <td>{member.name}</td>
                          <td>{member.surname}</td>
                          <td>
                            {member.id === team.leaderID ? (
                              <span className="badge badge-primary">
                                <i className="tim-icons icon-badge mr-1" />
                                {t("leader")}
                              </span>
                            ) : (
                              <span className="badge badge-secondary">{t("member") || "Člen"}</span>
                            )}
                          </td>
                          {isLeader && (
                            <td>
                              {member.id !== team.leaderID && (
                                <Button color="link" size="sm" className="text-danger p-0" onClick={() => removeMember(member.id)} title={t("remove")}>
                                  <i className="tim-icons icon-trash-simple" />
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </Table>

                  {/* Tlačítko pro přidání člena */}
                  {isLeader && (
                    <Button color="success" size="sm" className="mt-2" onClick={() => setSearchModal(true)}>
                      <i className="tim-icons icon-simple-add mr-2" />
                      {t("teamAddUser")}
                    </Button>
                  )}
                </CardBody>
                <CardFooter className="d-flex justify-content-between align-items-center" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <Button size="sm" color="warning" onClick={leaveTeam}>
                    <i className="tim-icons icon-button-power mr-2" />
                    {t("teamLeave")}
                  </Button>
                  {isLeader && (
                    <Button color="danger" size="sm" onClick={handleRemoveTeam}>
                      <i className="tim-icons icon-trash-simple mr-2" />
                      {t("teamRemove")}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </Col>

            <Col lg="4">
              {/* Info karta */}
              <Card>
                <CardHeader>
                  <CardTitle tag="h5" className="mb-0">
                    <i className="tim-icons icon-badge mr-2" />
                    {t("teamInfo") || "Informace o týmu"}
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="mb-3">
                    <small className="text-muted d-block">{t("teamLeader")}</small>
                    <strong>{leaderName}</strong>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted d-block">{t("regYears")}</small>
                    <strong>
                      {getUniqueYears().length > 0 
                        ? getUniqueYears().join(', ')
                        : <span className="text-muted">{t("noRegistrations") || "Žádné registrace"}</span>
                      }
                    </strong>
                  </div>
                  <div>
                    <small className="text-muted d-block">{t("membersCount") || "Počet členů"}</small>
                    <strong>{team.memberNames.length}</strong>
                  </div>
                </CardBody>
              </Card>

              {/* Registrace do soutěže - pouze pro vedoucího */}
              {isLeader && (
                <Card className="bg-gradient-primary">
                  <CardBody className="text-center">
                    <h5 className="text-white mb-3">
                      <i className="tim-icons icon-trophy mr-2" />
                      {t("registerHere")}
                    </h5>
                    <Button
                      color="default"
                      onClick={() => navigate('/admin/competition-registration')}
                    >
                      <i className="tim-icons icon-tap-02 mr-2" />
                      {t("compRegister")}
                    </Button>
                  </CardBody>
                </Card>
              )}
            </Col>
          </Row>
        </>
      )}

      {/* Modal pro vytvoření/přejmenování týmu */}
      <Modal isOpen={createModal} toggle={() => setCreateModal(!createModal)}>
        <ModalHeader toggle={() => setCreateModal(false)}>
          {team ? t("teamRename") : t("teamCreateNew")}
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label for="teamName">{t("teamName")}</Label>
            <Input
              style={{ color: 'black' }}
              type="text"
              name="teamName"
              id="teamName"
              placeholder={t("nameEg")}
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
            />
          </FormGroup>
          {creationError && <Alert color="danger" className="mb-0">{creationError}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={team ? handleRenameTeam : handleCreateTeam}>
            {team ? t("rename") : t("create")}
          </Button>
          <Button color="secondary" onClick={() => { setCreateModal(false); setCreationError(''); }}>
            {t("cancel")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal pro vyhledávání uživatelů */}
      <Modal isOpen={searchModal} toggle={() => setSearchModal(false)}>
        <ModalHeader toggle={() => setSearchModal(false)}>
          <i className="tim-icons icon-zoom-split mr-2" />
          {t("findUser")}
        </ModalHeader>
        <ModalBody>
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("enterMailName")}
            style={{ color: 'black' }}
            className="mb-3"
          />
          {searchTerm.length > 0 && searchTerm.length < 3 && (
            <small className="text-muted">{t("minChars") || "Zadejte alespoň 3 znaky"}</small>
          )}
          <ListGroup className="mt-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {filteredUsers.map((user) => (
              <ListGroupItem 
                key={user.id} 
                className="d-flex justify-content-between align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => handleAddUser(user.id)}
              >
                <div>
                  <strong>{user.name} {user.surname}</strong>
                  <br />
                  <small className="text-muted">{user.email}</small>
                </div>
                <Button color="success" size="sm">
                  <i className="tim-icons icon-send" />
                </Button>
              </ListGroupItem>
            ))}
            {searchTerm.length >= 3 && filteredUsers.length === 0 && (
              <ListGroupItem className="text-center text-muted">
                {t("noUsersFound") || "Žádní uživatelé nenalezeni"}
              </ListGroupItem>
            )}
          </ListGroup>
        </ModalBody>
      </Modal>
    </div>
  );
}

export default MyTeam;