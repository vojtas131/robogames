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
  Badge,
  InputGroup,
  InputGroupText,
  Spinner
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { useToast } from "contexts/ToastContext";
import { useConfirm } from "components/ConfirmModal";
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
  const [noTeam, setNoTeam] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creationError, setCreationError] = useState('');
  const [searchModal, setSearchModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  
  // Stavy pro procházení týmů (když uživatel není v týmu)
  const [allTeams, setAllTeams] = useState([]);
  const [myJoinRequests, setMyJoinRequests] = useState([]);
  const [teamsSearchTerm, setTeamsSearchTerm] = useState('');
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(null);
  
  const userID = localStorage.getItem('UserID');

  const { token, tokenExpired } = useUser();
  const toast = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    if (!token) return;

    fetchMyTeam();
  }, [token]);

  // Načíst seznam týmů když uživatel není v týmu
  useEffect(() => {
    if (noTeam && token) {
      fetchAllTeams();
      fetchMyJoinRequests();
    }
  }, [noTeam, token]);

  const fetchAllTeams = async () => {
    setTeamsLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/allNames`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tokenExpired(response.status)) return;
      
      if (response.ok) {
        const data = await response.json();
        if (data.type !== 'ERROR') {
          setAllTeams(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setTeamsLoading(false);
    }
  };

  const fetchMyJoinRequests = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/myJoinRequests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tokenExpired(response.status)) return;
      
      if (response.ok) {
        const data = await response.json();
        if (data.type !== 'ERROR') {
          setMyJoinRequests(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching my join requests:', err);
    }
  };

  const sendJoinRequest = async (teamId) => {
    setSendingRequest(teamId);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/joinRequest?teamId=${teamId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tokenExpired(response.status)) return;
      
      const data = await response.json();
      if (data.type !== 'ERROR') {
        toast.success(t("joinRequestSent"));
        fetchMyJoinRequests();
      } else {
        toast.error(data.message || t("joinRequestFailed"));
      }
    } catch (err) {
      toast.error(t("joinRequestFailed"));
    } finally {
      setSendingRequest(null);
    }
  };

  const cancelJoinRequest = async (requestId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/cancelJoinRequest?id=${requestId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tokenExpired(response.status)) return;
      
      const data = await response.json();
      if (data.type !== 'ERROR') {
        toast.success(t("joinRequestCancelled"));
        fetchMyJoinRequests();
      } else {
        toast.error(data.message || t("operationFailed"));
      }
    } catch (err) {
      toast.error(t("operationFailed"));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTeams = allTeams.filter(team => 
    team.name.toLowerCase().includes(teamsSearchTerm.toLowerCase())
  );

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
        setNoTeam(false);
        const leader = data.data.memberNames.find(member => member.id === data.data.leaderID);
        setLeaderName(leader ? `${leader.name} ${leader.surname}` : t("leaderUnknown"));
      } else {
        setError(t("inNoTeam"));
        setNoTeam(true);
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

  const removeMember = async (memberId) => {
    const confirmed = await confirm({ message: t("teamRemoveUser") });
    if (confirmed) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/removeMember?id=${memberId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (tokenExpired(response.status)) { return; }

        const result = await response.json();
        if (response.ok && result.type !== 'ERROR' && result.data === 'success') {
          toast.success(t("teamUserRemoved"));
          window.location.reload();
        } else {
          toast.error(result.data || t("teamUserRemoveFail"));
        }
      } catch (error) {
        toast.error(t("teamUserRemoveError"));
      }
    }
  };

  // funkce pro opuštění týmu
  const leaveTeam = async () => {
    const confirmLeave = await confirm({ message: t("teamLeaveCheck") });
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

        const result = await response.json();
        if (response.ok && result.type !== 'ERROR' && result.data === 'success') {
          toast.success(t("teamLeft"));
          window.location.reload();
        } else {
          toast.error(result.data || t("teamLeaveFail"));
        }
      } catch (error) {
        toast.error(t("teamLeaveError"));
      }
    }
  };

  // funkce pro změnu vedoucího týmu
  const changeLeader = async (newLeaderId) => {
    const confirmed = await confirm({ message: t("confirmChangeLeader") || "Opravdu chcete předat vedení týmu tomuto členovi?" });
    if (confirmed) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/changeLeader?id=${newLeaderId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (tokenExpired(response.status)) { return; }

        const result = await response.json();
        if (response.ok && result.type !== 'ERROR' && result.data === 'success') {
          toast.success(t("leaderChanged") || "Vedoucí týmu byl úspěšně změněn");
          window.location.reload();
        } else {
          toast.error(result.data || t("leaderChangeFail") || "Nepodařilo se změnit vedoucího týmu");
        }
      } catch (error) {
        toast.error(t("leaderChangeError") || "Chyba při změně vedoucího týmu");
      }
    }
  };

  const handleRemoveTeam = async () => {
    const confirmed = await confirm({ message: t("teamRemoveCheck"), confirmColor: 'danger' });
    if (confirmed) {
      if (!token) {
        return;
      }

      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/remove`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (tokenExpired(response.status)) { return; }

        const data = await response.json();
        if (response.ok && data.type !== 'ERROR') {
          toast.success(t("teamRemoved"));
          setTeam(null); // Reset team state
          setError(t("inNoTeam"));
          setNoTeam(true);
        } else if (data.type === 'ERROR') {
          // Handle specific error messages
          if (data.data.includes('already started')) {
            toast.error(t("teamRemoveCompStarted"));
          } else if (data.data.includes('confirmed robot')) {
            toast.error(t("teamRemoveConfirmedRobot"));
          } else {
            toast.error(t("teamRemoveFail"));
          }
        } else {
          toast.error(t("teamRemoveFail"));
        }
      } catch (error) {
        toast.error(t("teamRemoveError"));
      }
    }
  };

  // Validace emailové adresy
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInviteByEmail = async () => {
    if (!token || !inviteEmail.trim()) {
      return;
    }

    if (!isValidEmail(inviteEmail.trim())) {
      toast.error(t("invalidEmail") || "Neplatná e-mailová adresa");
      return;
    }

    setInviteLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/addMemberByEmail?email=${encodeURIComponent(inviteEmail.trim())}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (tokenExpired(response.status)) { return; }

      const result = await response.json();
      if (result.data === "success") {
        toast.success(t("inviteSent"));
        setInviteEmail('');
        setSearchModal(false);
      } else if (result.data === "failure, user already invited") {
        toast.warning(t("alreadyInvited"));
      } else if (result.data === "failure, user not found") {
        toast.error(t("userNotFound"));
      } else if (result.data === "failure, team is full") {
        toast.error(t("teamFull") || "Tým je plný");
      } else {
        toast.error(result.data || t("somethingFailed"));
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(t("somethingFailed"));
    } finally {
      setInviteLoading(false);
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

  // Styly pro responsivní design
  const styles = {
    statCard: {
      background: 'var(--card-bg, rgba(30,30,50,0.5))',
      border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
      borderRadius: '12px',
      padding: '20px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center'
    },
    statValue: {
      fontSize: '2rem',
      fontWeight: 'bold',
      background: 'linear-gradient(135deg, #ef6000 0%, #ff8533 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '5px'
    },
    statLabel: {
      fontSize: '0.85rem',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      opacity: 0.7
    },
    memberCard: {
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px',
      padding: '15px',
      marginBottom: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '10px'
    },
    yearCard: {
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      overflow: 'hidden'
    }
  };

  return (
    <div className="content">
      {error || !team ? (
        // Stav kdy uživatel není v týmu
        <>
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

          {/* Moje odeslané žádosti o vstup */}
          {myJoinRequests.length > 0 && (
            <Row className="mt-4">
              <Col lg="8" md="10" className="mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle tag="h4">
                      <i className="tim-icons icon-send mr-2" />
                      {t("myJoinRequests")}
                    </CardTitle>
                  </CardHeader>
                  <CardBody>
                    <Table responsive className="table-hover">
                      <thead className="text-primary">
                        <tr>
                          <th>{t("teamName")}</th>
                          <th>{t("sentAt")}</th>
                          <th style={{ width: '100px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {myJoinRequests.map(request => (
                          <tr key={request.id}>
                            <td>{request.teamName}</td>
                            <td>{formatDate(request.createdAt)}</td>
                            <td>
                              <Button 
                                color="danger" 
                                size="sm" 
                                onClick={() => cancelJoinRequest(request.id)}
                              >
                                {t("cancel")}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          )}

          {/* Procházení existujících týmů */}
          <Row className="mt-4">
            <Col lg="8" md="10" className="mx-auto">
              <Card>
                <CardHeader>
                  <Row className="align-items-center">
                    <Col>
                      <CardTitle tag="h4">
                        <i className="tim-icons icon-planet mr-2" />
                        {t("browseTeams")}
                      </CardTitle>
                    </Col>
                    <Col md="5">
                      <InputGroup>
                        <InputGroupText>
                          <i className="tim-icons icon-zoom-split" />
                        </InputGroupText>
                        <Input
                          type="text"
                          placeholder={t("searchTeams")}
                          value={teamsSearchTerm}
                          onChange={(e) => setTeamsSearchTerm(e.target.value)}
                        />
                      </InputGroup>
                    </Col>
                  </Row>
                </CardHeader>
                <CardBody>
                  {teamsLoading ? (
                    <div className="text-center py-4">
                      <Spinner color="primary" />
                    </div>
                  ) : filteredTeams.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      {teamsSearchTerm ? t("noTeamsFound") : t("noTeamsAvailable")}
                    </div>
                  ) : (
                    <Table responsive className="table-hover">
                      <thead className="text-primary">
                        <tr>
                          <th>{t("teamName")}</th>
                          <th>{t("memberCount")}</th>
                          <th style={{ width: '150px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTeams.map(t_item => {
                          const pendingRequest = myJoinRequests.find(r => r.teamId === t_item.id);
                          return (
                            <tr key={t_item.id}>
                              <td>{t_item.name}</td>
                              <td>
                                <Badge color="info" pill>
                                  {t_item.memberCount} {t_item.memberCount === 1 ? t("memberSingular") : t("members")}
                                </Badge>
                              </td>
                              <td>
                                {pendingRequest ? (
                                  <Badge color="warning">{t("requestPending")}</Badge>
                                ) : (
                                  <Button
                                    color="success"
                                    size="sm"
                                    onClick={() => sendJoinRequest(t_item.id)}
                                    disabled={sendingRequest === t_item.id}
                                  >
                                    {sendingRequest === t_item.id ? (
                                      <Spinner size="sm" />
                                    ) : (
                                      <>
                                        <i className="tim-icons icon-send mr-1" />
                                        {t("sendRequest")}
                                      </>
                                    )}
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>
        </>
      ) : (
        // Zobrazení týmu - nový přehledný design
        <>
          {/* Header s názvem týmu a akcemi */}
          <Card style={{ marginBottom: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardBody style={{ padding: '25px' }}>
              <Row className="align-items-center">
                <Col xs="12" md="8" className="mb-3 mb-md-0">
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #ef6000 0%, #ff8533 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <i className="tim-icons icon-molecule-40" style={{ fontSize: '1.8rem', color: 'white' }} />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {team.name}
                        {isLeader && (
                          <Button 
                            color="link" 
                            className="p-0" 
                            onClick={() => { setNewTeamName(team.name); setCreationError(''); setCreateModal(true); }} 
                            title={t("rename")}
                            style={{ color: 'rgba(255,255,255,0.5)' }}
                          >
                            <i className="tim-icons icon-pencil" style={{ fontSize: '0.9rem' }} />
                          </Button>
                        )}
                      </h2>
                      <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                        {t("teamLeader")}: <strong style={{ color: '#ef6000' }}>{leaderName}</strong>
                      </p>
                    </div>
                  </div>
                </Col>
                <Col xs="12" md="4" className="text-md-right">
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <Button color="warning" size="sm" onClick={leaveTeam}>
                      <i className="tim-icons icon-button-power mr-1" />
                      <span className="d-none d-sm-inline">{t("teamLeave")}</span>
                      <span className="d-sm-none">{t("leave") || "Opustit"}</span>
                    </Button>
                    {isLeader && (
                      <Button color="danger" size="sm" onClick={handleRemoveTeam}>
                        <i className="tim-icons icon-trash-simple mr-1" />
                        <span className="d-none d-sm-inline">{t("teamRemove")}</span>
                        <span className="d-sm-none">{t("delete") || "Smazat"}</span>
                      </Button>
                    )}
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>

          {/* Statistiky a rychlé akce */}
          <Row className="mb-4">
            <Col xs="6" md="3" className="mb-3 mb-md-0">
              <Card className="h-100 mb-0">
                <CardBody className="d-flex flex-column align-items-center justify-content-center text-center" style={{ padding: '20px' }}>
                  <div style={styles.statValue}>{team.memberNames.length}</div>
                  <div style={styles.statLabel}>{t("members")}</div>
                </CardBody>
              </Card>
            </Col>
            <Col xs="6" md="3" className="mb-3 mb-md-0">
              <Card className="h-100 mb-0">
                <CardBody className="d-flex flex-column align-items-center justify-content-center text-center" style={{ padding: '20px' }}>
                  <div style={styles.statValue}>
                    {team.registrationYears ? [...new Set(team.registrationYears.map(r => r.year))].length : 0}
                  </div>
                  <div style={styles.statLabel}>{t("registrations")}</div>
                </CardBody>
              </Card>
            </Col>
            <Col xs="6" md="3" className="mb-3 mb-md-0">
              <Card className="h-100 mb-0">
                <CardBody className="d-flex flex-column align-items-center justify-content-center text-center" style={{ padding: '20px' }}>
                  <div style={styles.statValue}>
                    {team.registrationYears ? team.registrationYears.reduce((sum, r) => sum + (r.robotCount || 0), 0) : 0}
                  </div>
                  <div style={styles.statLabel}>{t("robots")}</div>
                </CardBody>
              </Card>
            </Col>
            <Col xs="6" md="3">
              {isLeader ? (
                <Card 
                  className="h-100 mb-0" 
                  style={{ cursor: 'pointer', border: '1px solid rgba(239,96,0,0.3)', transition: 'all 0.3s ease' }}
                  onClick={() => navigate('/admin/competition-registration')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(239,96,0,0.3)';
                    e.currentTarget.style.borderColor = 'rgba(239,96,0,0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = 'rgba(239,96,0,0.3)';
                  }}
                >
                  <CardBody className="d-flex flex-column align-items-center justify-content-center text-center" style={{ padding: '20px' }}>
                    <i className="tim-icons icon-trophy" style={{ fontSize: '1.8rem', color: '#ef6000', marginBottom: '10px' }} />
                    <div style={{ ...styles.statLabel, color: '#ef6000' }}>{t("compRegister")}</div>
                  </CardBody>
                </Card>
              ) : (
                <Card className="h-100 mb-0">
                  <CardBody className="d-flex flex-column align-items-center justify-content-center text-center" style={{ padding: '20px' }}>
                    <i className="tim-icons icon-single-02" style={{ fontSize: '1.8rem', opacity: 0.3, marginBottom: '10px' }} />
                    <div style={styles.statLabel}>{t("member")}</div>
                  </CardBody>
                </Card>
              )}
            </Col>
          </Row>

          <Row>
            {/* Levý sloupec - Členové */}
            <Col lg="7" className="mb-4 mb-lg-0">
              <Card className="h-100">
                <CardHeader style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <CardTitle tag="h4" className="mb-0">
                      <i className="tim-icons icon-single-02 mr-2" style={{ color: '#ef6000' }} />
                      {t("teamMembers")}
                    </CardTitle>
                    {isLeader && (
                      <Button color="success" size="sm" onClick={() => setSearchModal(true)}>
                        <i className="tim-icons icon-simple-add mr-1" />
                        {t("teamAddUser")}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardBody style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                  {/* Desktop tabulka */}
                  <div className="d-none d-md-flex" style={{ flex: 1 }}>
                    <Table responsive className="table-hover" style={{ marginBottom: 0 }}>
                      <thead className="text-primary">
                        <tr>
                          <th>{t("name")}</th>
                          <th>E-mail</th>
                          <th>{t("role")}</th>
                          {isLeader && <th style={{ width: '100px', textAlign: 'center' }}>{t("action")}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {[...team.memberNames]
                          .sort((a, b) => {
                            if (a.id === team.leaderID) return -1;
                            if (b.id === team.leaderID) return 1;
                            return 0;
                          })
                          .map(member => (
                          <tr key={member.id}>
                            <td>
                              <strong>{member.name} {member.surname}</strong>
                            </td>
                            <td>
                              <a href={`mailto:${member.email}`} style={{ color: '#ef6000' }}>{member.email}</a>
                            </td>
                            <td>
                              {member.id === team.leaderID ? (
                                <Badge color="warning" style={{ fontSize: '0.75rem' }}>
                                  <i className="tim-icons icon-badge mr-1" />
                                  {t("leader")}
                                </Badge>
                              ) : (
                                <Badge color="secondary" style={{ fontSize: '0.75rem' }}>{t("member") || "Člen"}</Badge>
                              )}
                            </td>
                            {isLeader && (
                              <td style={{ textAlign: 'center' }}>
                                {member.id !== team.leaderID && (
                                  <>
                                    <Button 
                                      color="info" 
                                      size="sm" 
                                      className="mr-1"
                                      onClick={() => changeLeader(member.id)} 
                                      title={t("makeLeader") || "Předat vedení"}
                                    >
                                      <i className="tim-icons icon-badge" />
                                    </Button>
                                    <Button 
                                      color="danger" 
                                      size="sm"
                                      onClick={() => removeMember(member.id)} 
                                      title={t("remove")}
                                    >
                                      <i className="tim-icons icon-trash-simple" />
                                    </Button>
                                  </>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {/* Mobilní karty */}
                  <div className="d-md-none">
                    {[...team.memberNames]
                      .sort((a, b) => {
                        if (a.id === team.leaderID) return -1;
                        if (b.id === team.leaderID) return 1;
                        return 0;
                      })
                      .map(member => (
                      <div key={member.id} style={styles.memberCard}>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                            <strong>{member.name} {member.surname}</strong>
                            {member.id === team.leaderID && (
                              <Badge color="warning" style={{ fontSize: '0.65rem' }}>
                                <i className="tim-icons icon-badge" />
                              </Badge>
                            )}
                          </div>
                          <a href={`mailto:${member.email}`} style={{ color: '#ef6000', fontSize: '0.85rem' }}>
                            {member.email}
                          </a>
                        </div>
                        {isLeader && member.id !== team.leaderID && (
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <Button 
                              color="info" 
                              size="sm"
                              onClick={() => changeLeader(member.id)} 
                              title={t("makeLeader")}
                            >
                              <i className="tim-icons icon-badge" />
                            </Button>
                            <Button 
                              color="danger" 
                              size="sm"
                              onClick={() => removeMember(member.id)} 
                              title={t("remove")}
                            >
                              <i className="tim-icons icon-trash-simple" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </Col>

            {/* Pravý sloupec - Oprávnění */}
            <Col lg="5">
              <Card className="h-100">
                <CardHeader style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px' }}>
                  <CardTitle tag="h4" className="mb-0">
                    <i className="tim-icons icon-lock-circle mr-2" style={{ color: '#5e72e4' }} />
                    {t("teamPermissions") || "Oprávnění"}
                  </CardTitle>
                </CardHeader>
                <CardBody style={{ padding: '20px' }}>
                  <div style={{ 
                    padding: '15px', 
                    background: 'rgba(239,96,0,0.08)', 
                    borderRadius: '10px',
                    border: '1px solid rgba(239,96,0,0.2)',
                    marginBottom: '15px'
                  }}>
                    <h6 style={{ color: '#ef6000', marginBottom: '10px', fontSize: '0.9rem' }}>
                      <i className="tim-icons icon-badge mr-2" />
                      {t("leaderPermissions") || "Vedoucí týmu"}
                    </h6>
                    <ul style={{ paddingLeft: '20px', marginBottom: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                      <li>{t("leaderPerm1") || "Registrovat/odregistrovat ze soutěže"}</li>
                      <li>{t("leaderPerm2") || "Spravovat roboty"}</li>
                      <li>{t("leaderPerm3") || "Správa týmu a členů"}</li>
                      <li>{t("leaderPerm4") || "Upravovat vedoucího učitele"}</li>
                    </ul>
                  </div>
                  <div style={{ 
                    padding: '15px', 
                    background: 'rgba(94,114,228,0.08)', 
                    borderRadius: '10px',
                    border: '1px solid rgba(94,114,228,0.2)'
                  }}>
                    <h6 style={{ color: '#5e72e4', marginBottom: '10px', fontSize: '0.9rem' }}>
                      <i className="tim-icons icon-single-02 mr-2" />
                      {t("memberPermissions") || "Člen týmu"}
                    </h6>
                    <ul style={{ paddingLeft: '20px', marginBottom: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                      <li>{t("memberPerm1") || "Spravovat roboty"}</li>
                    </ul>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* Sekce robotů */}
          {team.registrationYears && team.registrationYears.length > 0 && (
            <Card className="mt-4" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardHeader style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px' }}>
                <CardTitle tag="h4" className="mb-0">
                  <i className="tim-icons icon-spaceship mr-2" style={{ color: '#ef6000' }} />
                  {t("manageRobots")}
                </CardTitle>
                <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.85rem' }}>{t("manageRobotsDesc")}</p>
              </CardHeader>
              <CardBody style={{ padding: '20px' }}>
                <Row>
                  {[...new Map(team.registrationYears.map(r => [r.year, r])).values()]
                    .sort((a, b) => b.year - a.year)
                    .map(reg => (
                      <Col lg="3" md="4" sm="6" key={reg.id} className="mb-3">
                        <Card 
                          className="mb-0" 
                          style={styles.yearCard}
                          onClick={() => navigate(`/admin/robot-registration?year=${reg.year}`)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = '0 10px 30px rgba(239,96,0,0.2)';
                            e.currentTarget.style.borderColor = 'rgba(239,96,0,0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                          }}
                        >
                          <CardBody className="text-center" style={{ padding: '25px 15px' }}>
                            <div style={{ 
                              fontSize: '2rem', 
                              fontWeight: 'bold',
                              background: 'linear-gradient(135deg, #ef6000 0%, #ff8533 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              marginBottom: '8px'
                            }}>
                              {reg.year}
                            </div>
                            <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>
                              <i className="tim-icons icon-spaceship mr-1" style={{ fontSize: '0.8rem' }} />
                              {reg.robotCount} {reg.robotCount === 1 ? t("robot") : t("robots")}
                            </div>
                          </CardBody>
                        </Card>
                      </Col>
                    ))
                  }
                </Row>
              </CardBody>
            </Card>
          )}
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

      {/* Modal pro pozvání uživatele podle emailu */}
      <Modal isOpen={searchModal} toggle={() => { setSearchModal(false); setInviteEmail(''); }}>
        <ModalHeader toggle={() => { setSearchModal(false); setInviteEmail(''); }}>
          <i className="tim-icons icon-send mr-2" />
          {t("inviteByEmail") || "Pozvat uživatele podle e-mailu"}
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label for="inviteEmail">E-mail</Label>
            <Input
              type="email"
              id="inviteEmail"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={t("enterEmail") || "Zadejte e-mail uživatele"}
              style={{ color: 'black' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inviteEmail.trim()) {
                  handleInviteByEmail();
                }
              }}
            />
          </FormGroup>
          <small className="text-muted">
            {t("inviteEmailDesc") || "Uživatel musí být registrován v systému. Pokud je již členem jiného týmu, po přijetí pozvánky tento tým automaticky opustí."}
          </small>
        </ModalBody>
        <ModalFooter>
          <Button color="success" onClick={handleInviteByEmail} disabled={!inviteEmail.trim() || !isValidEmail(inviteEmail.trim()) || inviteLoading}>
            {inviteLoading ? (
              <><i className="fa fa-spinner fa-spin mr-2" />{t("sending") || "Odesílání..."}</>
            ) : (
              <><i className="tim-icons icon-send mr-2" />{t("sendInvite") || "Odeslat pozvánku"}</>
            )}
          </Button>
          <Button color="secondary" onClick={() => { setSearchModal(false); setInviteEmail(''); }}>
            {t("cancel")}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default MyTeam;