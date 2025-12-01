import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col } from "reactstrap";
import { useUser } from 'contexts/UserContext';
import { t } from "translations/translate";

const customStyles = {
  maxWidth: "700px",
  minWidth: "400px",
  width: '100%',
  marginTop: 'auto',
  marginBottom: 'auto',
};

const baseUrl = `${process.env.REACT_APP_KEYCLOAK_URL}/realms/${process.env.REACT_APP_REALM}/protocol/openid-connect`;
const redirectUrl = `${process.env.REACT_APP_URL}admin/auth/callback`;
const clientId = process.env.REACT_APP_CLIENT_ID;

// sets redirect url to Keycloak login
export const loginWithKeycloak = () => {
  const keycloakUrl =
    baseUrl + "/auth" +
    "?client_id=" + clientId +
    "&redirect_uri=" + redirectUrl +
    "&response_type=code" +
    "&scope=openid email profile";
  window.location.assign(keycloakUrl);
};

export const logoutFromKeycloak = () => {
  const homeUrl = `${process.env.REACT_APP_URL}admin/dashboard`;
  const logoutUrl = baseUrl + `/logout?client_id=${clientId}&post_logout_redirect_uri=` + homeUrl;
  window.location.assign(logoutUrl);
}

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
      const res = await fetch(`${process.env.REACT_APP_API_URL}api/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });

      // get user token from backend
      const data = await res.json();

      if (data.type === "ERROR") {
        console.error("Keycloak login failed:", data.data);
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
            <h4 className="mb-0 card-title text-center">{t("loggingIn")}</h4>
          </Col>
        </Row>
      </Container>
    </>
  )
}
