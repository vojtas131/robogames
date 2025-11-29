import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Container, Row, Col } from "reactstrap";
import { useUser } from 'contexts/UserContext';
import { t } from "translations/translate";

const customStyles = {
  maxWidth: "700px",
  minWidth: "400px",
  width: '100%',
  marginTop: 'auto',
  marginBottom: 'auto',
};

const baseUrl = "http://localhost:8180/realms/my_app/protocol/openid-connect";
const redirectUrl = "http://localhost:3000/admin/auth/callback";
const userInfoUrl = baseUrl + "/userinfo";

// sets redirect url to Keycloak login
export const loginWithKeycloak = () => {
  const keycloakUrl =
    baseUrl + "/auth" +
    "?client_id=my_client" +
    "&redirect_uri=" + redirectUrl +
    "&response_type=code" +
    "&scope=openid email profile";
  window.location.assign(keycloakUrl);
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const { token, setToken, getUserInfo } = useUser();

  useEffect(() => {
    async function processLogin() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (!code) {
        console.error("No code found");
        return;
      }

      // send code to backend
      const res = await fetch(`${process.env.REACT_APP_API_URL}auth/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });

      // get user token from backend
      const data = await res.json();

      if (data.type === "ERROR") {
        console.error("Keycloak login failed:", data.error);
        return;
      }

      await loginWithToken(data.data, navigate);
      navigate("/admin/dashboard");
    }

    processLogin();
  }, []);

  const loginWithToken = async (token, navigate) => {
    localStorage.setItem("token", token); // save intern user token
    setToken(token);
    await getUserInfo(token);    // load user data
  };

  return (
    <>
      <Container className="h-100 d-flex justify-content-center align-items-center">
        <Row className="justify-content-center align-items-center" style={{ height: '100vh' }}>
          <Col style={customStyles}>
            <Card>
              <h4 className="mb-0 card-title text-center">{t("loggingIn")}</h4>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  )
}