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
import { t } from "translations/translate";

export function validateTitle(title) {
  const allowed = /^[A-Za-z0-9ČŠŽŘŤĎŇÁÉĚÍÓÚŮÝčšžřťďňáéěíóúůýßäöüÄÖÜàèìòùâêîôûãõñëïÿ\s'-.:,/?!+]+$/;
  if (allowed.test(title)) {
    if (title.length < 3) {
      return "too short"
    } else if (title.length > 15) {
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
      console.log('Uložení se podařilo:', data);
      alert(t("teamRenamed"));
      window.location.reload();
    } catch (error) {
      console.error('Update selhal:', error);
      alert(t("dataSaveFail"));
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
          alert(t("teamUserRemoved"));
          window.location.reload();
        } else {
          alert(t("teamUserRemoveFail"));
        }
      } catch (error) {
        console.error('Error removing the team member:', error);
        alert(t("teamUserRemoveError"));
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
          alert(t("teamRemoved"));
          setTeam(null); // Reset team state
        } else {
          alert(t("teamRemoveFail"));
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
        alert(t("inviteSent"));
      } else if (result.data === "failure, user already invited") {
        alert(t("alreadyInvited"));
      } else {
        alert(t("somethingFailed"));
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (isLoading) {
    return <p>{t("loading")}</p>;
  }

  return (
    <div className="content">
      <Row>
        <Col xs="12">
          {error || !team ? (
            <div>
              <Alert color='danger' >{error}</Alert>
              <Button color="primary" onClick={() => setCreateModal(true)}>{t("teamCreate")}</Button>
              <Modal isOpen={createModal} toggle={() => setCreateModal(!createModal)}>
                <ModalHeader toggle={() => setCreateModal(false)}>{t("teamCreateNew")}</ModalHeader>
                <ModalBody>
                  <FormGroup>
                    <Label for="teamName">{t("teamName")}</Label>
                    <Input style={{ color: 'black' }}
                      type="text"
                      name="teamName"
                      id="teamName"
                      placeholder={t("nameEg")}
                      value={newTeamName}
                      onChange={e => setNewTeamName(e.target.value)}
                    />
                  </FormGroup>
                  {creationError && <p className="text-danger">{creationError}</p>}
                </ModalBody>
                <ModalFooter>
                  <Button style={{ margin: '10px' }} color="primary" onClick={handleCreateTeam}>{t("create")}</Button>
                  <Button style={{ margin: '10px' }} color="secondary" onClick={() => setCreateModal(false)}>{t("cancel")}</Button>
                </ModalFooter>
              </Modal>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle tag="h2" style={{ display: 'inline' }}>{team.name}</CardTitle>
                {(team.leaderID === parseInt(userID, 10) &&
                  <Button className='m-0 pb-3' color="link" onClick={() => setCreateModal(true)}>
                    <i className="fa-solid fa-pencil"
                      style={{ cursor: 'pointer', fontSize: '0.9rem' }}
                      title={t("rename")}
                    />
                  </Button>
                )}
                <Modal isOpen={createModal} toggle={() => setCreateModal(!createModal)}>
                  <ModalHeader toggle={() => setCreateModal(false)}>{t("teamRename")}</ModalHeader>
                  <ModalBody>
                    <FormGroup>
                      <Label for="teamName">{t("teamName")}</Label>
                      <Input style={{ color: 'black' }}
                        type="text"
                        name="teamName"
                        id="teamName"
                        placeholder={t("nameEg")}
                        value={newTeamName}
                        onChange={e => setNewTeamName(e.target.value)}
                      />
                    </FormGroup>
                    {creationError && <p className="text-danger">{creationError}</p>}
                  </ModalBody>
                  <ModalFooter>
                    <Button style={{ margin: '10px' }} color="primary" onClick={handleRenameTeam}>{t("rename")}</Button>
                    <Button style={{ margin: '10px' }} color="secondary" onClick={() => setCreateModal(false)}>{t("cancel")}</Button>
                  </ModalFooter>
                </Modal>
              </CardHeader>
              <CardBody>
                <Table responsive>
                  <thead>
                    <tr>
                      {/* <th>{t("id")}</th> */}
                      <th>{t("name")}</th>
                      <th>{t("surname")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.memberNames.map(member => (
                      <tr key={member.id}>
                        {/* <td>{member.id}</td> */}
                        <td>{member.name}</td>
                        <td>{member.surname}</td>

                        {team.leaderID === parseInt(userID, 10) && member.id !== team.leaderID && (
                          <td>
                            <Button color="link" size="sm" onClick={() => removeMember(member.id)}>
                              <i className="tim-icons icon-trash-simple" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <p><strong>{t("teamLeader")}</strong> {leaderName}</p>
                <p><strong>{t("regYears")}</strong> {team.registrationYears.map(year => year.year).join(', ')}</p>
                {team.leaderID === parseInt(userID, 10) && (
                  <>
                    <Button className="text-right" color="success" size="sm" onClick={() => setSearchModal(true)}>{t("teamAddUser")}</Button>
                    <Modal isOpen={searchModal} toggle={() => setSearchModal(false)}>
                      <ModalHeader toggle={() => setSearchModal(false)}>{t("findUser")}</ModalHeader>
                      <ModalBody>
                        <Input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder={t("enterMailName")}
                          style={{ color: 'black' }}
                        />

                        <ListGroup>
                          {filteredUsers.map((user) => (
                            <ListGroupItem key={user.id} tag="button" style={{ cursor: "default" }} >
                              <Button color="link" onClick={() => handleAddUser(user.id)}>
                                {user.name} {user.surname} - {user.email}
                                <i className="tim-icons icon-send ml-2" />
                              </Button>
                            </ListGroupItem>
                          ))}
                        </ListGroup>
                      </ModalBody>
                    </Modal>
                  </>
                )}
              </CardBody>
              <CardFooter>
                <Button size="sm" color="warning" onClick={leaveTeam}>
                  {t("teamLeave")}
                </Button>
                {team.leaderID === parseInt(userID, 10) && (
                  <Button className="text-right" color="danger" size="sm" onClick={handleRemoveTeam}>{t("teamRemove")}</Button>
                )}
              </CardFooter>
            </Card>
          )}
        </Col>
      </Row>

      {team && team.leaderID === parseInt(userID, 10) && (
        <Row>
          <Col xs="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h5">{t("registerHere")}</CardTitle>
              </CardHeader>
              <CardBody>
                <Button
                  color="info"
                  size="lg"
                  onClick={() => navigate('/admin/competition-registration')}
                >
                  <i className="tim-icons icon-tap-02" /> {t("compRegister")} <i className="tim-icons icon-tap-02" />
                </Button>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}

export default MyTeam;