/**
* The `AdminNavbar` component is the top navigation bar showing the brand/page title.
* User menu and notifications have been moved to AdminBreadcrumb component.
*/
import React, { useState, useEffect, useContext } from "react";
import classNames from "classnames";
import {
  Collapse,
  NavbarBrand,
  Navbar,
  Nav,
  Container,
  NavbarToggler,
} from "reactstrap";
import { ThemeContext, themes } from "contexts/ThemeContext";

function AdminNavbar(props) {
  const [collapseOpen, setCollapseOpen] = useState(false);
  const [color, setColor] = useState("navbar-transparent");

  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    window.addEventListener("resize", updateColor);
    return () => {
      window.removeEventListener("resize", updateColor);
    };
  }, []);

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

  return (
    <Navbar className={classNames("navbar-absolute", color)} expand="lg">
      <Container fluid>
        <div className="navbar-wrapper">
          <div className={classNames("navbar-toggle d-inline")}>
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
            {/* User menu and notifications moved to AdminBreadcrumb */}
          </Nav>
        </Collapse>
      </Container>
    </Navbar>
  );
}

export default AdminNavbar;