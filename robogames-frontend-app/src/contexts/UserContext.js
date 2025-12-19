import React, { createContext, useContext, useState } from 'react';
import { logoutFromKeycloak } from "../components/KeyCloak/KeyCloak";
import { t } from "translations/translate";

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

// Error kody z backendu
const ERROR_CODES = {
  TOKEN_MISSING: 'TOKEN_MISSING',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  NO_ROLE: 'NO_ROLE'
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  const login = async (email, password, navigate) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();
      if (response.ok && result.type !== 'ERROR') {
        localStorage.setItem('token', result.data);
        setToken(result.data); // Set new token
        getUserInfo(result.data); // Fetch user details
        navigate('/dashboard');
      } else {
        throw new Error(result.data || t("wrongMailPassword"));
      }
    } catch (error) {
      alert(error.message);
    }
  };


  const getUserInfo = async (currentToken) => {
    const authToken = currentToken || token;
    if (!authToken) return;

    const response = await fetch(`${process.env.REACT_APP_API_URL}api/user/info`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const result = await response.json();
    if (response.ok) {
      setUser(result.data);

      const roles = result.data.roles.map(role => role.name).join(', ');
      const ID = result.data.id;
      localStorage.setItem('roles', roles);
      localStorage.setItem('UserID', ID);
    } else {
      console.error('Failed to fetch user data');
    }
  };


  const logout = (skipKeycloakLogout = false) => {
    localStorage.removeItem('token');
    localStorage.removeItem('roles');
    localStorage.removeItem('UserID');
    setUser(null);
    setToken(null);

    // logout from keycloak (pokud neni preskoceno - napr. pri expiraci tokenu backend uz odhlasil)
    if (!skipKeycloakLogout) {
      logoutFromKeycloak();
    } else {
      // Presmerujeme na dashboard bez Keycloak logout
      window.location.assign(`${process.env.REACT_APP_URL}admin/dashboard`);
    }
  };

  // if token expired
  // Muzete volat bud s jednim parametrem (status code) nebo s dvema (status, responseData)
  const tokenExpired = (response, responseData = null) => {
    // 401 = Unauthorized - token je neplatny/expiroval, uzivatel musi znovu prihlasit
    if (response === 401) {
      console.log("Token is unauthorized (missing, expired or invalid)");
      
      // Pri 401 backend uz odhlasil uzivatele z Keycloaku, takze preskocime Keycloak logout
      // a jen vycistime local storage
      let skipKeycloakLogout = true;
      
      // Pokud mame response data, zalogujeme presny duvod
      if (responseData && responseData.errorCode) {
        switch (responseData.errorCode) {
          case ERROR_CODES.TOKEN_EXPIRED:
            console.log("Token expired - session timeout");
            break;
          case ERROR_CODES.TOKEN_MISSING:
            console.log("Token missing");
            break;
          case ERROR_CODES.TOKEN_INVALID:
            console.log("Token invalid");
            break;
          default:
            console.log("Unknown auth error:", responseData.errorCode);
        }
      }
      
      logout(skipKeycloakLogout);
      return true;
    }
    
    // 403 = Forbidden - uzivatel je prihlasen, ale nema opravneni k dane akci
    if (response === 403) {
      // Pokud mame errorCode NO_ROLE, uzivatel nema zadnou roli - odhlasime
      if (responseData && responseData.errorCode === ERROR_CODES.NO_ROLE) {
        console.log("User has no role - forbidden");
        logout(true); // Backend uz odhlasil
        return true;
      }
      // Pro zpetnou kompatibilitu - pokud nemame responseData, pouzijeme stare chovani
      // (odhlasime uzivatele)
      if (!responseData) {
        console.log("Forbidden (legacy behavior - logging out)");
        logout(true); // Preskocime Keycloak logout - backend uz to udelal
        return true;
      }
      // Jinak je to legitimni "nemas opravneni" - neodhlasujeme
      console.log("Forbidden - insufficient permissions (not logging out)");
      return false;
    }
    
    return false;
  }

  return (
    <UserContext.Provider value={{ user, token, setToken, login, tokenExpired, getUserInfo, logout }}>
      {children}
    </UserContext.Provider>
  );
};
