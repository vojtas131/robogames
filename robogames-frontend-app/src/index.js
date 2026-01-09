/*!
=========================================================
* Black Dashboard React v1.2.2
=========================================================

* Product Page: https://www.creative-tim.com/product/black-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)
* Licensed under MIT (https://github.com/creativetimofficial/black-dashboard-react/blob/master/LICENSE.md)

* Coded by Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";

import AdminLayout from "layouts/Admin/Admin.js";
import LoginLayout from "layouts/LoginLayout.js";
import { UserProvider } from 'contexts/UserContext';
import { AdminProvider } from 'contexts/AdminContext';
import { ToastProvider } from 'contexts/ToastContext';
import { ConfirmProvider } from 'components/ConfirmModal';
import ToastContainer from 'components/Toast/Toast';

import "assets/scss/black-dashboard-react.scss";
import "assets/css/nucleo-icons.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

import ThemeContextWrapper from "./components/ThemeWrapper/ThemeWrapper";
import BackgroundColorWrapper from "./components/BackgroundColorWrapper/BackgroundColorWrapper";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <ThemeContextWrapper>
    <BackgroundColorWrapper>
      <BrowserRouter>
        <UserProvider>
          <AdminProvider>
            <ToastProvider>
              <ConfirmProvider>
                <Routes>
                  <Route path="/admin/*" element={<AdminLayout />} />
                  <Route path="/robogames/*" element={<LoginLayout />} />
                  <Route
                    path="*"
                    element={<Navigate to="/admin/dashboard" replace />}
                  />
                </Routes>
                <ToastContainer />
              </ConfirmProvider>
            </ToastProvider>
          </AdminProvider>
        </UserProvider>
      </BrowserRouter>
    </BackgroundColorWrapper>
  </ThemeContextWrapper>
);
