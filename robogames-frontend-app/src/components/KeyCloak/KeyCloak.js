import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

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

  useEffect(() => {
    async function processLogin() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (!code) {
        console.error("No code found");
        return;
      }

      const res = await fetch(`${process.env.REACT_APP_API_URL}auth/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });

      const data = await res.json();

      if (data.error) {
        console.error("Keycloak login failed:", data.error);
        return;
      }

      // uložíš interní token
      localStorage.setItem("token", data.data.token);

      navigate("/admin/dashboard");
    }

    processLogin();
  }, []);

  return <div>Přihlašuji…</div>;
}