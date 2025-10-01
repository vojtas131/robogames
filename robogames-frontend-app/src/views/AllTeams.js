import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Table,
  Row,
  Col,
} from "reactstrap";
import { useUser } from "contexts/UserContext";
import { t } from "translations/translate";

function AllTeams() {
  const [teams, setTeams] = useState([]);
  const { token, tokenExpired } = useUser();

  useEffect(() => {
    const fetchTeams = async () => {
      if (!token) {
        console.log(t("tokenNone"));
        return;
      }
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/all`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const json = await response.json();
        if (tokenExpired(response.status)) { return; }

        if (response.ok && json.type === 'RESPONSE') {
          setTeams(json.data);
        } else {
          console.error(t("teamLoadFail"), json);
        }
      } catch (error) {
        console.error(t("teamLoadError"), error);
      }
    };

    fetchTeams();
  }, []);

  return (
    <div className="content">
      <Row>
        <Col xs="12">
          <Card>
            <CardHeader>
              <CardTitle tag="h4">{t("teamTitle")}</CardTitle>
            </CardHeader>
            <CardBody>
              <Table responsive>
                <thead className="text-primary">
                  <tr>
                    <th>{t("id")}</th>
                    <th>{t("title")}</th>
                    <th>{t("leaderID")}</th>
                    <th>{t("members")}</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => (
                    <tr key={team.id}>
                      <td>{team.id}</td>
                      <td>{team.name}</td>
                      <td>{team.leaderID}</td>
                      <td>
                        {team.memberNames.map(member => `${member.name} ${member.surname}`).join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default AllTeams;
