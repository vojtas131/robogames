import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Table,
  Row,
  Col,
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { t } from "translations/translate";

// Custom hook to parse query parameters
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

/**
* Renders the competition detail view, displaying a table of registered teams for a given year.
*
* @returns {JSX.Element} The competition detail view component.
*/
function CompetitionDetail() {
  const query = useQuery();
  const year = query.get('year');
  const [registrations, setRegistrations] = useState([]);
  const { tokenExpired } = useUser();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/competition/allRegistrations?year=${year}`);
        if (tokenExpired(response.status)) { return; }

        const data = await response.json();
        if (data.type === "RESPONSE") {
          setRegistrations(data.data);
        } else {
          console.error(t("dataFetchFail"));
        }
      } catch (error) {
        console.error(t("dataFetchError"), error);
      }
    };
    fetchData();
  }, [year]);


  return (
    <div className="content">
      <Row>
        <Col xs="12">
          <Card>
            <CardHeader>
              <CardTitle tag="h4">{t("registeredTeams", { year })}</CardTitle>
            </CardHeader>
            <CardBody>
              <Table responsive>
                <thead className="text-primary">
                  <tr>
                    <th>{t("id")}</th>
                    <th>{t("teamID")}</th>
                    <th>{t("teamName")}</th>

                    <th>{t("category")}</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map(reg => (
                    <tr key={reg.id}>
                      <td>{reg.id}</td>
                      <td>{reg.teamID}</td>
                      <td>{reg.teamName}</td>

                      <td>{reg.category}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {registrations.length === 0 && <div>{t("noRegsFound")}</div>}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default CompetitionDetail;
