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
import TablePagination from "components/TablePagination";

function RobotProfile() {
  const [searchParams] = useSearchParams();
  const robotId = searchParams.get('id');
  const fromPage = searchParams.get('from');
  const savedSearch = searchParams.get('search');
  const navigate = useNavigate();

  // Handle navigation back with preserved search params
  const handleGoBack = () => {
    if (fromPage === 'management' && savedSearch) {
      navigate(`/admin/robot-management?search=${encodeURIComponent(savedSearch)}`);
    } else {
      navigate(-1);
    }
  };

  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  // Pagination for matches table
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const { token, tokenExpired } = useUser();
  const toast = useToast();

  // Helper function to get phase label
  const getPhaseLabel = (phase) => {
    switch (phase) {
      case 'GROUP_STAGE': return t('phaseGroupStage') || 'Skupinová fáze';
      case 'PRELIMINARY': return t('phasePreliminary') || 'Předkolo';
      case 'ROUND_OF_16': return t('phaseRoundOf16') || 'Osmifinále';
      case 'QUARTERFINAL': return t('phaseQuarterfinal') || 'Čtvrtfinále';
      case 'SEMIFINAL': return t('phaseSemifinal') || 'Semifinále';
      case 'THIRD_PLACE': return t('phaseThirdPlace') || 'O 3. místo';
      case 'FINAL': return t('phaseFinal') || 'Finále';
      default: return phase || '-';
    }
  };

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
      {/* Back button */}
      <Button
        color="link"
        size="sm"
        onClick={handleGoBack}
        className='mb-2 p-0'
        style={{ color: '#1d8cf8' }}
      >
        <i className="tim-icons icon-minimal-left mr-1" />
        {t("back")}
      </Button>

      {/* Warning for empty team */}
      {profile.teamMemberCount === 0 && (
        <Alert color="danger" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <i className="tim-icons icon-alert-circle-exc" style={{ fontSize: '20px' }} />
          <div>
            <strong>{t("warningEmptyTeam")}</strong>
            <span className="ml-2" style={{ opacity: 0.9 }}>{t("warningEmptyTeamDesc")}</span>
          </div>
        </Alert>
      )}

      {/* Hero Card - Robot main info */}
      <Card className="mb-3" style={{ background: 'linear-gradient(135deg, rgba(94,114,228,0.1) 0%, rgba(130,94,228,0.1) 100%)' }}>
        <CardBody style={{ padding: '20px' }}>
          <Row className="align-items-center">
            {/* Robot name and number */}
            <Col xs="12" md="6" lg="4" className="mb-3 mb-md-0">
              <div className="d-flex align-items-center">
                <div 
                  className="d-flex align-items-center justify-content-center mr-3"
                  style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #5e72e4 0%, #825ee4 100%)',
                    flexShrink: 0
                  }}
                >
                  <i className="tim-icons icon-settings" style={{ fontSize: '24px', color: '#fff' }} />
                </div>
                <div>
                  <h2 className="mb-0" style={{ fontSize: '1.4rem', fontWeight: 600 }}>{profile.robotName}</h2>
                  <div className="d-flex align-items-center mt-1">
                    <Badge color="warning" style={{ fontSize: '1rem', padding: '4px 10px', fontWeight: 'bold' }}>
                      {t("robotNum") || "Číslo"}: {profile.robotNumber}
                    </Badge>
                    <Badge color="primary" className="ml-2" style={{ fontSize: '11px' }}>
                      {profile.discipline}
                    </Badge>
                  </div>
                </div>
              </div>
            </Col>

            {/* Category and Team */}
            <Col xs="6" md="3" lg="4" className="mb-3 mb-md-0">
              <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center" style={{ gap: '12px' }}>
                <div>
                  <small className="text-muted d-block">{t("category")}</small>
                  <strong>
                    {profile.category === 'HIGH_AGE_CATEGORY' ? t("students") : 
                     profile.category === 'LOW_AGE_CATEGORY' ? t("pupils") : 
                     profile.category}
                  </strong>
                </div>
                <div className="d-none d-lg-block" style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.2)' }} />
                <div>
                  <small className="text-muted d-block">{t("team")}</small>
                  <strong>{profile.teamName}</strong>
                </div>
              </div>
            </Col>

            {/* Confirmation status and actions */}
            <Col xs="6" md="3" lg="4">
              <div className="d-flex flex-column flex-md-row align-items-start align-items-md-end justify-content-md-end" style={{ gap: '10px' }}>
                <div className="text-md-right">
                  <small className="text-muted d-block">{t("status")}</small>
                  <Badge 
                    color={profile.confirmed ? 'success' : 'warning'} 
                    style={{ fontSize: '12px', padding: '5px 12px' }}
                  >
                    {profile.confirmed ? t("confirmed") : t("notConfirmed")}
                  </Badge>
                </div>
                {canConfirm && (
                  <Button 
                    color={profile.confirmed ? "warning" : "success"}
                    size="sm"
                    onClick={() => handleConfirmRobot(!profile.confirmed)}
                    disabled={isConfirming}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <i className={`tim-icons ${profile.confirmed ? 'icon-simple-remove' : 'icon-check-2'} mr-1`} />
                    {profile.confirmed ? t("unconfirmRobot") : t("confirmRobot")}
                  </Button>
                )}
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Info Cards Row */}
      <Row>
        {/* Team & Leader Info */}
        <Col lg="4" md="6" className="mb-3">
          <Card className="h-100 mb-0">
            <CardBody style={{ padding: '16px' }}>
              <div className="d-flex align-items-center mb-3">
                <div 
                  className="d-flex align-items-center justify-content-center mr-2"
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '8px',
                    background: 'rgba(17,205,239,0.15)'
                  }}
                >
                  <i className="tim-icons icon-molecule-40" style={{ fontSize: '16px', color: '#11cdef' }} />
                </div>
                <h5 className="mb-0" style={{ fontSize: '0.95rem' }}>{t("teamInfo")}</h5>
              </div>
              
              <div className="mb-2">
                <small className="text-muted">{t("teamLeader")}</small>
                <div style={{ fontWeight: 500 }}>
                  {profile.leaderName ? `${profile.leaderName} ${profile.leaderSurname}` : t("leaderUnknown")}
                </div>
              </div>
              
              <div>
                <small className="text-muted">{t("teamMembers")}</small>
                <div style={{ fontWeight: 500 }}>{profile.teamMemberCount} {t("members").toLowerCase()}</div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Teacher Info */}
        <Col lg="4" md="6" className="mb-3">
          <Card className="h-100 mb-0">
            <CardBody style={{ padding: '16px' }}>
              <div className="d-flex align-items-center mb-3">
                <div 
                  className="d-flex align-items-center justify-content-center mr-2"
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '8px',
                    background: 'rgba(45,206,137,0.15)'
                  }}
                >
                  <i className="tim-icons icon-single-02" style={{ fontSize: '16px', color: '#2dce89' }} />
                </div>
                <h5 className="mb-0" style={{ fontSize: '0.95rem' }}>{t("teacherInfo")}</h5>
              </div>
              
              <div className="mb-2">
                <small className="text-muted">{t("name")}</small>
                <div style={{ fontWeight: 500 }}>
                  {profile.teacherName && profile.teacherSurname 
                    ? `${profile.teacherName} ${profile.teacherSurname}` 
                    : profile.teacherName || profile.teacherSurname || '-'}
                </div>
              </div>
              
              <div>
                <small className="text-muted">{t("contact")}</small>
                <div style={{ fontWeight: 500 }}>
                  {profile.teacherContact ? (
                    <a href={`mailto:${profile.teacherContact}`} style={{ color: '#1d8cf8' }}>
                      {profile.teacherContact}
                    </a>
                  ) : '-'}
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* School & RLL Info */}
        <Col lg="4" md="12" className="mb-3">
          <Card className="h-100 mb-0">
            <CardBody style={{ padding: '16px' }}>
              <div className="d-flex align-items-center mb-3">
                <div 
                  className="d-flex align-items-center justify-content-center mr-2"
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '8px',
                    background: 'rgba(251,99,64,0.15)'
                  }}
                >
                  <i className="tim-icons icon-bank" style={{ fontSize: '16px', color: '#fb6340' }} />
                </div>
                <h5 className="mb-0" style={{ fontSize: '0.95rem' }}>{t("schoolName")}</h5>
              </div>
              
              <div className="mb-2">
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }} title={profile.schoolName || ''}>
                  {profile.schoolName || (t("notProvided"))}
                </div>
              </div>
              
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <small className="text-muted">Robo Lego Liga</small>
                </div>
                <Badge color={profile.roboLeagueConsent ? "success" : "secondary"} style={{ fontSize: '11px' }}>
                  {profile.roboLeagueConsent ? (t("yes") || "Ano") : (t("no") || "Ne")}
                </Badge>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Team Members */}
      {profile.teamMembers && profile.teamMembers.length > 0 && (
        <Card className="mb-3">
          <CardHeader style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <i className="tim-icons icon-single-02 text-warning mr-2" />
                <h5 className="mb-0" style={{ fontSize: '1rem' }}>{t("teamMembers")}</h5>
              </div>
              <Badge color="warning" style={{ fontSize: '11px' }}>{profile.teamMembers.length}</Badge>
            </div>
          </CardHeader>
          <CardBody style={{ padding: '12px 20px' }}>
            <Row>
              {profile.teamMembers.map((member, index) => (
                <Col key={index} xs="12" sm="6" lg="4" className="mb-2">
                  <div 
                    className="d-flex align-items-center p-2" 
                    style={{ 
                      background: 'rgba(255,255,255,0.03)', 
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}
                  >
                    <div 
                      className="d-flex align-items-center justify-content-center mr-2"
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%',
                        background: member.id === profile.leaderId 
                          ? 'linear-gradient(135deg, #f5365c 0%, #f56036 100%)' 
                          : 'rgba(255,255,255,0.1)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#fff',
                        flexShrink: 0
                      }}
                    >
                      {member.id === profile.leaderId 
                        ? <i className="tim-icons icon-trophy" style={{ fontSize: '14px' }} />
                        : `${member.name?.[0] || ''}${member.surname?.[0] || ''}`
                      }
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                        {member.name} {member.surname}
                        {member.id === profile.leaderId && (
                          <Badge color="danger" className="ml-1" style={{ fontSize: '9px', padding: '2px 5px' }}>
                            {t("leader")}
                          </Badge>
                        )}
                      </div>
                      <a 
                        href={`mailto:${member.email}`} 
                        style={{ color: '#8898aa', fontSize: '0.8rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }}
                      >
                        {member.email}
                      </a>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </CardBody>
        </Card>
      )}

      {/* Robot Matches Card */}
      <Card>
        <CardHeader style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <i className="tim-icons icon-trophy text-warning mr-2" />
              <h5 className="mb-0" style={{ fontSize: '1rem' }}>{t("robotMatches")}</h5>
            </div>
            {matches && matches.length > 0 && (
              <Badge color="info" style={{ fontSize: '11px' }}>{matches.length}</Badge>
            )}
          </div>
        </CardHeader>
        <CardBody style={{ padding: matches && matches.length > 0 ? '0' : '20px' }}>
          {matches && matches.length > 0 ? (
            <>
            <Table responsive className="mb-0">
              <thead className="text-primary">
                <tr>
                  <th style={{ padding: '12px 20px' }}>ID</th>
                  <th>{t("playground")}</th>
                  <th>{t("opponent") || 'Soupeř'}</th>
                  <th>{t("score")}</th>
                  <th>{t("phase") || 'Fáze'}</th>
                  <th>{t("groupName") || 'Skupina'}</th>
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                    {matches
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((match, index) => {
                      // Determine if this robot is robotA or robotB
                      const isRobotA = match.robotAID?.toString() === robotId;
                      const myScore = isRobotA ? match.scoreA : match.scoreB;
                      const opponentScore = isRobotA ? match.scoreB : match.scoreA;
                      const opponentName = isRobotA ? match.robotBName : match.robotAName;
                      const opponentNumber = isRobotA ? match.robotBNumber : match.robotANumber;
                      const opponentID = isRobotA ? match.robotBID : match.robotAID;
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
                            {match.playgroundName} <Badge color="info">{match.playgroundNumber}</Badge>
                          </td>
                          <td>
                            {isTwoRobotMatch ? (
                              <div>
                                <a
                                  href="#"
                                  onClick={(e) => { e.preventDefault(); navigate(`/admin/robot-profile?id=${opponentID}`); }}
                                  style={{ color: '#5e72e4', cursor: 'pointer' }}
                                >
                                  <span style={{ backgroundColor: 'rgba(94, 114, 228, 0.15)', padding: '1px 5px', borderRadius: '4px', marginRight: '6px', fontWeight: 'bold' }}>{opponentNumber}</span>{opponentName}
                                </a>
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
                            {match.phaseName ? (
                              <Badge color="primary" style={{ fontSize: '11px' }}>
                                {getPhaseLabel(match.phaseName)}
                              </Badge>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            {match.group ? (
                              <Badge color="secondary">
                                {match.group}
                              </Badge>
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
                              {(match.state?.name || match.stateName) === 'DONE' ? t("doneStatus") || 'Hotové' :
                               (match.state?.name || match.stateName) === 'WAITING' ? t("waitingStatus") || 'Čekající' :
                               (match.state?.name || match.stateName) === 'REMATCH' ? t("rematchStatus") || 'Opakování' :
                               (match.state?.name || match.stateName)}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
                <TablePagination
                  currentPage={currentPage}
                  totalItems={matches.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={(page) => setCurrentPage(page)}
                  onItemsPerPageChange={(items) => {
                    setItemsPerPage(items);
                    setCurrentPage(1);
                  }}
                />
                </>
              ) : (
                <p className="text-muted">{t("noMatches")}</p>
              )}
            </CardBody>
          </Card>
    </div>
  );
}

export default RobotProfile;
