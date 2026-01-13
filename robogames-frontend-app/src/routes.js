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
import Dashboard from "views/Dashboard.js";

import TableList from "views/TableList.js";

import UserProfile from "views/UserProfile.js";
// import Login from "views/Login.js";
// import Register from "views/Register.js";
import UserManagement from "views/UserManagement";
import AdminDashboard from "views/AdminDashboard";
import CompetitionManagement from "views/CompetitionManagement";
import CompetitionDetail from "views/CompetitionDetail";
import MyTeam from "views/MyTeam";
import CompetitionRegistration from "views/CompetitionRegistration";
import RobotRegistration from "views/RobotRegistration";
import PlaygroundManagement from "views/PlaygroundManagement";
import RobotConfirmation from "views/RobotConfirmation";
import RobotProfile from "views/RobotProfile";
import MatchManagement from "views/MatchManagement";
import MatchScoreEntry from "views/MatchScoreEntry";
import PlaygroundDetail from "views/PlaygroundDetail";
import CompetitionResults from "views/CompetitionResults";
import Contact from "views/Contact";
import Rules from "views/Rules";
import AuthCallback from "components/KeyCloak/KeyCloak";
import TeamManagement from "views/TeamManagement";
import RegistrationManagement from "views/RegistrationManagement";
import MatchSchedule from "views/MatchSchedule";
import MatchGroup from "views/MatchGroup";
import PlaygroundMatches from "views/PlaygroundMatches";
import Generate from "views/Generate.js";
import { t } from "translations/translate";


var routes = [
  {
    path: "/admin-dashboard",
    name: t("adminMenu"),
    rtlName: "",
    icon: "tim-icons icon-settings-gear-63",
    component: <AdminDashboard />,
    layout: "/admin",
  },
  {
    path: "/dashboard",
    name: t("home"),
    rtlName: "",
    icon: "tim-icons icon-app",
    component: <Dashboard />,
    layout: "/admin",
  },
  {
    path: "/user-profile",
    name: t("myProfile"),
    rtlName: "",
    icon: "tim-icons icon-single-02",
    component: <UserProfile />,
    layout: "/admin",
  },
  {
    path: "/my-team",
    name: t("myTeam"),
    rtlName: "",
    icon: "tim-icons icon-molecule-40",
    component: <MyTeam />,
    layout: "/admin",
  },
  {
    path: "/match-management",
    name: t("matchManagement"),
    rtlName: "",
    icon: "tim-icons icon-controller",
    component: <MatchManagement />,
    layout: "/admin",
  },
  {
    path: "/disciplines",
    name: t("disc"),
    rtlName: "",
    icon: "tim-icons icon-components",
    component: <TableList />,
    layout: "/admin",
  },
  {
    path: "/competition-results",
    name: t("result"),
    rtlName: "",
    icon: "tim-icons icon-book-bookmark",
    component: <CompetitionResults />,
    layout: "/admin",
  },
  {
    path: "/match-schedule",
    name: t("matchSchedule"),
    rtlName: "",
    icon: "tim-icons icon-time-alarm",
    component: <MatchSchedule />,
    layout: "/admin",
  },
  {
    path: "/rules",
    name: t("rule"),
    rtlName: "",
    icon: "tim-icons icon-bulb-63",
    component: <Rules />,
    layout: "/admin",
  },
  {
    path: "/contact-us",
    name: t("contact"),
    rtlName: "",
    icon: "tim-icons icon-chat-33",
    component: <Contact />,
    layout: "/admin",
  },
  {
    path: "/user-management",
    name: t("manageUser"),
    rtlName: "",
    icon: "tim-icons icon-single-02",
    component: <UserManagement />,
    layout: "/admin",
  },
  {
    path: "/competition-management",
    name: t("manageComps"),
    rtlName: "",
    icon: "tim-icons icon-single-02",
    component: <CompetitionManagement />,
    layout: "/admin",
  },

  {
    path: "/competition-detail",
    name: t("particips"),
    rtlName: "",
    icon: "tim-icons icon-molecule-40",
    component: <CompetitionDetail />,
    layout: "/admin",
  },
  {
    path: "/competition-registration",
    name: t("compTeamRegister"),
    rtlName: "",
    icon: "tim-icons icon-molecule-40",
    component: <CompetitionRegistration />,
    layout: "/admin",
  },
  {
    path: "/robot-registration",
    name: t("robotRegistration"),
    rtlName: "",
    icon: "tim-icons icon-molecule-40",
    component: <RobotRegistration />,
    layout: "/admin",
  },
  {
    path: "/playground-management",
    name: t("managePg"),
    rtlName: "",
    icon: "tim-icons icon-molecule-40",
    component: <PlaygroundManagement />,
    layout: "/admin",
  },
  {
    path: "/robot-confirmation",
    name: t("robotConf"),
    rtlName: "",
    icon: "tim-icons icon-molecule-40",
    component: <RobotConfirmation />,
    layout: "/admin",
  },
  {
    path: "/team-management",
    name: t("teamManagement"),
    rtlName: "",
    icon: "tim-icons icon-molecule-40",
    component: <TeamManagement />,
    layout: "/admin",
  },
  {
    path: "/registration-management",
    name: t("registrationManagement"),
    rtlName: "",
    icon: "tim-icons icon-paper",
    component: <RegistrationManagement />,
    layout: "/admin",
  },
  {
    path: "/robot-profile",
    name: t("robotProfile"),
    rtlName: "",
    icon: "tim-icons icon-settings",
    component: <RobotProfile />,
    layout: "/admin",
  },
  {
    path: "/playground-detail",
    name: t("robotConf"),
    rtlName: "",
    icon: "tim-icons icon-molecule-40",
    component: <PlaygroundDetail />,
    layout: "/admin",
  },
  {
    path: "/match-score/:matchId",
    name: t("scoreEntry"),
    rtlName: "",
    icon: "tim-icons icon-pencil",
    component: <MatchScoreEntry />,
    layout: "/admin",
  },
  {
    path: "/match-group/:groupName",
    name: t("matchGroup"),
    rtlName: "",
    icon: "tim-icons icon-components",
    component: <MatchGroup />,
    layout: "/admin",
  },
  {
    path: "/playground-matches/:playgroundId",
    name: t("playgroundMatches"),
    rtlName: "",
    icon: "tim-icons icon-square-pin",
    component: <PlaygroundMatches />,
    layout: "/admin",
    hidden: true,
  },
  {
    path: "/auth/callback",
    name: "Auth Callback",
    component: <AuthCallback />,
    layout: "/admin",
  },
  {
    path: "/generate",
    name: t("generate"),  // prepozíčny text z translations
    rtlName: "",
    icon: "tim-icons icon-puzzle-10",
    component: <Generate />,
    layout: "/admin",
    hidden: true,
  }

];
export default routes;