/**
* Renders the competition registration page, allowing users to view available competitions, register for them, and manage their robot registrations.
* 
* The component fetches the list of competitions and the user's registrations from the API, and displays them in a card-based layout.
* Users can register for a competition, unregister from a competition, and manage their robot registrations for a competition.
* 
* The component uses several helper functions to format the date and time of the competitions, and to handle the registration and unregistration processes.
*/
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Button,
  Row,
  Col,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormGroup,
  FormFeedback,
  Label,
  Input,
  Alert,
  Badge,
} from 'reactstrap';
import { useUser, validateName, validateEmail } from "contexts/UserContext";
import { useToast } from "contexts/ToastContext";
import { useConfirm } from "components/ConfirmModal";
import { t } from "translations/translate";
import SchoolSearchSelect from "components/SchoolSearchSelect/SchoolSearchSelect";

function CompetitionRegistration() {
  const [competitions, setCompetitions] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [registrationModal, setRegistrationModal] = useState(false);
  const [editTeacherModal, setEditTeacherModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);
  const [teacherName, setTeacherName] = useState('');
  const [teacherSurname, setTeacherSurname] = useState('');
  const [teacherContact, setTeacherContact] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [roboLeagueConsent, setRoboLeagueConsent] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const [needsTeacherInfo, setNeedsTeacherInfo] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLeader, setIsLeader] = useState(false);
  const navigate = useNavigate();
  const { token, tokenExpired } = useUser();
  const toast = useToast();
  const { confirm } = useConfirm();
  const userID = localStorage.getItem('UserID');

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(date);
  };

  const formatTime = (timeString) => {
    return timeString.substr(0, 5);
  };

  // Accept contact as either email or phone number
  const validateContact = (contact) => {
    if (!contact) return false;
    // try email first
    const emailCheck = validateEmail(contact);
    if (emailCheck) return emailCheck;

    // phone: allow digits and common formatting characters
    const phoneAllowed = /^[0-9+\s\-()]+$/;
    const digits = contact.replace(/\D/g, '');
    if (!phoneAllowed.test(contact) || digits.length === 0) return false;

    if (digits.length < process.env.REACT_APP_MIN_CONTACT_LENGTH) return "too short";
    if (digits.length > process.env.REACT_APP_MAX_CONTACT_LENGTH) return "too long";

    return true;
  };

  const handleManageRobots = (year) => {
    // navigate to the robot registration page with the competition year as a query parameter
    navigate(`/admin/robot-registration?year=${year}`);
  };

  // Unified onChange handler for teacher fields with validation
  const handleTeacherChange = (e) => {
    const { name, value } = e.target;
    let newErrors = { ...errors };

    const setField = (fieldName, setter, validator, messages) => {
      setter(value);
      const check = validator(value.trim());
      if (!check) newErrors[fieldName] = messages.invalid;
      else if (check === "too short") newErrors[fieldName] = messages.short;
      else if (check === "too long") newErrors[fieldName] = messages.long;
      else delete newErrors[fieldName];
    };

    if (name === 'teacherName' || name === 'editTeacherName') {
      setField('teacherName', setTeacherName, validateName, { invalid: t("invalidName"), short: t("shortName"), long: t("longName") });
    } else if (name === 'teacherSurname' || name === 'editTeacherSurname') {
      setField('teacherSurname', setTeacherSurname, validateName, { invalid: t("invalidSurname"), short: t("shortSurname"), long: t("longSurname") });
    } else if (name === 'teacherContact' || name === 'editTeacherContact') {
      setField('teacherContact', setTeacherContact, validateContact, { invalid: t("invalidContact"), short: t("shortContact"), long: t("longContact") });
    }

    setErrors(newErrors);
  };

  const unregisterTeam = async (year) => {
    const confirmUnregistration = await confirm({ message: t("unreg"), confirmColor: 'danger' });
    if (!confirmUnregistration) {
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/teamRegistration/unregister?year=${year}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (tokenExpired(response.status)) { return; }

      const data = await response.json();
      if (response.ok) {
        if (data.type === 'ERROR') {
          if (data.data === 'failure, team have a robot that is already confirmed') {
            toast.error(t("unregImpossible"));
          } else {
            toast.error(t("dataError", { data: data.data }));
          }
        } else {
          window.location.reload();
        }
      } else {
        console.error('Failed to unregister team:', data);
        toast.error(t("unregFail", { message: data.message || t("unknownError") }));
      }
    } catch (error) {
      console.error('Error unregistering team:', error);
      toast.error(t("unregError"));
    }
  };

  const registerTeam = async (year) => {
    setSelectedYear(year);
    setTeacherName('');
    setTeacherSurname('');
    setTeacherContact('');
    setSchoolName('');
    setRoboLeagueConsent(false);
    setRegistrationError('');
    setErrors({});
    setNeedsTeacherInfo(true); // Assume we need teacher info by default
    setRegistrationModal(true);
  };

  const handleRegistrationSubmit = async () => {
    // Validation
    if (needsTeacherInfo) {
      let newErrors = {};
      const nameCheck = validateName(teacherName.trim());
      if (!nameCheck) {
        newErrors.teacherName = t("invalidName");
      } else if (nameCheck === "too short") {
        newErrors.teacherName = t("shortName");
      } else if (nameCheck === "too long") {
        newErrors.teacherName = t("longName");
      }

      const surnameCheck = validateName(teacherSurname.trim());
      if (!surnameCheck) {
        newErrors.teacherSurname = t("invalidSurname");
      } else if (surnameCheck === "too short") {
        newErrors.teacherSurname = t("shortSurname");
      } else if (surnameCheck === "too long") {
        newErrors.teacherSurname = t("longSurname");
      }

      const contactCheck = validateContact(teacherContact.trim());
      if (!contactCheck) {
        newErrors.teacherContact = t("invalidContact");
      } else if (contactCheck === "too short") {
        newErrors.teacherContact = t("shortContact");
      } else if (contactCheck === "too long") {
        newErrors.teacherContact = t("longContact");
      }

      // Validate school name if consent is checked
      if (roboLeagueConsent && (!schoolName || schoolName.trim().length === 0)) {
        newErrors.schoolName = t("schoolRequiredForConsent");
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      } else {
        setErrors({});
      }
    }

    const requestBody = {
      year: selectedYear,
      teacherName: teacherName.trim(),
      teacherSurname: teacherSurname.trim(),
      teacherContact: teacherContact.trim(),
      schoolName: schoolName.trim() || null,
      roboLeagueConsent: roboLeagueConsent
    };

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/teamRegistration/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      if (tokenExpired(response.status)) { return; }

      const data = await response.json();
      if (response.ok && data.type !== 'ERROR') {
        toast.success(t("regSuccess"));
        setRegistrationModal(false);
        window.location.reload();
      } else if(data.data === 'failure, registration for this competition year is closed'){
        setRegistrationError(t("regClosed"));
      } else {
        setRegistrationError(data.data || t("regFail"));
      }
    } catch (error) {
      console.error('Error registering team:', error);
      setRegistrationError(t("regTeamError"));
    }
  };


  const handleEditTeacherInfo = async (year) => {
    setSelectedYear(year);
    setRegistrationError('');

    // Fetch current teacher info
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/teamRegistration/teacherInfo?year=${year}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (tokenExpired(response.status)) { return; }

      const data = await response.json();
      if (response.ok && data.type !== 'ERROR') {
        setTeacherName(data.data.teacherName || '');
        setTeacherSurname(data.data.teacherSurname || '');
        setTeacherContact(data.data.teacherContact || '');
        setSchoolName(data.data.schoolName || '');
        setRoboLeagueConsent(data.data.roboLeagueConsent || false);
        setErrors({});
        setEditTeacherModal(true);
      } else {
        toast.error(t("dataFetchFail"));
      }
    } catch (error) {
      console.error('Error fetching teacher info:', error);
      toast.error(t("dataFetchError"));
    }
  };

  const handleUpdateTeacherInfo = async () => {
    // Validation
    let newErrors = {};
    const nameCheck = validateName(teacherName.trim());
    if (!nameCheck) {
      newErrors.teacherName = t("invalidName");
    } else if (nameCheck === "too short") {
      newErrors.teacherName = t("shortName");
    } else if (nameCheck === "too long") {
      newErrors.teacherName = t("longName");
    }

    const surnameCheck = validateName(teacherSurname.trim());
    if (!surnameCheck) {
      newErrors.teacherSurname = t("invalidSurname");
    } else if (surnameCheck === "too short") {
      newErrors.teacherSurname = t("shortSurname");
    } else if (surnameCheck === "too long") {
      newErrors.teacherSurname = t("longSurname");
    }

    const contactCheck = validateContact(teacherContact.trim());
    if (!contactCheck) {
      newErrors.teacherContact = t("invalidContact");
    } else if (contactCheck === "too short") {
      newErrors.teacherContact = t("shortContact");
    } else if (contactCheck === "too long") {
      newErrors.teacherContact = t("longContact");
    }

    // Validate school name if consent is checked
    if (roboLeagueConsent && (!schoolName || schoolName.trim().length === 0)) {
      newErrors.schoolName = t("schoolRequiredForConsent");
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    } else {
      setErrors({});
      setRegistrationError('');
    }

    const requestBody = {
      teacherName: teacherName.trim(),
      teacherSurname: teacherSurname.trim(),
      teacherContact: teacherContact.trim(),
      schoolName: schoolName.trim() || null,
      roboLeagueConsent: roboLeagueConsent
    };

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/teamRegistration/updateTeacherInfo?year=${selectedYear}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      if (tokenExpired(response.status)) { return; }

      const data = await response.json();
      if (response.ok && data.type !== 'ERROR') {
        toast.success(t("dataSaved"));
        setEditTeacherModal(false);
        window.location.reload();
      } else {
        setRegistrationError(data.data || t("dataSaveFail"));
      }
    } catch (error) {
      console.error('Error updating teacher info:', error);
      setRegistrationError(t("dataSaveError"));
    }
  };

  useEffect(() => {
    const fetchCompetitions = async () => {
      setIsLoading(true);

      try {
        const responses = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}api/competition/all`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${process.env.REACT_APP_API_URL}api/teamRegistration/all`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${process.env.REACT_APP_API_URL}api/team/myTeam`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);

        // check token expiration / statuses before parsing JSON (only for endpoints that matter)
        if (tokenExpired(responses[0].status) || tokenExpired(responses[2].status)) { return; }

        const [competitionsData, registrationsData, teamData] = await Promise.all(responses.map(res => res.json()));
        
        // Load competitions - this should always work
        if (responses[0].ok) {
          setCompetitions(competitionsData.data);
        } else {
          console.error('Failed to fetch competitions:', competitionsData);
        }
        
        // Load registrations - may fail for COMPETITOR role (403), that's OK
        if (responses[1].ok && registrationsData.type !== 'ERROR') {
          setRegistrations(registrationsData.data);
        } else {
          // User doesn't have permission to see registrations (e.g. COMPETITOR role)
          // or there was an error - set empty array
          setRegistrations([]);
        }
        
        // Check if user is team leader
        if (responses[2].ok && teamData.type !== 'ERROR') {
          setIsLeader(teamData.data.leaderID === parseInt(userID, 10));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      setIsLoading(false);
    };

    fetchCompetitions();
  }, []);

  return (
    <div className="content">
      <Row>
        <Col xs="12">
          <Card>
            <CardHeader className="pb-2">
              <Row className="align-items-center">
                <Col>
                  <CardTitle tag="h2" className="mb-1">
                    <i className="tim-icons icon-trophy mr-2" />
                    {t("compsAvailable")}
                  </CardTitle>
                  <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                    {t("selectCompetition") || "Vyberte ročník soutěže pro registraci vašeho týmu"}
                  </p>
                </Col>
              </Row>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <div className="text-center py-5">
                  <i className="tim-icons icon-refresh-02 fa-spin" style={{ fontSize: '2rem' }} />
                  <p className="mt-3 text-muted">{t("loading")}</p>
                </div>
              ) : competitions.length === 0 ? (
                <div className="text-center py-5">
                  <i className="tim-icons icon-calendar-60" style={{ fontSize: '3rem', opacity: 0.5 }} />
                  <p className="mt-3 text-muted">{t("noCompetitions") || "Žádné dostupné soutěže"}</p>
                </div>
              ) : (
                <Row>
                  {competitions.map((competition) => {
                    const isRegistered = registrations.some(reg => reg.competitionYear === competition.year);
                    const registration = registrations.find(r => r.competitionYear === competition.year);
                    const competitionDate = new Date(competition.date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    // Check if registration is closed (day before competition at 12:00 or competition already started)
                    const registrationEndDate = new Date(competitionDate);
                    registrationEndDate.setDate(registrationEndDate.getDate() - 1);
                    registrationEndDate.setHours(12, 0, 0, 0);
                    const now = new Date();
                    const isTimeExpired = now >= registrationEndDate;
                    const isRegistrationClosed = competition.started || isTimeExpired;

                    return (
                      <Col lg="6" key={competition.id}>
                        <Card 
                          className="mb-4" 
                          style={{ 
                            border: isRegistered ? '2px solid #28a745' : isRegistrationClosed ? '2px solid #dc3545' : '1px solid rgba(255,255,255,0.1)',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                          }}
                        >
                          <CardHeader style={{ 
                            background: isRegistered 
                              ? 'linear-gradient(135deg, rgba(40,167,69,0.15) 0%, transparent 100%)'
                              : isRegistrationClosed 
                                ? 'linear-gradient(135deg, rgba(220,53,69,0.15) 0%, transparent 100%)'
                                : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
                            borderBottom: '1px solid rgba(255,255,255,0.1)'
                          }}>
                            <Row className="align-items-center">
                              <Col>
                                <CardTitle tag="h3" className="mb-0">
                                  <i className="tim-icons icon-calendar-60 mr-2" style={{ color: '#5e72e4' }} />
                                  {t("robogamesYear", { year: competition.year })}
                                </CardTitle>
                              </Col>
                              <Col xs="auto">
                                {isRegistered ? (
                                  <Badge color="success" style={{ fontSize: '0.8rem', padding: '8px 12px' }}>
                                    <i className="tim-icons icon-check-2 mr-1" />
                                    {t("registered") || "Registrován"}
                                  </Badge>
                                ) : isRegistrationClosed ? (
                                  <Badge color="danger" style={{ fontSize: '0.8rem', padding: '8px 12px' }}>
                                    <i className="tim-icons icon-lock-circle mr-1" />
                                    {competition.started 
                                      ? (t("competitionStarted") || "Soutěž zahájena")
                                      : (t("registrationTimeEnded") || "Registrace uzavřena")}
                                  </Badge>
                                ) : (
                                  <Badge color="info" style={{ fontSize: '0.8rem', padding: '8px 12px' }}>
                                    <i className="tim-icons icon-double-right mr-1" />
                                    {t("available") || "Dostupné"}
                                  </Badge>
                                )}
                              </Col>
                            </Row>
                          </CardHeader>
                          
                          <CardBody>
                            {/* Date and time info */}
                            <div className="mb-4" style={{ 
                              background: 'rgba(255,255,255,0.03)', 
                              borderRadius: '10px', 
                              padding: '15px' 
                            }}>
                              <Row>
                                <Col xs="12" className="mb-2">
                                  <div className="d-flex align-items-center">
                                    <div style={{ 
                                      width: '40px', 
                                      height: '40px', 
                                      borderRadius: '10px', 
                                      background: 'rgba(244,67,54,0.2)', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center',
                                      marginRight: '12px'
                                    }}>
                                      <i className="tim-icons icon-calendar-60" style={{ color: '#f44336' }} />
                                    </div>
                                    <div>
                                      <small className="text-muted d-block">{t("compDate_colon").replace(':', '')}</small>
                                      <strong style={{ fontSize: '1.1rem' }}>{formatDate(competition.date)}</strong>
                                    </div>
                                  </div>
                                </Col>
                                <Col xs="6">
                                  <div className="d-flex align-items-center">
                                    <div style={{ 
                                      width: '35px', 
                                      height: '35px', 
                                      borderRadius: '8px', 
                                      background: 'rgba(76,175,80,0.2)', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center',
                                      marginRight: '10px'
                                    }}>
                                      <i className="tim-icons icon-time-alarm" style={{ color: '#4caf50', fontSize: '0.9rem' }} />
                                    </div>
                                    <div>
                                      <small className="text-muted d-block">{t("start") || "Začátek"}</small>
                                      <strong>{formatTime(competition.startTime)}</strong>
                                    </div>
                                  </div>
                                </Col>
                                <Col xs="6">
                                  <div className="d-flex align-items-center">
                                    <div style={{ 
                                      width: '35px', 
                                      height: '35px', 
                                      borderRadius: '8px', 
                                      background: 'rgba(255,152,0,0.2)', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center',
                                      marginRight: '10px'
                                    }}>
                                      <i className="tim-icons icon-bell-55" style={{ color: '#ff9800', fontSize: '0.9rem' }} />
                                    </div>
                                    <div>
                                      <small className="text-muted d-block">{t("endExpect").replace(':', '') || "Konec"}</small>
                                      <strong>{formatTime(competition.endTime)}</strong>
                                    </div>
                                  </div>
                                </Col>
                              </Row>
                            </div>

                            {isRegistrationClosed && !isRegistered ? (
                              <Alert color="danger" className="d-flex align-items-center mb-0">
                                <i className="tim-icons icon-lock-circle mr-2" />
                                {competition.started 
                                  ? (t("competitionAlreadyStarted") || "Soutěž již byla zahájena")
                                  : (t("registrationTimeEnded") || "Čas na registraci již vypršel")}
                              </Alert>
                            ) : isRegistered ? (
                              <>
                                {/* Teacher info card */}
                                <Card style={{ 
                                  background: 'rgba(255,255,255,0.03)', 
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  marginBottom: '15px'
                                }}>
                                  <CardHeader style={{ 
                                    background: 'rgba(94,114,228,0.1)', 
                                    padding: '12px 15px',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                                  }}>
                                    <h5 className="mb-0" style={{ fontSize: '0.95rem' }}>
                                      <i className="tim-icons icon-single-02 mr-2" style={{ color: '#5e72e4' }} />
                                      {t("teacherInfo")}
                                    </h5>
                                  </CardHeader>
                                  <CardBody style={{ padding: '15px' }}>
                                    <Row>
                                      <Col xs="12" sm="6" className="mb-2">
                                        <small className="text-muted d-block">{t("teacherName")}</small>
                                        <strong>{registration?.teacherName || t("notProvided")}</strong>
                                      </Col>
                                      <Col xs="12" sm="6" className="mb-2">
                                        <small className="text-muted d-block">{t("teacherSurname")}</small>
                                        <strong>{registration?.teacherSurname || t("notProvided")}</strong>
                                      </Col>
                                      <Col xs="12" sm="6" className="mb-2">
                                        <small className="text-muted d-block">{t("teacherContact")}</small>
                                        <strong>{registration?.teacherContact || t("notProvided")}</strong>
                                      </Col>
                                      <Col xs="12" sm="6" className="mb-2">
                                        <small className="text-muted d-block">{t("schoolName")}</small>
                                        <strong>{registration?.schoolName || t("notProvided")}</strong>
                                      </Col>
                                    </Row>
                                    <Row>
                                      <Col xs="12">
                                        <small style={{ color: registration?.roboLeagueConsent ? '#00f2c3' : '#8898aa', fontStyle: 'italic' }}>
                                          <i className={`tim-icons ${registration?.roboLeagueConsent ? 'icon-check-2' : 'icon-simple-remove'} mr-1`} />
                                          {registration?.roboLeagueConsent 
                                            ? (t("roboLeagueConsentNote") || "Výsledky budou zpracovány pro účely Robo Lego Ligy")
                                            : (t("roboLeagueNoConsentNote") || "Výsledky nebudou zpracovány pro Robo Lego Ligu")
                                          }
                                        </small>
                                      </Col>
                                    </Row>
                                  </CardBody>
                                </Card>

                                {/* Action buttons */}
                                <div className="d-flex flex-wrap gap-2" style={{ gap: '8px' }}>
                                  <Button 
                                    color="info" 
                                    onClick={() => handleManageRobots(competition.year)}
                                    className="flex-grow-1"
                                    style={{ marginRight: '5px', marginBottom: '5px' }}
                                  >
                                    <i className="tim-icons icon-settings-gear-63 mr-2" />
                                    {t("manageRobots")}
                                  </Button>
                                  {isLeader && (
                                    <>
                                      <Button 
                                        color="warning" 
                                        size="sm"
                                        onClick={() => handleEditTeacherInfo(competition.year)}
                                        style={{ marginRight: '5px', marginBottom: '5px' }}
                                      >
                                        <i className="tim-icons icon-pencil mr-1" />
                                        {t("editTeacherInfo")}
                                      </Button>
                                      <Button 
                                        color="danger" 
                                        size="sm"
                                        onClick={() => unregisterTeam(competition.year)}
                                        style={{ marginBottom: '5px' }}
                                      >
                                        <i className="tim-icons icon-simple-remove mr-1" />
                                        {t("regCancel")}
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="text-center">
                                {isLeader ? (
                                  <>
                                    <p className="text-muted mb-3">
                                      {t("registerTeamDesc") || "Zaregistrujte svůj tým do tohoto ročníku soutěže"}
                                    </p>
                                    <Button color="success" size="lg" onClick={() => registerTeam(competition.year)}>
                                      <i className="tim-icons icon-check-2 mr-2" />
                                      {t("register")}
                                    </Button>
                                  </>
                                ) : (
                                  <Alert color="info" className="mb-0">
                                    <i className="tim-icons icon-alert-circle-exc mr-2" />
                                    {t("onlyLeaderCanRegister") || "Pouze vedoucí týmu může registrovat tým do soutěže"}
                                  </Alert>
                                )}
                              </div>
                            )}
                          </CardBody>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Registration Modal */}
      <Modal isOpen={registrationModal} toggle={() => setRegistrationModal(false)} size="lg">
        <ModalHeader toggle={() => setRegistrationModal(false)}>
          {t("teamRegister")}
        </ModalHeader>
        <ModalBody style={{ padding: '20px' }}>
          <Alert color="info" style={{ marginBottom: '15px', padding: '10px 15px' }}>
            <small><strong>{t("note")}:</strong> {t("teacherInfoRequired")}</small>
          </Alert>

          {registrationError && (
            <Alert color="danger" style={{ marginBottom: '15px', padding: '10px 15px' }}>
              {registrationError}
            </Alert>
          )}

          <Row>
            <Col md="6">
              <FormGroup style={{ marginBottom: '12px' }}>
                <Label for="teacherName" style={{ marginBottom: '4px', fontSize: '0.9rem' }}>{t("teacherName")} *</Label>
                <Input
                  style={{ color: 'black' }}
                  type="text"
                  name="teacherName"
                  id="teacherName"
                  placeholder={t("enterTeacherName")}
                  value={teacherName}
                  onChange={handleTeacherChange}
                  invalid={!!errors.teacherName}
                  bsSize="sm"
                />
                {errors.teacherName && <FormFeedback>{errors.teacherName}</FormFeedback>}
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup style={{ marginBottom: '12px' }}>
                <Label for="teacherSurname" style={{ marginBottom: '4px', fontSize: '0.9rem' }}>{t("teacherSurname")} *</Label>
                <Input
                  style={{ color: 'black' }}
                  type="text"
                  name="teacherSurname"
                  id="teacherSurname"
                  placeholder={t("enterTeacherSurname")}
                  value={teacherSurname}
                  onChange={handleTeacherChange}
                  invalid={!!errors.teacherSurname}
                  bsSize="sm"
                />
                {errors.teacherSurname && <FormFeedback>{errors.teacherSurname}</FormFeedback>}
              </FormGroup>
            </Col>
          </Row>

          <FormGroup style={{ marginBottom: '12px' }}>
            <Label for="teacherContact" style={{ marginBottom: '4px', fontSize: '0.9rem' }}>{t("teacherContact")} *</Label>
            <Input
              style={{ color: 'black' }}
              type="text"
              name="teacherContact"
              id="teacherContact"
              placeholder={t("enterTeacherContact")}
              value={teacherContact}
              onChange={handleTeacherChange}
              invalid={!!errors.teacherContact}
              bsSize="sm"
            />
            {errors.teacherContact && <FormFeedback>{errors.teacherContact}</FormFeedback>}
          </FormGroup>

          <Row>
            <Col md="8">
              <FormGroup style={{ marginBottom: '12px' }}>
                <Label for="schoolName" style={{ marginBottom: '4px', fontSize: '0.9rem' }}>{t("schoolName")} {roboLeagueConsent && '*'}</Label>
                <SchoolSearchSelect
                  value={schoolName}
                  onChange={(value) => setSchoolName(value)}
                  placeholder={t("enterSchoolName")}
                  invalid={!!errors.schoolName}
                />
                {errors.schoolName && (
                  <div className="text-danger" style={{ fontSize: '11px', marginTop: '3px' }}>{errors.schoolName}</div>
                )}
              </FormGroup>
            </Col>
            <Col md="4" className="d-flex align-items-end">
              <FormGroup style={{ marginBottom: '12px' }}>
                <Label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: 0, fontSize: '0.85rem' }}>
                  <span
                    onClick={() => setRoboLeagueConsent(!roboLeagueConsent)}
                    style={{ 
                      width: '18px', 
                      height: '18px', 
                      marginRight: '8px',
                      cursor: 'pointer',
                      border: '2px solid #ff8d72',
                      borderRadius: '4px',
                      backgroundColor: roboLeagueConsent ? '#ff8d72' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {roboLeagueConsent && (
                      <i className="tim-icons icon-check-2" style={{ color: 'white', fontSize: '10px' }} />
                    )}
                  </span>
                  {t("roboLeagueConsentShort") || "Robo Lego Liga"}
                </Label>
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter style={{ padding: '12px 20px' }}>
          <Button color="success" onClick={handleRegistrationSubmit} style={{ marginRight: '10px' }}>
            {t("register")}
          </Button>
          <Button color="secondary" onClick={() => setRegistrationModal(false)}>
            {t("cancel")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Teacher Info Modal */}
      <Modal isOpen={editTeacherModal} toggle={() => setEditTeacherModal(false)} size="lg">
        <ModalHeader toggle={() => setEditTeacherModal(false)}>
          {t("editTeacherInfo")}
        </ModalHeader>
        <ModalBody style={{ padding: '20px' }}>
          {registrationError && (
            <Alert color="danger" style={{ marginBottom: '15px', padding: '10px 15px' }}>
              {registrationError}
            </Alert>
          )}

          <Row>
            <Col md="6">
              <FormGroup style={{ marginBottom: '12px' }}>
                <Label for="editTeacherName" style={{ marginBottom: '4px', fontSize: '0.9rem' }}>{t("teacherName")} *</Label>
                <Input
                  style={{ color: 'black' }}
                  type="text"
                  name="editTeacherName"
                  id="editTeacherName"
                  placeholder={t("enterTeacherName")}
                  value={teacherName}
                  onChange={handleTeacherChange}
                  invalid={!!errors.teacherName}
                  bsSize="sm"
                />
                {errors.teacherName && <FormFeedback>{errors.teacherName}</FormFeedback>}
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup style={{ marginBottom: '12px' }}>
                <Label for="editTeacherSurname" style={{ marginBottom: '4px', fontSize: '0.9rem' }}>{t("teacherSurname")} *</Label>
                <Input
                  style={{ color: 'black' }}
                  type="text"
                  name="editTeacherSurname"
                  id="editTeacherSurname"
                  placeholder={t("enterTeacherSurname")}
                  value={teacherSurname}
                  onChange={handleTeacherChange}
                  invalid={!!errors.teacherSurname}
                  bsSize="sm"
                />
                {errors.teacherSurname && <FormFeedback>{errors.teacherSurname}</FormFeedback>}
              </FormGroup>
            </Col>
          </Row>

          <FormGroup style={{ marginBottom: '12px' }}>
            <Label for="editTeacherContact" style={{ marginBottom: '4px', fontSize: '0.9rem' }}>{t("teacherContact")} *</Label>
            <Input
              style={{ color: 'black' }}
              type="text"
              name="editTeacherContact"
              id="editTeacherContact"
              placeholder={t("enterTeacherContact")}
              value={teacherContact}
              onChange={handleTeacherChange}
              invalid={!!errors.teacherContact}
              bsSize="sm"
            />
            {errors.teacherContact && <FormFeedback>{errors.teacherContact}</FormFeedback>}
          </FormGroup>

          <Row>
            <Col md="8">
              <FormGroup style={{ marginBottom: '12px' }}>
                <Label for="editSchoolName" style={{ marginBottom: '4px', fontSize: '0.9rem' }}>{t("schoolName")} {roboLeagueConsent && '*'}</Label>
                <SchoolSearchSelect
                  value={schoolName}
                  onChange={(value) => setSchoolName(value)}
                  placeholder={t("enterSchoolName")}
                  invalid={!!errors.schoolName}
                />
                {errors.schoolName && (
                  <div className="text-danger" style={{ fontSize: '11px', marginTop: '3px' }}>{errors.schoolName}</div>
                )}
              </FormGroup>
            </Col>
            <Col md="4" className="d-flex align-items-end">
              <FormGroup style={{ marginBottom: '12px' }}>
                <Label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: 0, fontSize: '0.85rem' }}>
                  <span
                    onClick={() => setRoboLeagueConsent(!roboLeagueConsent)}
                    style={{ 
                      width: '18px', 
                      height: '18px', 
                      marginRight: '8px',
                      cursor: 'pointer',
                      border: '2px solid #ff8d72',
                      borderRadius: '4px',
                      backgroundColor: roboLeagueConsent ? '#ff8d72' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {roboLeagueConsent && (
                      <i className="tim-icons icon-check-2" style={{ color: 'white', fontSize: '10px' }} />
                    )}
                  </span>
                  {t("roboLeagueConsentShort") || "Robo Lego Liga"}
                </Label>
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter style={{ padding: '12px 20px' }}>
          <Button color="primary" onClick={handleUpdateTeacherInfo} style={{ marginRight: '10px' }}>
            {t("save")}</Button>
          <Button color="secondary" onClick={() => setEditTeacherModal(false)}>
            {t("cancel")}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default CompetitionRegistration;