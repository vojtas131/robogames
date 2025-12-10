/**
* The `RobotConfirmation` component is responsible for displaying a list of robots and allowing the user to confirm or reject their registration.
* 
* The component fetches the list of competition years and the robots for the selected year. It allows the user to filter the robots by team name and provides buttons to confirm or reject the registration of each robot.
* 
* When the user clicks the confirm or reject button, the component sends a PUT request to the server to update the robot's registration status. Upon successful update, the component refreshes the list of robots to show the updated statuses.

*/
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardHeader, CardBody, CardTitle, Button,
  Dropdown, DropdownToggle, DropdownMenu, DropdownItem,
  Table, Row, Col, Input
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { t } from "translations/translate";

function RobotConfirmation() {
  const navigate = useNavigate();
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [robots, setRobots] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { token, tokenExpired } = useUser();

  useEffect(() => {
    fetchCompetitionYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchRobotsForYear(selectedYear);
    }
  }, [selectedYear]);

  const handleConfirmRegistration = async (robotId, confirmed) => {
    if (window.confirm(t("robotAction", { conf: confirmed ? t("confirm_lower") : t("remove_lower") }))) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/robot/confirmRegistration?id=${robotId}&confirmed=${confirmed}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          }
        });
        if (tokenExpired(response.status)) { return; }

        const data = await response.json();
        if (response.ok) {
          fetchRobotsForYear(selectedYear); // Refresh the list of robots to show updated statuses
        } else if (data.type === 'ERROR') {
          alert(t("dataError", { data: data.data }));
        } else {
          alert(t("robotUpdateFail", { message: data.message || t("unknownError") }));
        }
      } catch (error) {
        console.error('Error confirming the robot registration:', error);
        alert(t("robotConfirmError", { message: error.message || t("serverCommFail") }));
      }
    }
  };

  const fetchCompetitionYears = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/competition/all`);
      if (tokenExpired(response.status)) { return; }

      const data = await response.json();
      if (response.ok && data.type === 'RESPONSE') {
        setYears(data.data.map(item => item.year));
      }
    } catch (error) {
      console.error('Failed to fetch competition years:', error);
    }
  };

  const fetchRobotsForYear = async (year) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/robot/allForYear?year=${year}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });
      if (tokenExpired(response.status)) { return; }

      const data = await response.json();
      if (response.ok && data.type === 'RESPONSE') {
        setRobots(data.data);
      } else if (data.type === 'ERROR') {
        alert(t("dataError", { data: data.data }));
      } else {
        alert(t("robotFetchFail", { message: data.message || t("unknownError") }));
      }
    } catch (error) {
      console.error('Failed to fetch robots for year:', error);
      alert(t("robotFetchError", { message: error.message || t("serverCommFail") }));
    }
  };

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
  const filteredRobots = robots.filter(robot => robot.teamName.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="content">
      <Row>
        <Col xs="12">
          <Card>
            <CardHeader>
              <CardTitle tag="h4">{t("robotOverview")}</CardTitle>
              <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
                <DropdownToggle caret>
                  {selectedYear || t("chooseYear")}
                </DropdownToggle>
                <DropdownMenu>
                  {years.map(year => (
                    <DropdownItem key={year} onClick={() => setSelectedYear(year)}>
                      {year}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>
              <Input
                type="text"
                placeholder={t("findByTeam")}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '300px', marginTop: '15px' }}
              />
            </CardHeader>
            <CardBody>
              {robots.length > 0 ? (
                <Table responsive>
                  <thead>
                    <tr>
                      {/* <th>{t("id")}</th> */}
                      <th>{t("robotNum")}</th>
                      <th>{t("title")}</th>
                      <th>{t("confirmed")}</th>
                      <th>{t("category")}</th>
                      <th>{t("team")}</th>
                      <th>{t("discipline")}</th>
                      <th>{t("confirm")}</th>
                      <th>{t("profile")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRobots.map(robot => (
                      <tr key={robot.id}>
                        {/* <td>{robot.id}</td> */}
                        <td>{robot.number}</td>
                        <td>{robot.name}</td>
                        <td>{robot.confirmed ? t("yes") : t("no")}</td>
                        <td>{robot.category}</td>
                        <td>{robot.teamName}</td>
                        <td>{robot.diciplineName}</td>
                        <td>
                          {robot.diciplineName && (
                            <Button
                              color={robot.confirmed ? "warning" : "success"}
                              className="btn-icon btn-simple"
                              onClick={() => handleConfirmRegistration(robot.id, !robot.confirmed)}
                            >
                              <i className={robot.confirmed ? "tim-icons icon-simple-remove" : "tim-icons icon-check-2"} />
                            </Button>)}
                        </td>
                        <td>
                          <Button
                            color="info"
                            className="btn-icon btn-simple"
                            onClick={() => navigate(`/admin/robot-profile?id=${robot.id}`)}
                            title={t("showProfile")}
                          >
                            <i className="tim-icons icon-badge" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div>{t("noRobotsFoundYear")}</div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default RobotConfirmation;