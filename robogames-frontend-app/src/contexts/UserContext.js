import React, { createContext, useContext, useState } from 'react';
import { logoutFromKeycloak } from "../components/KeyCloak/KeyCloak";
import { t } from "translations/translate";

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

// Calculates user age
export const calculateAge = (_birthDate) => {
  if (!_birthDate) { return null; }

  const today = new Date();
  const birthDate = new Date(_birthDate);

  // is not a number or is a future date
  if (isNaN(birthDate) || birthDate > today) { return null; }

  let age = today.getFullYear() - birthDate.getFullYear();

  // birthday in this year
  const birthday = new Date(
    today.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate()
  );

  // if did not have birthday this year yet
  if (today < birthday) {
    age--;
  }

  return age;
};

// Validates date of birth
export function validateBirth(birthDate) {
  const age = calculateAge(birthDate);
  if (age === null) {
    console.log('Invalid age.');
    return false;
  } else {
    if (age < process.env.REACT_APP_MIN_AGE) {
      console.log('You have to be at least ', process.env.REACT_APP_MIN_AGE, ' years old.')
      return "younger";
    } else if (age > process.env.REACT_APP_MAX_AGE) {
      console.log('You cannot be older than ', process.env.REACT_APP_MAX_AGE, ' years.')
      return "older";
    } else {
      return true;
    }
  }
};

// Validates user name
export function validateName(name) {
  const allowed = /^[A-Za-zČŠŽŘŤĎŇÁÉĚÍÓÚŮÝčšžřťďňáéěíóúůýßäöüÄÖÜàèìòùâêîôûãõñëïÿ '-]+$/;
  const trimmed = name.trim();
  if (allowed.test(trimmed)) {
    if (trimmed.length < process.env.REACT_APP_MIN_NAME_LENGTH) {
      return "too short"
    } else if (trimmed.length > process.env.REACT_APP_MAX_NAME_LENGTH) {
      return "too long"
    } else {
      return true;
    }
  } else { return false; }
}

// Validates robot or team title
export function validateTitle(title) {
  const allowed = /^[A-Za-z0-9ČŠŽŘŤĎŇÁÉĚÍÓÚŮÝčšžřťďňáéěíóúůýßäöüÄÖÜàèìòùâêîôûãõñëïÿ '-.:,/?!+]+$/;
  const trimmed = title.trim();
  if (allowed.test(trimmed)) {
    if (trimmed.length < process.env.REACT_APP_TITLE_MIN_LENGTH) {
      return "too short"
    } else if (trimmed.length > process.env.REACT_APP_TITLE_MAX_LENGTH) {
      return "too long"
    } else {
      return true;
    }
  } else { return false; }
}

// Validates email format
export function validateEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (re.test(String(email).toLowerCase())) {
    if (email.length < process.env.REACT_APP_MIN_EMAIL_LENGTH) {
      return "too short"
    } else if (email.length > process.env.REACT_APP_MAX_EMAIL_LENGTH) {
      return "too long"
    } else {
      return true;
    }
  } else { return false; }
}

// Error kody z backendu pro token autentizaci
const AUTH_ERROR_CODES = {
  // problemy s token - 401 - (MUSI odhlasit)
  TOKEN_MISSING: 'TOKEN_MISSING',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  // problemy s rolemi/uctem - 403
  NO_ROLE: 'NO_ROLE',           // Uzivatel nema zadnou roli - MUSI odhlasit
  USER_BANNED: 'USER_BANNED',   // Uzivatel je zabanovan - MUSI odhlasit
  ACCESS_DENIED: 'ACCESS_DENIED' // Uzivatel nema opravneni pro akci - NEOHLASUJE
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

  /**
   * Kontroluje zda HTTP odpoved indikuje problem s autentizaci/autorizaci
   * 
   * POUZITI:
   * 1. Jednoduche (jen status): if (tokenExpired(response.status)) return;
   * 2. S response daty: if (tokenExpired(response.status, jsonData)) return;
   * 
   * DULEZITE: Tato funkce POUZE kontroluje autentizacni chyby (401, 403 s NO_ROLE).
   * Business chyby (400, 404, 500) NEJSOU povazovany za problem s tokenem!
   * 
   * @param {number} status - HTTP status kod
   * @param {object} responseData - Volitelne: JSON response body z backendu
   * @returns {boolean} true pokud uzivatel byl odhlasen, false jinak
   */
  const tokenExpired = (status, responseData = null) => {
    // 401 = Unauthorized - token je neplatny/chybi/expiroval
    // Toto je JEDINY pripad kdy je jiste ze se jedna o problem s tokenem
    if (status === 401) {
      // Zalogujeme presny duvod pokud mame response data
      if (responseData && responseData.errorCode) {
        const errorCode = responseData.errorCode;
        if (errorCode === AUTH_ERROR_CODES.TOKEN_EXPIRED) {
          console.log("Token expired - session timeout");
        } else if (errorCode === AUTH_ERROR_CODES.TOKEN_MISSING) {
          console.log("Token missing in request");
        } else if (errorCode === AUTH_ERROR_CODES.TOKEN_INVALID) {
          console.log("Token is invalid");
        } else {
          console.log("Auth error:", errorCode);
        }
      } else {
        console.log("Unauthorized (401) - logging out");
      }

      // Pri 401 backend uz odhlasil uzivatele z Keycloaku
      logout(true);
      return true;
    }

    // 403 = Forbidden - pouze pokud je errorCode NO_ROLE nebo USER_BANNED
    // Jine 403 chyby (napr. "nemas opravneni na tuto akci") NEOHLASUJEME!
    if (status === 403) {
      // Pouze pokud mame errorCode a je to NO_ROLE
      if (responseData && responseData.errorCode === AUTH_ERROR_CODES.NO_ROLE) {
        console.log("User has no role - logging out");
        logout(true);
        return true;
      }
      // Uzivatel je zabanovan
      if (responseData && responseData.errorCode === AUTH_ERROR_CODES.USER_BANNED) {
        console.log("User is banned - logging out");
        alert(t("userBanned"));
        logout(true);
        return true;
      }
      // Vsechny ostatni 403 - uzivatel JE prihlasen, jen nema opravneni
      // NEODHLASUJEME - nechame komponentu aby to zpracovala
      console.log("Forbidden (403) - user lacks permission, NOT logging out");
      return false;
    }

    // Vsechny ostatni status kody (400, 404, 500, atd.) - NEJSOU problem s tokenem
    // Tyto chyby musi zpracovat komponenta sama (zobrazit error message, atd.)
    return false;
  };

  return (
    <UserContext.Provider value={{ user, token, setToken, login, tokenExpired, getUserInfo, logout }}>
      {children}
    </UserContext.Provider>
  );
};
