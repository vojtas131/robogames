/**
* The `Register` component is responsible for rendering the registration form for the application.
* It handles user input, validates the form data, and sends a registration request to the backend API.
* Upon successful registration, the user is redirected to the login page.
*/
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  FormGroup,
  Label,
  Input,
  Button,
  FormFeedback,
  Container,
  Row,
  Col,
} from "reactstrap";
// import AdminNavbar from "components/Navbars/AdminNavbar";
import { t } from "translations/translate";

const customStyles = {
  maxWidth: "700px",
  minWidth: "400px",
  width: '100%',
  marginTop: 'auto',
  marginBottom: 'auto',
};

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthDate: ''
  });
  const [errors, setErrors] = useState({});

  // Validates email format
  const validateEmail = (email) => {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    let newErrors = { ...errors };

    if (name === 'email' && !validateEmail(value)) {
      newErrors.email = t("mailInvalid");
    } else {
      delete newErrors.email;
    }

    if (name === 'confirmPassword' && value !== formData.password) {
      newErrors.confirmPassword = t("passwordsDiffer");
    } else {
      delete newErrors.confirmPassword;
    }

    setErrors(newErrors);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!errors.email && !errors.confirmPassword && formData.password === formData.confirmPassword && formData.email && formData.password && formData.name && formData.surname && formData.birthDate) {
      const apiUrl = `${process.env.REACT_APP_API_URL}auth/register`;
      const data = {
        name: formData.name,
        surname: formData.surname,
        email: formData.email,
        password: formData.password,
        birthDate: formData.birthDate
      };

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });

        const result = await response.json(); // Parse JSON only once

        if (result.type === "RESPONSE" && result.data === "success") {
          console.log('Registrace byla úspěšná.', result);
          navigate('/robogames/login'); // Redirect to login after successful registration
        } else if (result.type === "ERROR") {
          if (result.data === "failure, user with this email already exists") {
            alert(t("userExists"));
          } else {
            alert(t("dataError",{data: result.data})); // Handle other types of errors
          }
        } else {
          throw new Error(t("typeError"));
        }
      } catch (error) {
        console.error('Chyba při registraci.', error);
        alert(t("regError",{message: error.message}));
      }
    } else {
      alert(t("regMistakes"));
    }
  };



  return (
    <>
      {/* <AdminNavbar brandText={t("registration")}/> */}
      <Container className="d-flex justify-content-center align-items-center">
        <Row className="justify-content-center align-items-center" >
          <Col style={customStyles}>
            <Card className="mt-4">
              <CardHeader>
                <p className="m-0 text-right text-muted">
                  <a href="/admin/dashboard" className="text-muted close" style={{fontSize: '1.4em'}}>×</a>
                </p>
                <h4 className="mb-0 card-title text-center">{t("registration")}</h4>
              </CardHeader>
              <CardBody>
                <form onSubmit={handleSubmit}>
                  <FormGroup>
                    <Label for="name">{t("name")}</Label>
                    <Input type="text" id="name" name="name" placeholder={t("enterName")} value={formData.name} onChange={handleChange} required />
                  </FormGroup>
                  <FormGroup>
                    <Label for="surname">{t("surname")}</Label>
                    <Input type="text" id="surname" name="surname" placeholder={t("enterSurname")} value={formData.surname} onChange={handleChange} required />
                  </FormGroup>
                  <FormGroup>
                    <Label for="email">{t("mail")}</Label>
                    <Input invalid={!!errors.email} type="email" id="email" name="email" placeholder={t("enterMail")} value={formData.email} onChange={handleChange} required />
                    {errors.email && <FormFeedback>{errors.email}</FormFeedback>}
                  </FormGroup>
                  <FormGroup>
                    <Label for="password">{t("password")}</Label>
                    <Input type="password" id="password" name="password" placeholder={t("passwordEnter")} value={formData.password} onChange={handleChange} required />
                  </FormGroup>
                  <FormGroup>
                    <Label for="confirmPassword">{t("passwordCheck")}</Label>
                    <Input invalid={!!errors.confirmPassword} type="password" id="confirmPassword" name="confirmPassword" placeholder={t("passwordReenter")} value={formData.confirmPassword} onChange={handleChange} required />
                    {errors.confirmPassword && <FormFeedback>{errors.confirmPassword}</FormFeedback>}
                  </FormGroup>
                  <FormGroup>
                    <Label for="birthDate">{t("birthDate")}</Label>
                    <Input type="date" id="birthDate" name="birthDate" value={formData.birthDate} onChange={handleChange} required />
                  </FormGroup>
                  <div className="text-center">
                    <Button color="primary" type="submit">{t("register")}</Button>
                  </div>
                </form>
                <div className="text-center mt-3">
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>{t("hasAccount")}</p>
                  <Button color="secondary" onClick={() => navigate('/robogames/login')} style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                    {t("log")}
                  </Button>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default Register;