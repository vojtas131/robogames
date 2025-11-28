/**
* The `Login` component is responsible for rendering the login form and handling the login process.
* It uses the `useUser` hook from the `UserContext` to access the `login` function, which is used to authenticate the user.
* The component renders a form with email and password inputs, and a "Login" button. When the button is clicked, the `handleLogin` function is called, which in turn calls the `login` function from the `UserContext`.
* If the login is successful, the user is navigated to the appropriate page using the `useNavigate` hook.
* The component also includes a "Register" button that navigates the user to the registration page.
*/
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardBody, FormGroup, Label, Input, Button, Container, Row, Col } from "reactstrap";
// import AdminNavbar from "components/Navbars/AdminNavbar";
import { loginWithKeycloak } from "../components/KeyCloak/KeyCloak"
import { useUser } from 'contexts/UserContext';

import { t } from "translations/translate";

const customStyles = {
  maxWidth: "700px",
  minWidth: "400px",
  width: '100%',
  marginTop: 'auto',
  marginBottom: 'auto',
};

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useUser(); // Use the login function from context

  const handleLogin = () => {
    login(email, password, navigate);
  };

  return (
    <>
      {/* <AdminNavbar brandText={t("login")} /> */}
      <Container className="h-100 d-flex justify-content-center align-items-center">
        <Row className="justify-content-center align-items-center" style={{ height: '100vh' }}>
          <Col style={customStyles}>
            <Card>
              <CardHeader>
                <p className="m-0 text-right">
                  <a href="/admin/dashboard" className="text-muted close" style={{ fontSize: '1.4em' }}>×</a>
                </p>
                <h4 className="mb-0 card-title text-center">{t("login")}</h4>
              </CardHeader>
              <CardBody>
                <FormGroup>
                  <Label for="email">{t("mail")}</Label>
                  <Input type="email" id="email" placeholder={t("mailEnter")} value={email} onChange={e => setEmail(e.target.value)} />
                </FormGroup>
                <FormGroup>
                  <Label for="password">{t("password")}</Label>
                  <Input type="password" id="password" placeholder={t("passwordEnter")} value={password} onChange={e => setPassword(e.target.value)} />
                </FormGroup>
                <div className="text-center">
                  <Button color="primary" onClick={handleLogin}>{t("log")}</Button>
                  <Button color="primary" onClick={() => navigate(loginWithKeycloak())}>
                    {"Přihlásit přes KeyCloak"}
                  </Button>
                </div>
                <div className="text-center mt-3">
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>{t("noAccount")}</p>
                  <Button color="secondary" onClick={() => navigate('/robogames/register')} style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                    {t("register")}
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

export default Login;