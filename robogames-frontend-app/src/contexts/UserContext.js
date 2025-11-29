import React, { createContext, useContext, useState } from 'react';
import { t } from "translations/translate";

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

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


  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('roles');
    localStorage.removeItem('UserID');
    setUser(null);
    window.location.href = '/robogames/login';
  };

  // if token expired
  const tokenExpired = (response) => {
    if (response === 403 || response === 401) {
      console.log("Token expired");
      logout();
      return true;
    }
    return false;
  }

  return (
    <UserContext.Provider value={{ user, token, setToken, login, tokenExpired, getUserInfo }}>
      {children}
    </UserContext.Provider>
  );
};
