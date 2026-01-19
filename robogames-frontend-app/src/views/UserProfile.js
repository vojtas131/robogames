import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardTitle,
  FormGroup,
  Form,
  FormFeedback,
  Input,
  Row,
  Col,
  Badge,
} from "reactstrap";
import { useUser } from "contexts/UserContext";
import { useToast } from "contexts/ToastContext";
import { validateName, validateBirth } from "./Register";
import { t } from "translations/translate";

function UserProfile() {
  const [userData, setUserData] = useState({
    id: '',
    uuid: '',
    name: '',
    surname: '',
    email: '',
    birthDate: '',
    roles: [],
    teamID: ''
  });
  const [initialUserData, setInitialUserData] = useState({});
  const [teamName, setTeamName] = useState('');
  const { token, tokenExpired } = useUser();
  const toast = useToast();
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/user/info`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (tokenExpired(response.status)) { return; }

        if (response.ok) {
          const jsonResponse = await response.json();
          setUserData(jsonResponse.data);
          setInitialUserData(jsonResponse.data);
          
          // Fetch team name if user is in a team
          if (jsonResponse.data.teamID && jsonResponse.data.teamID !== -1) {
            try {
              const teamResponse = await fetch(`${process.env.REACT_APP_API_URL}api/team/findByID?id=${jsonResponse.data.teamID}`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              if (teamResponse.ok) {
                const teamData = await teamResponse.json();
                if (teamData.data && teamData.data.name) {
                  setTeamName(teamData.data.name);
                }
              }
            } catch (error) {
              console.error("Error fetching team data:", error);
            }
          }
        } else {
          console.error("Failed to fetch user data:", response.status);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newErrors = { ...errors };

    if (name === 'name') {
      var nameCheck = validateName(value);
      if (!nameCheck) {
        newErrors.name = t("invalidName");
      } else if (nameCheck === "too short") {
        newErrors.name = t("shortName");
      } else if (nameCheck === "too long") {
        newErrors.name = t("longName");
      } else {
        delete newErrors.name;
      }
    }

    if (name === 'surname') {
      var surnameCheck = validateName(value);
      if (!surnameCheck) {
        newErrors.surname = t("invalidSurname");
      } else if (surnameCheck === "too short") {
        newErrors.surname = t("shortSurname");
      } else if (surnameCheck === "too long") {
        newErrors.surname = t("longSurname");
      } else {
        delete newErrors.surname;
      }
    }

    if (name === 'birthDate') {
      const val = validateBirth(value);
      if (!val) {
        newErrors.birthDate = t("invalidAge");
      } else if (val === "younger") {
        newErrors.birthDate = t("tooYoung", { age: process.env.REACT_APP_MIN_AGE });
      } else if (val === "older") {
        newErrors.birthDate = t("tooOld", { age: process.env.REACT_APP_MAX_AGE });
      } else {
        delete newErrors.birthDate;
      }
    }

    setErrors(newErrors);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (errors.name || errors.surname || errors.birthDate) {
      toast.warning(t("regMistakes"));
      return;
    }

    if (userData.name && userData.surname && userData.birthDate &&
      (userData.name !== initialUserData.name ||
        userData.surname !== initialUserData.surname ||
        userData.birthDate !== initialUserData.birthDate)) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/user/edit`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: userData.name,
            surname: userData.surname,
            birthDate: userData.birthDate
          })
        });
        if (tokenExpired(response.status)) { return; }

        if (!response.ok) throw new Error(t("userUpdateFail"));

        const result = await response.json();
        if (result.data === "success") {
          setInitialUserData(userData);
          toast.success(t("dataSaved"));
        } else {
          toast.error(t("userUpdateFail"));
        }
      } catch (error) {
        console.error('Update selhal:', error);
        toast.error(t("dataSaveFail"));
      }
    } else {
      toast.info(t("noChanges"));
    }
  };

  // Mapování rolí na barvy badge
  const getRoleBadgeColor = (roleName) => {
    switch (roleName) {
      case 'ADMIN': return 'danger';
      case 'LEADER': return 'warning';
      case 'REFEREE': return 'info';
      case 'MAIN_REFEREE': return 'primary';
      case 'ASSISTANT': return 'success';
      case 'COMPETITOR': return 'secondary';
      default: return 'secondary';
    }
  };

  // Translate role names
  const getRoleTranslation = (roleName) => {
    switch (roleName) {
      case 'ADMIN': return t('adminRole');
      case 'LEADER': return t('leaderRole');
      case 'REFEREE': return t('refereeRole');
      case 'ASSISTANT': return t('assistantRole');
      case 'COMPETITOR': return t('competitorRole');
      default: return roleName;
    }
  };

  // Formátování data narození
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ');
  };

  // Výpočet věku
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="content">
      {/* Hlavní karta profilu */}
      <Card className="mb-4">
        <CardBody>
          <Row className="align-items-center">
            {/* Avatar a základní info */}
            <Col md="auto" className="text-center mb-3 mb-md-0">
              <img
                alt={t("altProfilePicture")}
                className="avatar"
                src={require("assets/img/profile-picture.png")}
                style={{ 
                  width: '100px', 
                  height: '100px', 
                  borderRadius: '50%',
                  border: '3px solid rgba(255,255,255,0.2)'
                }}
              />
            </Col>
            <Col md>
              <h3 className="mb-1">{userData.name} {userData.surname}</h3>
              <p className="text-muted mb-2">{userData.email}</p>
              <div>
                {userData.roles.map((role, index) => (
                  <Badge 
                    key={index} 
                    color={getRoleBadgeColor(role.name)} 
                    className="mr-1"
                    style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                  >
                    {getRoleTranslation(role.name)}
                  </Badge>
                ))}
              </div>
            </Col>
            <Col md="auto" className="text-md-right mt-3 mt-md-0">
              <Button
                color="info"
                size="sm"
                onClick={() => {
                  window.location.href =
                    process.env.REACT_APP_KEYCLOAK_URL + "/realms/" +
                    process.env.REACT_APP_REALM + "/login-actions/reset-credentials?client_id=" +
                    process.env.REACT_APP_CLIENT_ID + "&redirect_uri=" +
                    process.env.REACT_APP_URL + "admin/user-profile";
                }}
              >
                <i className="tim-icons icon-lock-circle mr-2" />
                {t("changePassword")}
              </Button>
            </Col>
          </Row>
        </CardBody>
      </Card>

      <Row>
        {/* Levý sloupec - Přehled */}
        <Col lg="4">
          <Card>
            <CardHeader>
              <CardTitle tag="h5" className="mb-0">
                <i className="tim-icons icon-badge mr-2" />
                {t("overview") || "Přehled"}
              </CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="d-flex justify-content-between align-items-center py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="text-muted">{t("age") || "Věk"}</span>
                <strong>{calculateAge(userData.birthDate) ? `${calculateAge(userData.birthDate)} ${t("years") || "let"}` : '-'}</strong>
              </div>
              <div className="d-flex justify-content-between align-items-center py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="text-muted">{t("birthDate")}</span>
                <strong>{formatDate(userData.birthDate) || '-'}</strong>
              </div>
              <div className="d-flex justify-content-between align-items-center py-3">
                <span className="text-muted">{t("team")}</span>
                {userData.teamID !== -1 ? (
                  <strong className="text-success">
                    <i className="tim-icons icon-check-2 mr-1" />
                    {teamName || t("loading")}
                  </strong>
                ) : (
                  <span className="text-muted">{t("notInTeam") || "Není v týmu"}</span>
                )}
              </div>
            </CardBody>
          </Card>
        </Col>

        {/* Pravý sloupec - Editace profilu */}
        <Col lg="8">
          <Card>
            <CardHeader>
              <CardTitle tag="h5" className="mb-0">
                <i className="tim-icons icon-settings mr-2" />
                {t("infoEdit")}
              </CardTitle>
            </CardHeader>
            <CardBody>
              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md="6">
                    <FormGroup>
                      <label>{t("name")}</label>
                      <Input
                        invalid={!!errors.name}
                        value={userData.name}
                        placeholder={t("enterName") || "Zadejte jméno"}
                        type="text"
                        name="name"
                        onChange={(e) => {
                          handleChange(e);
                          setUserData({ ...userData, name: e.target.value })
                        }}
                        required
                      />
                      {errors.name && <FormFeedback>{errors.name}</FormFeedback>}
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <label>{t("surname")}</label>
                      <Input
                        invalid={!!errors.surname}
                        value={userData.surname}
                        placeholder={t("enterSurname") || "Zadejte příjmení"}
                        type="text"
                        name="surname"
                        onChange={(e) => {
                          handleChange(e);
                          setUserData({ ...userData, surname: e.target.value })
                        }}
                        onBlur={handleChange}
                        required
                      />
                      {errors.surname && <FormFeedback>{errors.surname}</FormFeedback>}
                    </FormGroup>
                  </Col>
                </Row>
                <Row>
                  <Col md="6">
                    <FormGroup>
                      <label>{t("mail")}</label>
                      <Input
                        value={userData.email}
                        placeholder={t("mail")}
                        type="email"
                        disabled
                        style={{ opacity: 0.6 }}
                      />
                      <small className="text-muted">{t("emailCantChange") || "E-mail nelze změnit"}</small>
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <label>{t("birthDate")}</label>
                      <Input
                        invalid={!!errors.birthDate}
                        value={userData.birthDate}
                        type="date"
                        name="birthDate"
                        onChange={(e) => {
                          handleChange(e);
                          setUserData({ ...userData, birthDate: e.target.value })
                        }}
                        onBlur={handleChange}
                        required
                      />
                      {errors.birthDate && <FormFeedback>{errors.birthDate}</FormFeedback>}
                    </FormGroup>
                  </Col>
                </Row>
              </Form>
            </CardBody>
            <CardFooter style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <Button className="btn-fill" color="primary" onClick={handleSubmit}>
                <i className="tim-icons icon-check-2 mr-2" />
                {t("saveChanges") || t("save")}
              </Button>
            </CardFooter>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default UserProfile;