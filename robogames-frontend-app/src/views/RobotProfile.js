/**
 * RobotProfile component displays detailed information about a specific robot.
 * It fetches and displays robot name, number, discipline, category, team information,
 * team members, and teacher contact details in a nicely formatted view.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  Table,
  Button,
  Badge,
  Alert
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { useToast } from "contexts/ToastContext";
import { t } from "translations/translate";

function RobotProfile() {
  const [searchParams] = useSearchParams();
  const robotId = searchParams.get('id');
  const fromPage = searchParams.get('from');
  const savedSearch = searchParams.get('search');
  const navigate = useNavigate();

  // Handle navigation back with preserved search params
  const handleGoBack = () => {
    if (fromPage === 'confirmation' && savedSearch) {
      navigate(`/admin/robot-confirmation?search=${encodeURIComponent(savedSearch)}`);
    } else {
      navigate(-1);
    }
  };

  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const { token, tokenExpired } = useUser();
  const toast = useToast();

  // Check user roles
  const roles = localStorage.getItem('roles') || '';
  const canConfirm = roles.includes('ADMIN') || roles.includes('LEADER') || roles.includes('ASSISTANT');

  useEffect(() => {
    if (!robotId) {
      setError(t("robotIdMissing"));
      setIsLoading(false);
      return;
    }

    if (!token) {
      setError(t("mustLogin"));
      setIsLoading(false);
      return;
    }

    fetchRobotProfile();
    fetchRobotMatches();
  }, [robotId, token]);

  const fetchRobotProfile = async () => {
    if (!token) {
      setError(t("mustLogin"));
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}api/robot/profile?id=${robotId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      if (tokenExpired(response.status)) { return; }

      if (response.status === 404) {
        setError(t("robotProfileNotFound"));
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Robot profile API response:', data);
      if (response.ok && data.type === 'RESPONSE') {
        console.log('Setting profile, confirmed:', data.data.confirmed);
        setProfile(data.data);
      } else if (data.type === 'ERROR') {
        setError(data.data || t("robotProfileFetchFail"));
      } else {
        setError(data.message || t("unknownError"));
      }
    } catch (error) {
      console.error('Error fetching robot profile:', error);
      setError(t("serverCommFail"));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRobotMatches = async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}api/robot/matches?id=${robotId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      if (tokenExpired(response.status)) return;

      const data = await response.json();
      if (response.ok && data.type === 'RESPONSE') {
        setMatches(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching robot matches:', error);
    }
  };

  // Handle robot confirmation
  const handleConfirmRobot = async (confirmed) => {
    if (!robotId) return;
    
    setIsConfirming(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}api/robot/confirmRegistration?id=${robotId}&confirmed=${confirmed}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      if (tokenExpired(response.status)) return;

      const data = await response.json();
      if (response.ok && data.type !== 'ERROR') {
        toast.success(confirmed ? t("robotConfirmed") : t("robotUnconfirmed"));
        // Update profile state immediately to reflect the change
        setProfile(prev => ({ ...prev, confirmed: confirmed }));
      } else {
        toast.error(data.data || t("robotConfirmFail"));
      }
    } catch (error) {
      console.error('Error confirming robot:', error);
      toast.error(t("serverCommFail"));
    } finally {
      setIsConfirming(false);
    }
  };

  // const handleTeamClick = () => {
  //   if (profile?.teamId) {
  //     navigate(`/admin/team-detail?id=${profile.teamId}`);
  //   }
  // };

  if (isLoading) {
    return (
      <div className="content">
        <Row>
          <Col xs="12">
            <Card>
              <CardBody>
                <div className="text-center">
                  <p>{t("loading")}</p>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content">
        <Row>
          <Col xs="12">
            <Card>
              <CardBody>
                <div className="text-center">
                  <h4 className="text-danger">{t("err")}</h4>
                  <p>{error}</p>
                  <Button color="primary" onClick={handleGoBack}>
                    {t("back")}
                  </Button>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="content">
        <Row>
          <Col xs="12">
            <Card>
              <CardBody>
                <div className="text-center">
                  <p>{t("noData")}</p>
                  <Button color="primary" onClick={handleGoBack}>
                    {t("back")}
                  </Button>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div className="content">
      <Row>
        <Col md="12">
          <Button
            color="info"
            size="sm"
            onClick={handleGoBack}
            className='mb-3'
          >
            <i className="tim-icons icon-minimal-left mb-1" />
            {t("back")}
          </Button>
        </Col>
      </Row>

      {/* Warning for empty team */}
      {profile.teamMemberCount === 0 && (
        <Row>
          <Col xs="12">
            <Alert color="danger" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '15px',
              padding: '15px 20px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <i className="tim-icons icon-alert-circle-exc" style={{ fontSize: '24px' }} />
              <div>
                <strong>{t("warningEmptyTeam")}</strong>
                <p className="mb-0" style={{ opacity: 0.9 }}>{t("warningEmptyTeamDesc")}</p>
              </div>
            </Alert>
          </Col>
        </Row>
      )}

      {/* Robot Confirmation Card - only for admins/leaders/assistants */}
      {canConfirm && (
        <Row>
          <Col xs="12">
            <Card>
              <CardBody style={{ padding: '15px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontWeight: 500 }}>{t("robotConfirmStatus")}:</span>
                    <Badge 
                      color={profile.confirmed ? 'success' : 'warning'} 
                      style={{ fontSize: '14px', padding: '8px 15px' }}
                    >
                      {profile.confirmed ? t("confirmed") : t("notConfirmed")}
                    </Badge>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {!profile.confirmed ? (
                      <Button 
                        color="success" 
                        size="sm"
                        onClick={() => handleConfirmRobot(true)}
                        disabled={isConfirming}
                      >
                        <i className="tim-icons icon-check-2 mr-1" />
                        {t("confirmRobot")}
                      </Button>
                    ) : (
                      <Button 
                        color="warning" 
                        size="sm"
                        onClick={() => handleConfirmRobot(false)}
                        disabled={isConfirming}
                      >
                        <i className="tim-icons icon-simple-remove mr-1" />
                        {t("unconfirmRobot")}
                      </Button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      <Row>
        {/* Main Robot Information Card */}
        <Col lg="6" md="12">
          <Card className="card-chart">
            <CardHeader>
              <Row>
                <Col className="text-left">
                  <CardTitle tag="h2">
                    <i className="tim-icons icon-settings text-primary mr-2" />
                    {profile.robotName}
                  </CardTitle>
                  <h5 className="card-category">
                    {t("robotNum")}:
                    <Badge color="info" className='ml-2'>#{profile.robotNumber}</Badge>
                  </h5>
                </Col>
                {/*
                <Col sm="6">
                  <div className="text-right" style={{ paddingTop: '10px' }}>
                    <Badge color="success" pill style={{ fontSize: '14px', padding: '8px 15px' }}>
                      {profile.category}
                    </Badge>
                  </div>
                </Col>
                */}
              </Row>
            </CardHeader>
            <CardBody>
              <div style={{ padding: '3px 15px' }}>
                <Row style={{ marginBottom: '15px' }}>
                  <Col xs="4">
                    <strong>{t("discipline")}:</strong>
                  </Col>
                  <Col xs="8">
                    <Badge color="primary" style={{ fontSize: '13px' }}>
                      {profile.discipline}
                    </Badge>
                  </Col>
                </Row>

                <Row style={{ marginBottom: '15px' }}>
                  <Col xs="4">
                    <strong>{t("category")}:</strong>
                  </Col>
                  <Col xs="8">
                    {profile.category === 'HIGH_AGE_CATEGORY' ? t("students") : 
                     profile.category === 'LOW_AGE_CATEGORY' ? t("pupils") : 
                     profile.category}
                  </Col>
                </Row>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Team Information Card */}
        <Col lg="6" md="12">
          <Card className="card-chart">
            <CardHeader>
              <CardTitle tag="h3">
                <i className="tim-icons icon-molecule-40 text-info mr-2" />
                {t("teamInfo")}
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div style={{ padding: '15px 15px' }}>
                <Row style={{ marginBottom: '15px' }}>
                  <Col xs="4">
                    <strong>{t("team")}:</strong>
                  </Col>
                  <Col xs="8">
                    <span
                    // style={{ cursor: 'pointer', color: '#1d8cf8', textDecoration: 'underline' }}
                    // onClick={handleTeamClick}
                    >
                      {profile.teamName}
                    </span>
                  </Col>
                </Row>

                {/* <Row style={{ marginBottom: '15px' }}>
                  <Col xs="4">
                    <strong>{t("teamId")}:</strong>
                  </Col>
                  <Col xs="8">
                    #{profile.teamId}
                  </Col>
                </Row> */}

                <Row style={{ marginBottom: '15px' }}>
                <Col xs="4">
                  <strong>{t("teamLeader")}</strong>
                </Col>
                <Col xs="8">
                  {profile.leaderName ? `${profile.leaderName} ${profile.leaderSurname}` : t("leaderUnknown")}
                </Col> 
                </Row>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Team Members Card */}
        <Col lg="6" md="12">
          <Card>
            <CardHeader>
              <CardTitle tag="h3">
                <i className="tim-icons icon-single-02 text-warning mr-2" />
                {t("teamMembers")}
              </CardTitle>
            </CardHeader>
            <CardBody>
              {profile.teamMembers && profile.teamMembers.length > 0 ? (
                <Table responsive>
                  <thead className="text-primary">
                    <tr>
                      {/* <th>#</th> */}
                      <th>{t("name")}</th>
                      <th>{t("surname")}</th>
                      <th>E-mail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.teamMembers.map((member, index) => (
                      <tr key={index}>
                        {/* <td>{index + 1}</td> */}
                        <td>{member.name}</td>
                        <td>{member.surname}</td>
                        <td><a href={`mailto:${member.email}`} style={{ color: '#ef6000' }}>{member.email}</a></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted">{t("noMembers")}</p>
              )}
            </CardBody>
          </Card>
        </Col>

        {/* Teacher Information Card */}
        <Col lg="6" md="12">
          <Card>
            <CardHeader>
              <CardTitle tag="h3">
                <i className="tim-icons icon-badge text-success mr-2" />
                {t("teacherInfo")}
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div style={{ padding: '10px 0' }}>
                <Row style={{ marginBottom: '15px' }}>
                  <Col xs="4">
                    <strong>{t("name")}:</strong>
                  </Col>
                  <Col xs="8">
                    {profile.teacherName || '-'}
                  </Col>
                </Row>

                <Row style={{ marginBottom: '15px' }}>
                  <Col xs="4">
                    <strong>{t("surname")}:</strong>
                  </Col>
                  <Col xs="8">
                    {profile.teacherSurname || '-'}
                  </Col>
                </Row>

                <Row style={{ marginBottom: '15px' }}>
                  <Col xs="4">
                    <strong>{t("contact")}:</strong>
                  </Col>
                  <Col xs="8">
                    {profile.teacherContact ? (
                      <a href={`mailto:${profile.teacherContact}`} style={{ color: '#1d8cf8' }}>
                        {profile.teacherContact}
                      </a>
                    ) : '-'}
                  </Col>
                </Row>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Robot Matches Card */}
      <Row>
        <Col xs="12">
          <Card>
            <CardHeader>
              <CardTitle tag="h3">
                <i className="tim-icons icon-trophy text-warning mr-2" />
                {t("robotMatches")}
              </CardTitle>
            </CardHeader>
            <CardBody>
              {matches && matches.length > 0 ? (
                <Table responsive>
                  <thead className="text-primary">
                    <tr>
                      <th>ID</th>
                      <th>{t("playground")}</th>
                      <th>{t("opponent") || 'Soupeř'}</th>
                      <th>{t("score")}</th>
                      <th>{t("time") || 'Čas'}</th>
                      <th>{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((match, index) => {
                      // Determine if this robot is robotA or robotB
                      const isRobotA = match.robotAID?.toString() === robotId;
                      const myScore = isRobotA ? match.scoreA : match.scoreB;
                      const opponentScore = isRobotA ? match.scoreB : match.scoreA;
                      const opponentName = isRobotA ? match.robotBName : match.robotAName;
                      const opponentNumber = isRobotA ? match.robotBNumber : match.robotANumber;
                      const opponentTeam = isRobotA ? match.teamBName : match.teamAName;
                      const isTwoRobotMatch = match.robotAID && match.robotBID;
                      const isTimeScore = match.scoreTypeName === 'TIME';
                      
                      return (
                        <tr key={index}>
                          <td>
                            <Badge color="secondary" style={{ fontSize: '12px' }}>
                              #{match.id}
                            </Badge>
                          </td>
                          <td>
                            {match.playgroundName} <Badge color="info">#{match.playgroundNumber}</Badge>
                          </td>
                          <td>
                            {isTwoRobotMatch ? (
                              <div>
                                <span className="font-weight-bold">
                                  #{opponentNumber} {opponentName}
                                </span>
                                <br />
                                <small className="text-muted">{opponentTeam}</small>
                              </div>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            {isTwoRobotMatch ? (
                              <Badge color={myScore > opponentScore ? 'success' : myScore < opponentScore ? 'danger' : 'warning'} style={{ fontSize: '13px' }}>
                                {myScore !== null ? myScore : '-'} : {opponentScore !== null ? opponentScore : '-'}
                              </Badge>
                            ) : (
                              <Badge color="info" style={{ fontSize: '13px' }}>
                                {myScore !== null ? myScore : '-'}
                              </Badge>
                            )}
                          </td>
                          <td>
                            {isTimeScore && myScore !== null ? (
                              <span>{myScore.toFixed(2)}s</span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <Badge 
                              color={
                                (match.state?.name || match.stateName) === 'DONE' ? 'success' : 
                                (match.state?.name || match.stateName) === 'WAITING' ? 'warning' : 
                                (match.state?.name || match.stateName) === 'REMATCH' ? 'info' : 'secondary'
                              }
                            >
                              {(match.state?.name || match.stateName) === 'DONE' ? t("done") :
                               (match.state?.name || match.stateName) === 'WAITING' ? t("waiting") :
                               (match.state?.name || match.stateName) === 'REMATCH' ? t("rematch") :
                               (match.state?.name || match.stateName)}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted">{t("noMatches")}</p>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default RobotProfile;
