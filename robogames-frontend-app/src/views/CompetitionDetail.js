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
import TablePagination from "components/TablePagination";

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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

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
                    {/* <th>{t("id")}</th> */}
                    {/* <th>{t("teamID")}</th> */}
                    <th>{t("teamName")}</th>

                    <th>{t("category")}</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map(reg => (
                    <tr key={reg.id}>
                      {/* <td>{reg.id}</td> */}
                      {/* <td>{reg.teamID}</td> */}
                      <td>{reg.teamName}</td>

                      <td>{reg.category}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <TablePagination
                currentPage={currentPage}
                totalItems={registrations.length}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
                onItemsPerPageChange={(items) => {
                  setItemsPerPage(items);
                  setCurrentPage(1);
                }}
              />
              {registrations.length === 0 && <div>{t("noRegsFound")}</div>}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default CompetitionDetail;
