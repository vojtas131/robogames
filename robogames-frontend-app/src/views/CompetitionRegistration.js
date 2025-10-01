/**
* Renders the competition registration page, allowing users to view available competitions, register for them, and manage their robot registrations.
* 
* The component fetches the list of competitions and the user's registrations from the API, and displays them in a card-based layout.
* Users can register for a competition, unregister from a competition, and manage their robot registrations for a competition.
* 
* The component uses several helper functions to format the date and time of the competitions, and to handle the registration and unregistration processes.
*/
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Button,
  Row,
  Col,
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { t } from "translations/translate";

function CompetitionRegistration() {
  const [competitions, setCompetitions] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { token, tokenExpired } = useUser();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(date);
  };

  const formatTime = (timeString) => {
    return timeString.substr(0, 5);
  };

  const handleManageRobots = (year) => {
    // navigate to the robot registration page with the competition year as a query parameter
    navigate(`/admin/robot-registration?year=${year}`);
  };
  const unregisterTeam = async (year) => {
    const confirmUnregistration = window.confirm(t("unreg"));
    if (!confirmUnregistration) {
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/teamRegistration/unregister?year=${year}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (tokenExpired(response.status)) { return; }

      const data = await response.json();
      if (response.ok) {
        if (data.type === 'Error') {
          alert(t("dataError",{data: data.data}));
        } else {


          window.location.reload();

        }
      } else {
        console.error('Failed to unregister team:', data);
        alert(t("unregFail",{message: data.message || t("unknownError")}));
      }
    } catch (error) {
      console.error('Error unregistering team:', error);
      alert(t("unregError"));
    }
  };

  const registerTeam = async (year) => {
    // ask user for confirmation before registering
    const confirmRegistration = window.confirm(t("regConfirm"));
    if (!confirmRegistration) {
      return;
    }

    const requestBody = {
      year: year,
      open: false
    };

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/teamRegistration/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      if (tokenExpired(response.status)) { return; }

      const data = await response.json();
      if (response.ok) {
        if (data.type === 'Error') {
          alert(t("dataError",{data: data.data})); // display error message from the server
        } else {
          alert(t("regSuccess"));
          window.location.reload();

        }
      } else {
        console.error('Failed to register team:', data);
        alert(t("regFail",{message: data.message || t("unknownError")}));
      }
    } catch (error) {
      console.error('Error registering team:', error);
      alert(t("regTeamError"));
    }
  };


  useEffect(() => {
    const fetchCompetitions = async () => {
      setIsLoading(true);

      console.log("token: ",token)
      try {
        const responses = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}api/competition/all`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${process.env.REACT_APP_API_URL}api/teamRegistration/all`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);

        console.log("responses: ", responses[1]);

        const [competitionsData, registrationsData] = await Promise.all(responses.map(res => res.json()));
        // if (tokenExpired(responses.status)) { return; }

        if (responses[0].ok && responses[1].ok) {
          setCompetitions(competitionsData.data);
          setRegistrations(registrationsData.data);
        } else {
          console.error('Failed to fetch data:', competitionsData, registrationsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      setIsLoading(false);
    };

    fetchCompetitions();
  }, []);

  return (
    <div className="content">
      <Row>
        <Col xs="12">
          <Card>
            <CardHeader>
              <CardTitle tag="h2">{t("compsAvailable")}</CardTitle>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <p>{t("loading")}</p>
              ) : (
                competitions.map((competition) => {
                  const isRegistered = registrations.some(reg => reg.compatitionYear === competition.year);
                  const competitionDate = new Date(competition.date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  return (
                    <Card key={competition.id} style={{ border: '1px solid lightgray' }}>

                      <CardHeader>
                        <CardTitle tag="h3">{t("robogamesYear",{year: competition.year})}</CardTitle>
                        <hr></hr>
                      </CardHeader>
                      <CardBody>
                        <p>{t("compDate_colon")} <span style={{ color: '#f20000', fontWeight: 'bold', fontSize: '18px' }}>{formatDate(competition.date)}</span></p>
                        <p>{t("start_colon")}<span style={{ color: 'green', fontWeight: 'bold' }}>{formatTime(competition.startTime)}</span></p>
                        <p>{t("endExpect")}<span style={{ color: 'green', fontWeight: 'bold' }}>{formatTime(competition.endTime)}</span></p>
                        {competition.started ? (
                          <p style={{ color: '#f20000', fontWeight: 'bold' }}>{t("regImpossible")}</p>
                        ) : isRegistered ? (
                          <>
                            <p style={{ color: 'green', fontWeight: 'bold' }}>{t("robotRegPossible")}</p>

                            <Button color="info" onClick={() => handleManageRobots(competition.year)}>
                              <i className="tim-icons icon-double-right" />
                                {t("manageRobots")}
                              <i className="tim-icons icon-double-left" />
                            </Button>

                            <Button color="danger" onClick={() => unregisterTeam(competition.year)}>
                              {t("regCancel")}
                            </Button>

                          </>
                        ) : (
                          <Button color="success" onClick={() => registerTeam(competition.year)}>
                            {t("register")}
                          </Button>
                        )}
                      </CardBody>
                    </Card>
                  );
                })
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default CompetitionRegistration;