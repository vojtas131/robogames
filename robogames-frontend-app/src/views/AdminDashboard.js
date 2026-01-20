import React, { useContext } from "react";
import {
  Card,
  CardTitle,
  CardBody,
  Row,
  Col
} from "reactstrap";
import { useNavigate } from "react-router-dom";
import { t } from "translations/translate";
import { ThemeContext, themes } from "contexts/ThemeContext";

/**
* Renders the admin dashboard component, which displays a set of cards for managing various aspects of the application.
* The cards include options for user management, competition management, team management, playground management, and robot confirmation.
* Each card is clickable and navigates the user to the corresponding admin management page.
*/
function AdminDashboard() {
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const isDark = theme === themes.dark;

  const handleNavigate = (path) => {
    navigate(path);
  };

  const rolesString = localStorage.getItem('roles'); // Get the roles string from localStorage
  const rolesArray = rolesString ? rolesString.split(', ') : []; // Split the roles string into an array or use an empty array if no roles exist

  // Definice admin karet s kategoriemi
  const adminSections = [
    {
      title: t("dataManagement"),
      cards: [
        {
          path: '/admin/user-management', icon: 'icon-single-02', label: t("manageUser"), color: '#5e72e4',
          roles: ['ADMIN', 'LEADER']
        },
        {
          path: '/admin/team-management', icon: 'icon-molecule-40', label: t("teamManagement"), color: '#2dce89',
          roles: ['LEADER', 'ASSISTANT', 'ADMIN']
        },
        {
          path: '/admin/registration-management', icon: 'icon-paper', label: t("registrationManagement"), color: '#fb6340',
          roles: ['LEADER', 'ASSISTANT', 'ADMIN']
        },
        {
          path: '/admin/robot-management', icon: 'icon-spaceship', label: t("robotManagement"), color: '#f5365c',
          roles: ['LEADER', 'ASSISTANT', 'ADMIN']
        },
      ]
    },
    {
      title: t("competitionManagementTitle"),
      cards: [
        {
          path: '/admin/competition-management', icon: 'icon-trophy', label: t("manageComp"), color: '#ffd600',
          roles: ['LEADER', 'ADMIN']
        },
        {
          path: '/admin/playground-management', icon: 'icon-app', label: t("managePg"), color: '#11cdef',
          roles: ['LEADER', 'ASSISTANT', 'ADMIN']
        },
        {
          path: '/admin/match-management', icon: 'icon-controller', label: t("matchManagement") || "Správa zápasů", color: '#8965e0',
          roles: ['LEADER', 'ASSISTANT', 'ADMIN']
        },
      ]
    },
    {
      title: t("tools"),
      cards: [
        {
          path: '/admin/tournament-generator', icon: 'icon-trophy', label: t("tournamentGenerator") || "Generování turnaje", color: '#fc5603', description: t("tournamentGeneratorDesc") || "Generování skupin a pavouka pro turnajové disciplíny",
          roles: ['LEADER', 'ADMIN']
        },
        {
          path: "/admin/diploma-template",
          icon: "icon-paper",
          label: t("diplomaTemplate") || "Šablona diplomu",
          color: "#11cdef",
        },
      ]
    }
  ];

  const filteredAdminSections = adminSections
    .map(section => ({
      ...section,
      cards: section.cards.filter(card =>
        !card.roles || card.roles.some(role => rolesArray.includes(role))
      )
    }))
    .filter(section => section.cards.length > 0); // remove sections without cards

  const cardStyle = {
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    borderRadius: '12px',
    overflow: 'hidden',
    height: '100%',
    minHeight: '140px',
  };

  const cardHoverStyle = (e, entering) => {
    e.currentTarget.style.transform = entering ? 'translateY(-5px)' : 'translateY(0)';
    e.currentTarget.style.boxShadow = entering
      ? '0 15px 35px rgba(0,0,0,0.2)'
      : '0 5px 15px rgba(0,0,0,0.1)';
  };

  return (
    <div className="content">
      {filteredAdminSections.map((section, sectionIdx) => (
        <div key={sectionIdx} className="mb-5">
          <h4 className={`mb-4 ${isDark ? 'text-white' : 'text-dark'}`} style={{
            borderBottom: `2px solid ${isDark ? '#525f7f' : '#e9ecef'}`,
            paddingBottom: '10px',
            fontWeight: '600'
          }}>
            {section.title}
          </h4>
          <Row>
            {section.cards.map((card, cardIdx) => (
              <Col lg="3" md="4" sm="6" className="mb-4" key={cardIdx}>
                <Card
                  onClick={() => handleNavigate(card.path)}
                  style={{
                    ...cardStyle,
                    background: isDark
                      ? `linear-gradient(135deg, ${card.color}22 0%, ${card.color}44 100%)`
                      : `linear-gradient(135deg, ${card.color}15 0%, ${card.color}30 100%)`,
                    border: `1px solid ${card.color}55`,
                  }}
                  className="text-white"
                  onMouseEnter={(e) => cardHoverStyle(e, true)}
                  onMouseLeave={(e) => cardHoverStyle(e, false)}
                >
                  <CardBody className="d-flex flex-column justify-content-center align-items-center text-center p-4">
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: card.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '15px',
                      boxShadow: `0 4px 15px ${card.color}66`
                    }}>
                      <i className={`tim-icons ${card.icon}`} style={{ fontSize: '24px', color: 'white' }} />
                    </div>
                    <CardTitle tag="h5" style={{
                      fontSize: '1.1em',
                      fontWeight: '600',
                      color: isDark ? 'white' : '#32325d',
                      marginBottom: card.description ? '8px' : '0'
                    }}>
                      {card.label}
                    </CardTitle>
                    {card.description && (
                      <p style={{
                        fontSize: '0.85em',
                        color: isDark ? '#a0aec0' : '#8898aa',
                        margin: 0,
                        lineHeight: '1.4'
                      }}>
                        {card.description}
                      </p>
                    )}
                  </CardBody>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ))}
    </div>
  );
}

export default AdminDashboard;