import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Table,
  Row,
  Col,
  Button,
  Input,
  InputGroup,
  InputGroupText,
  Badge,
  Spinner
} from 'reactstrap';
import { useUser } from 'contexts/UserContext';
import { useToast } from 'contexts/ToastContext';
import { t } from 'translations/translate';

/**
 * BrowseTeams - Stránka pro uživatele bez týmu k procházení existujících týmů
 * a posílání žádostí o vstup
 */
function BrowseTeams() {
  const { token, tokenExpired } = useUser();
  const toast = useToast();
  
  const [teams, setTeams] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(null);

  // Načtení seznamu týmů a mých žádostí
  useEffect(() => {
    if (!token) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Načti všechny týmy
        const teamsResponse = await fetch(`${process.env.REACT_APP_API_URL}api/team/allNames`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tokenExpired(teamsResponse.status)) return;
        
        if (teamsResponse.ok) {
          const teamsResult = await teamsResponse.json();
          setTeams(Array.isArray(teamsResult.data) ? teamsResult.data : []);
        }

        // Načti moje žádosti
        const requestsResponse = await fetch(`${process.env.REACT_APP_API_URL}api/team/myJoinRequests`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tokenExpired(requestsResponse.status)) return;
        
        if (requestsResponse.ok) {
          const requestsResult = await requestsResponse.json();
          setMyRequests(Array.isArray(requestsResult.data) ? requestsResult.data : []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error(t("loadingFailed") || "Nepodařilo se načíst data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Odeslat žádost o vstup do týmu
  const sendJoinRequest = async (teamId) => {
    setSendingRequest(teamId);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/joinRequest?teamId=${teamId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (tokenExpired(response.status)) return;

      const result = await response.json();
      if (result.data === "success") {
        toast.success(t("joinRequestSent") || "Žádost o vstup byla odeslána");
        // Znovu načti moje žádosti
        const requestsResponse = await fetch(`${process.env.REACT_APP_API_URL}api/team/myJoinRequests`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (requestsResponse.ok) {
          const requestsResult = await requestsResponse.json();
          setMyRequests(Array.isArray(requestsResult.data) ? requestsResult.data : []);
        }
      } else if (result.data && result.data.includes("already sent")) {
        toast.warning(t("joinRequestAlreadySent") || "Už jste poslali žádost do tohoto týmu");
      } else if (result.data && result.data.includes("team is full")) {
        toast.error(t("teamFull") || "Tým je plný");
      } else if (result.data && result.data.includes("already a member")) {
        toast.warning(t("alreadyInTeam") || "Už jste členem týmu");
      } else {
        toast.error(result.data || t("somethingFailed") || "Něco se pokazilo");
      }
    } catch (error) {
      console.error('Error sending join request:', error);
      toast.error(t("somethingFailed") || "Něco se pokazilo");
    } finally {
      setSendingRequest(null);
    }
  };

  // Zrušit žádost o vstup
  const cancelJoinRequest = async (requestId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/cancelJoinRequest?id=${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (tokenExpired(response.status)) return;

      const result = await response.json();
      if (result.data === "success") {
        toast.success(t("joinRequestCanceled") || "Žádost byla zrušena");
        setMyRequests(prev => prev.filter(r => r.id !== requestId));
      } else {
        toast.error(result.data || t("somethingFailed") || "Něco se pokazilo");
      }
    } catch (error) {
      console.error('Error canceling join request:', error);
      toast.error(t("somethingFailed") || "Něco se pokazilo");
    }
  };

  // Filtrovat týmy podle vyhledávání
  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Zjistit, zda už uživatel poslal žádost do daného týmu
  const hasRequestForTeam = (teamId) => {
    return myRequests.some(req => req.teamId === teamId);
  };

  // Formátování data
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="content">
        <Row className="justify-content-center">
          <Col md="6" className="text-center">
            <Spinner color="primary" />
            <p className="mt-2">{t("loading")}</p>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div className="content">
      {/* Moje odeslané žádosti */}
      {myRequests.length > 0 && (
        <Row>
          <Col md="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h4">
                  <i className="tim-icons icon-send mr-2" />
                  {t("myJoinRequests") || "Moje žádosti o vstup"}
                </CardTitle>
              </CardHeader>
              <CardBody>
                <Table responsive>
                  <thead className="text-primary">
                    <tr>
                      <th>{t("team")}</th>
                      <th>{t("sentAt") || "Odesláno"}</th>
                      <th className="text-right">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.map(request => (
                      <tr key={request.id}>
                        <td>
                          <strong>{request.teamName}</strong>
                        </td>
                        <td>
                          <small className="text-muted">
                            {formatDate(request.createdAt)}
                          </small>
                        </td>
                        <td className="text-right">
                          <Button
                            color="danger"
                            size="sm"
                            onClick={() => cancelJoinRequest(request.id)}
                            title={t("cancelRequest") || "Zrušit žádost"}
                          >
                            <i className="tim-icons icon-simple-remove" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      {/* Seznam týmů */}
      <Row>
        <Col md="12">
          <Card>
            <CardHeader>
              <Row className="align-items-center">
                <Col>
                  <CardTitle tag="h4">
                    <i className="tim-icons icon-molecule-40 mr-2" />
                    {t("browseTeams") || "Procházet týmy"}
                  </CardTitle>
                </Col>
                <Col md="4">
                  <InputGroup>
                    <InputGroupText>
                      <i className="tim-icons icon-zoom-split" />
                    </InputGroupText>
                    <Input
                      placeholder={t("searchTeam") || "Hledat tým..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Col>
              </Row>
            </CardHeader>
            <CardBody>
              {filteredTeams.length === 0 ? (
                <div className="text-center py-4">
                  <i className="tim-icons icon-molecule-40" style={{ fontSize: '48px', opacity: 0.5 }} />
                  <p className="mt-3 text-muted">
                    {searchTerm 
                      ? (t("noTeamsFound") || "Žádné týmy nebyly nalezeny")
                      : (t("noTeamsExist") || "Zatím neexistují žádné týmy")}
                  </p>
                </div>
              ) : (
                <Table responsive>
                  <thead className="text-primary">
                    <tr>
                      <th>{t("teamName")}</th>
                      <th>{t("membersShort") || "Členů"}</th>
                      <th className="text-right">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeams.map(team => (
                      <tr key={team.id}>
                        <td>
                          <strong>{team.name}</strong>
                        </td>
                        <td>
                          <Badge color={team.memberCount >= 4 ? 'danger' : 'info'}>
                            {team.memberCount}/4
                          </Badge>
                        </td>
                        <td className="text-right">
                          {hasRequestForTeam(team.id) ? (
                            <Badge color="warning">
                              <i className="tim-icons icon-time-alarm mr-1" />
                              {t("requestPending") || "Čeká na schválení"}
                            </Badge>
                          ) : team.memberCount >= 4 ? (
                            <Badge color="secondary">
                              {t("teamFull") || "Tým je plný"}
                            </Badge>
                          ) : (
                            <Button
                              color="success"
                              size="sm"
                              onClick={() => sendJoinRequest(team.id)}
                              disabled={sendingRequest === team.id}
                            >
                              {sendingRequest === team.id ? (
                                <Spinner size="sm" />
                              ) : (
                                <>
                                  <i className="tim-icons icon-send mr-1" />
                                  {t("sendJoinRequest") || "Poslat žádost"}
                                </>
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default BrowseTeams;
