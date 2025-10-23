/**
* The `AdminNavbar` component is the main navigation bar for the admin interface of the application. It handles the following functionality:
* - Displays the user's name and profile picture in a dropdown menu
* - Displays any pending team invitations the user has, with options to accept or reject them
* - Provides a logout button to sign the user out of the application
* - Toggles the visibility of the navigation menu on smaller screens
* - Provides a search modal that can be opened and closed
*
* The component uses various React and Reactstrap components to implement its functionality, and it fetches user information and team invitations from the backend API.
*/
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import classNames from "classnames";
import {
  Button,
  Collapse,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  Input,
  InputGroup,
  NavbarBrand,
  Navbar,
  NavLink,
  Nav,
  Container,
  Modal,
  NavbarToggler,
  ModalHeader,
  UncontrolledButtonDropdown,
} from "reactstrap";
import { useUser } from "contexts/UserContext";
import { ThemeContext, themes } from "contexts/ThemeContext";
import { t } from "translations/translate";

function AdminNavbar(props) {
  const navigate = useNavigate();
  const [collapseOpen, setCollapseOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState(false);
  const [color, setColor] = useState("navbar-transparent");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: '', surname: '' });
  const [invitations, setInvitations] = useState([]);

  const { theme } = useContext(ThemeContext);
  const { token, tokenExpired } = useUser();

  useEffect(() => {
    setIsLoggedIn(!!token);
    if (!token) { return; }

    fetchUserInfo().then(() => {
      fetchInvitations();
    });

    window.addEventListener("resize", updateColor);
    return () => {
      window.removeEventListener("resize", updateColor);
    };
  }, []);

  // Fetch user information
  const fetchUserInfo = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/user/info`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (tokenExpired(response.status)) { return; }

      if (response.ok) {
        const result = await response.json();
        setUserInfo({ name: result.data.name, surname: result.data.surname });
      } else {
        console.error('Failed to fetch user information:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching user information:', error);
    }
  };

  // Fetch team invitations for the user
  const fetchInvitations = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/user/getTeamInvitations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      tokenExpired(response.status);

      if (response.ok) {
        const result = await response.json();
        setInvitations(result.data);
      } else {
        console.error('Failed to fetch team invitations:', response.statusText);
        return;
      }
    } catch (error) {
      console.error('Error fetching team invitations:', error);
    }
  };

  // Accept a team invitation
  const acceptInvitation = async (invitationId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/acceptInvitation?id=${invitationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      if (response.ok) {
        console.log('Invitation accepted:', result);
      } else {
        console.error('Failed to accept invitation:', result.message);
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  };

  // Reject a team invitation
  const rejectInvitation = async (invitationId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/rejectInvitation?id=${invitationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      if (response.ok) {
        console.log('Invitation rejected:', result);
      } else {
        console.error('Failed to reject invitation:', result.message);
      }
    } catch (error) {
      console.error('Error rejecting invitation:', error);
    }
  };



  // Update the color of the navbar based on screen size and collapse state
  const updateColor = () => {
    if (window.innerWidth < 993 && collapseOpen) {
      setColor(theme === themes.dark ? "bg-dark" : "bg-white");
    } else {
      setColor("navbar-transparent");
    }
  };

  // Toggle the collapse state of the navbar
  const toggleCollapse = () => {
    if (!collapseOpen) {
      setColor(theme === themes.dark ? "bg-dark" : "bg-white");
    } else {
      setColor("navbar-transparent");
    }
    setCollapseOpen(!collapseOpen);
  };

  // Toggle the visibility of the search modal
  const toggleModalSearch = () => {
    setModalSearch(!modalSearch);
  };

  // Handle user logout
  const handleLogout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('roles');
    localStorage.removeItem('UserID');
    setIsLoggedIn(false);
    navigate('/robogames/login');
  };

  return (
    <>
      <Navbar className={classNames("navbar-absolute", color)} expand="lg">
        <Container fluid>
          <div className="navbar-wrapper">
            <div className={classNames("navbar-toggle d-inline")}> { /*toggled: props.sidebarOpened */}
              <NavbarToggler onClick={props.toggleSidebar}>
                <span className="navbar-toggler-bar bar1" />
                <span className="navbar-toggler-bar bar2" />
                <span className="navbar-toggler-bar bar3" />
              </NavbarToggler>
            </div>

            <NavbarBrand href="#" onClick={(e) => e.preventDefault()}>
              {props.brandText}
            </NavbarBrand>
          </div>
          <NavbarToggler onClick={toggleCollapse}>
            <span className="navbar-toggler-bar navbar-kebab" />
            <span className="navbar-toggler-bar navbar-kebab" />
            <span className="navbar-toggler-bar navbar-kebab" />
          </NavbarToggler>
          <Collapse navbar isOpen={collapseOpen}>
            <Nav className="ml-auto" navbar>
              {isLoggedIn ? (
                <>
                  <UncontrolledDropdown nav>
                    <DropdownToggle caret color="default" nav>
                      <i className="tim-icons icon-bell-55" />
                      <p className="d-lg-none">{t("notification")}</p>
                    </DropdownToggle>
                    <DropdownMenu style={{ color: 'black' }} right>
                      {invitations.length === 0 && (
                        <DropdownItem>{t("notifHere")}</DropdownItem>
                      )}

                      {invitations.map(invitation => (
                        <DropdownItem key={invitation.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <i className="tim-icons icon-alert-circle-exc" />
                            <div color="danger" style={{ paddingTop: '5px' }} >
                              {t("inviteFrom")}
                              <span className="green-text">
                                {invitation.teamName}</span>
                            </div>
                          </div>

                          <div>
                            <Button className="button-accept" color="link" size="sm" style={{ marginRight: '5px' }} onClick={() => acceptInvitation(invitation.id)}>
                              <i className="tim-icons icon-check-2" />
                            </Button>
                            <Button className="button-reject" color="link" size="sm" onClick={() => rejectInvitation(invitation.id)}>
                              <i className="tim-icons icon-simple-remove" />
                            </Button>
                          </div>
                        </DropdownItem>
                      ))}

                    </DropdownMenu>
                  </UncontrolledDropdown>

                  {/* <UncontrolledDropdown nav></UncontrolledDropdown> */}

                  <UncontrolledDropdown nav>
                    <DropdownToggle caret color="default" nav>
                      <div className="photo">
                        <img alt="..." src={require("assets/img/profile-picture.png")} />
                      </div>
                      <span className="ml-2">{userInfo.name} {userInfo.surname}</span>
                    </DropdownToggle>

                    <DropdownMenu right>
                      <DropdownItem onClick={() => navigate('/admin/user-profile')}>{t("myProfile")}</DropdownItem>
                      <DropdownItem onClick={() => navigate('/admin/my-team')}>{t("myTeam")}</DropdownItem>
                      <DropdownItem divider />
                      <DropdownItem onClick={handleLogout}>{t("logOut")}</DropdownItem>
                    </DropdownMenu>
                  </UncontrolledDropdown>
                </>
              ) : (
                <NavLink tag="li" className="nav-item">
                  <Button color="primary" onClick={() => navigate('/robogames/login')}>
                    {t("logIn")}
                  </Button>
                </NavLink>
              )}
            </Nav>
          </Collapse>
        </Container>
      </Navbar>
      <Modal modalClassName="modal-search" isOpen={modalSearch} toggle={toggleModalSearch}>
        <ModalHeader>
          <Input placeholder={t("search_caps")} type="text" />
          <button aria-label="Close" className="close" onClick={toggleModalSearch}>
            <i className="tim-icons icon-simple-remove" />
          </button>
        </ModalHeader>
      </Modal>
    </>
  );
}

export default AdminNavbar;