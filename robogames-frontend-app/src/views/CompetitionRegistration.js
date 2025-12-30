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
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { t } from "translations/translate";
import { validateName, validateEmail } from "./Register";

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
  const [registrationError, setRegistrationError] = useState('');
  const [needsTeacherInfo, setNeedsTeacherInfo] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { token, tokenExpired } = useUser();

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
    const confirmUnregistration = window.confirm(t("unreg"));
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
            alert(t("unregImpossible"));
          } else {
            alert(t("dataError", { data: data.data }));
          }
        } else {
          window.location.reload();
        }
      } else {
        console.error('Failed to unregister team:', data);
        alert(t("unregFail", { message: data.message || t("unknownError") }));
      }
    } catch (error) {
      console.error('Error unregistering team:', error);
      alert(t("unregError"));
    }
  };

  const registerTeam = async (year) => {
    setSelectedYear(year);
    setTeacherName('');
    setTeacherSurname('');
    setTeacherContact('');
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

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      } else {
        setErrors({});
      }
    }

    const requestBody = {
      year: selectedYear,
      open: false,
      teacherName: teacherName.trim(),
      teacherSurname: teacherSurname.trim(),
      teacherContact: teacherContact.trim()
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
        alert(t("regSuccess"));
        setRegistrationModal(false);
        window.location.reload();
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
        setErrors({});
        setEditTeacherModal(true);
      } else {
        alert(t("dataFetchFail"));
      }
    } catch (error) {
      console.error('Error fetching teacher info:', error);
      alert(t("dataFetchError"));
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
      teacherContact: teacherContact.trim()
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
        alert(t("dataSaved"));
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
          })
        ]);

        // check token expiration / statuses before parsing JSON
        if (tokenExpired(responses[0].status) || tokenExpired(responses[1].status)) { return; }

        const [competitionsData, registrationsData] = await Promise.all(responses.map(res => res.json()));
        if (responses[0].ok && responses[1].ok) {
          setCompetitions(competitionsData.data);
          setRegistrations(registrationsData.data);
        } else {
          console.error('Failed to fetch data:', competitionsData, registrationsData);
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
            <CardHeader>
              <CardTitle tag="h2">{t("compsAvailable")}</CardTitle>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <p>{t("loading")}</p>
              ) : (
                competitions.map((competition) => {
                  const isRegistered = registrations.some(reg => reg.competitionYear === competition.year);
                  const competitionDate = new Date(competition.date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  return (
                    <Card key={competition.id} className='comp-card'>

                      <CardHeader>
                        <CardTitle tag="h3">{t("robogamesYear", { year: competition.year })}</CardTitle>
                        <hr></hr>
                      </CardHeader>
                      <CardBody>
                        <p>{t("compDate_colon")} <span className='red-text' style={{ fontWeight: 'bold', fontSize: '18px' }}>{formatDate(competition.date)}</span></p>
                        <p>{t("start_colon")}<span className='green-text' style={{ fontWeight: 'bold' }}>{formatTime(competition.startTime)}</span></p>
                        <p>{t("endExpect")}<span className='green-text' style={{ fontWeight: 'bold' }}>{formatTime(competition.endTime)}</span></p>
                        {competition.started ? (
                          <p className='red-text' style={{ fontWeight: 'bold' }}>{t("regImpossible")}</p>
                        ) : isRegistered ? (
                          <>
                            <p className='green-text' style={{ fontWeight: 'bold' }}>{t("robotRegPossible")}</p>

                            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '5px' }}>
                              <h5 style={{ marginBottom: '10px' }}>{t("teacherInfo")}</h5>
                              <p style={{ margin: '5px 0' }}>
                                <strong>{t("teacherName")}:</strong> {registrations.find(r => r.competitionYear === competition.year)?.teacherName || t("notProvided")}
                              </p>
                              <p style={{ margin: '5px 0' }}>
                                <strong>{t("teacherSurname")}:</strong> {registrations.find(r => r.competitionYear === competition.year)?.teacherSurname || t("notProvided")}
                              </p>
                              <p style={{ margin: '5px 0' }}>
                                <strong>{t("teacherContact")}:</strong> {registrations.find(r => r.competitionYear === competition.year)?.teacherContact || t("notProvided")}
                              </p>
                            </div>

                            <Button color="info" onClick={() => handleManageRobots(competition.year)}>
                              <i className="tim-icons icon-double-right" />
                              {t("manageRobots")}
                              <i className="tim-icons icon-double-left" />
                            </Button>

                            <Button color="warning" onClick={() => handleEditTeacherInfo(competition.year)}>
                              <i className="tim-icons icon-pencil" />
                              {t("editTeacherInfo")}
                            </Button>

                            <Button color="danger" onClick={() => unregisterTeam(competition.year)}>
                              {t("regCancel")}
                            </Button>

                          </>
                        ) : (
                          <Button color="success" onClick={() => registerTeam(competition.year)}>
                            {t("register")}
                          </Button>
                        )}
                      </CardBody>
                    </Card>
                  );
                })
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
          <p>{t("fillTeacher")}</p>
          <Alert color="info" style={{ marginBottom: '20px' }}>
            <strong>{t("note")}:</strong> {t("teacherInfoRequired")}
          </Alert>

          <FormGroup style={{ marginBottom: '15px' }}>
            <Label for="teacherName">{t("teacherName")} *</Label>
            <Input
              style={{ color: 'black' }}
              type="text"
              name="teacherName"
              id="teacherName"
              placeholder={t("enterTeacherName")}
              value={teacherName}
              onChange={handleTeacherChange}
              invalid={!!errors.teacherName}
            />
            {errors.teacherName && <FormFeedback>{errors.teacherName}</FormFeedback>}
          </FormGroup>

          <FormGroup style={{ marginBottom: '15px' }}>
            <Label for="teacherSurname">{t("teacherSurname")} *</Label>
            <Input
              style={{ color: 'black' }}
              type="text"
              name="teacherSurname"
              id="teacherSurname"
              placeholder={t("enterTeacherSurname")}
              value={teacherSurname}
              onChange={handleTeacherChange}
              invalid={!!errors.teacherSurname}
            />
            {errors.teacherSurname && <FormFeedback>{errors.teacherSurname}</FormFeedback>}
          </FormGroup>

          <FormGroup style={{ marginBottom: '15px' }}>
            <Label for="teacherContact">{t("teacherContact")} *</Label>
            <Input
              style={{ color: 'black' }}
              type="text"
              name="teacherContact"
              id="teacherContact"
              placeholder={t("enterTeacherContact")}
              value={teacherContact}
              onChange={handleTeacherChange}
              invalid={!!errors.teacherContact}
            />
            {errors.teacherContact && <FormFeedback>{errors.teacherContact}</FormFeedback>}
          </FormGroup>
        </ModalBody>
        <ModalFooter style={{ padding: '15px 20px' }}>
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
          <FormGroup style={{ marginBottom: '15px' }}>
            <Label for="editTeacherName">{t("teacherName")} *</Label>
            <Input
              style={{ color: 'black' }}
              type="text"
              name="editTeacherName"
              id="editTeacherName"
              placeholder={t("enterTeacherName")}
              value={teacherName}
              onChange={handleTeacherChange}
              invalid={!!errors.teacherName}
            />
            {errors.teacherName && <FormFeedback>{errors.teacherName}</FormFeedback>}
          </FormGroup>

          <FormGroup style={{ marginBottom: '15px' }}>
            <Label for="editTeacherSurname">{t("teacherSurname")} *</Label>
            <Input
              style={{ color: 'black' }}
              type="text"
              name="editTeacherSurname"
              id="editTeacherSurname"
              placeholder={t("enterTeacherSurname")}
              value={teacherSurname}
              onChange={handleTeacherChange}
              invalid={!!errors.teacherSurname}
            />
            {errors.teacherSurname && <FormFeedback>{errors.teacherSurname}</FormFeedback>}
          </FormGroup>

          <FormGroup style={{ marginBottom: '15px' }}>
            <Label for="editTeacherContact">{t("teacherContact")} *</Label>
            <Input
              style={{ color: 'black' }}
              type="text"
              name="editTeacherContact"
              id="editTeacherContact"
              placeholder={t("enterTeacherContact")}
              value={teacherContact}
              onChange={handleTeacherChange}
              invalid={!!errors.teacherContact}
            />
            {errors.teacherContact && <FormFeedback>{errors.teacherContact}</FormFeedback>}
          </FormGroup>
        </ModalBody>
        <ModalFooter style={{ padding: '15px 20px' }}>
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