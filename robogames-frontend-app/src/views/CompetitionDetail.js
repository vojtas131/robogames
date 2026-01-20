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
  Badge,
  Spinner
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
  const [loading, setLoading] = useState(true);
  const { token, tokenExpired } = useUser();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/competition/allRegistrations?year=${year}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tokenExpired(response.status)) { return; }

        const data = await response.json();
        if (data.type === "RESPONSE") {
          setRegistrations(data.data);
        } else {
          console.error(t("dataFetchFail"));
        }
      } catch (error) {
        console.error(t("dataFetchError"), error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [year, token, tokenExpired]);

  // Statistics
  const totalTeams = registrations.length;
  const lowAgeTeams = registrations.filter(r => r.category === 'LOW_AGE_CATEGORY').length;
  const highAgeTeams = registrations.filter(r => r.category === 'HIGH_AGE_CATEGORY').length;


  return (
    <div className="content">
      <Row>
        <Col xs="12">
          <Card>
            <CardHeader>
              <CardTitle tag="h4">{t("registeredTeams", { year })}</CardTitle>
            </CardHeader>
            <CardBody>
              {/* Statistics */}
              <Row className="mb-4">
                <Col md="4">
                  <div className="text-center p-3" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <h3 className="mb-0">{totalTeams}</h3>
                    <small className="text-muted">{t('totalTeams') || 'Celkem týmů'}</small>
                  </div>
                </Col>
                <Col md="4">
                  <div className="text-center p-3" style={{ background: 'rgba(29, 140, 248, 0.1)', borderRadius: '8px' }}>
                    <h3 className="mb-0 text-info">{lowAgeTeams}</h3>
                    <small className="text-muted">{t('pupils') || 'Žáci'}</small>
                  </div>
                </Col>
                <Col md="4">
                  <div className="text-center p-3" style={{ background: 'rgba(0, 242, 195, 0.1)', borderRadius: '8px' }}>
                    <h3 className="mb-0 text-success">{highAgeTeams}</h3>
                    <small className="text-muted">{t('students') || 'Studenti'}</small>
                  </div>
                </Col>
              </Row>

              {/* Table */}
              {loading ? (
                <div className="text-center py-5">
                  <Spinner color="primary" />
                </div>
              ) : registrations.length === 0 ? (
                <div className="text-center py-4 text-muted">{t("noRegsFound")}</div>
              ) : (
                <>
                  <Table responsive hover className="table-management">
                    <thead>
                      <tr>
                        <th>{t("teamName")}</th>
                        <th>{t("category")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrations
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map(reg => (
                          <tr key={reg.id}>
                            <td><strong>{reg.teamName}</strong></td>
                            <td>
                              <Badge color={reg.category === 'HIGH_AGE_CATEGORY' ? 'success' : 'info'}>
                                {reg.category === 'HIGH_AGE_CATEGORY' ? t("students") :
                                 reg.category === 'LOW_AGE_CATEGORY' ? t("pupils") :
                                 reg.category}
                              </Badge>
                            </td>
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
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default CompetitionDetail;
