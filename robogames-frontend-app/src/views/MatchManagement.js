/**
* Renders the MatchManagement component, which displays a list of playgrounds for a selected competition year.
* The component fetches the available competition years and the playgrounds for the selected year.
* Users can click on a playground card to navigate to the playground detail page.
*/
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardHeader, CardBody, CardTitle,
  Row, Col
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { useAdmin } from "contexts/AdminContext";
import { t } from "translations/translate";

function MatchManagement() {
  const { selectedYear } = useAdmin();
  const [playgrounds, setPlaygrounds] = useState([]);
  const { tokenExpired } = useUser();
  const navigate = useNavigate();

  const fetchPlaygroundsForYear = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/playground/all`);
      if (tokenExpired(response.status)) { return; }

      const data = await response.json();
      if (response.ok && data.type === 'RESPONSE') {
        setPlaygrounds(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch playgrounds:', error);
    }
  };

  useEffect(() => {
    if (selectedYear) {
      fetchPlaygroundsForYear();
    }
  }, [selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCardClick = (id) => {
    navigate(`/admin/playground-detail?year=${selectedYear}&id=${id}`);
  };

  return (
    <div className="content">
      <Row>
        <Col xs="12">
          <Card>
            <CardHeader>
              <CardTitle tag="h4">{t("pgChoose")} {selectedYear && `(${selectedYear})`}</CardTitle>
            </CardHeader>
            <CardBody>
              <Row>
                {playgrounds.map(playground => (
                  <Col key={playground.id} sm="6" md="3" lg="3" className="mb-4 mr-4">
                    <div className='pg-card' onClick={() => handleCardClick(playground.id)} style={{ cursor: 'pointer', height: '200px', width: '200px', borderRadius: '50%' }}>
                      <div className="d-flex flex-column justify-content-center align-items-center h-100">
                        <h4>{playground.name}</h4>
                        <div>{t("pgDisc",{name: playground.disciplineName})}</div>
                        <div>{t("pgNum",{number: playground.number})}</div>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default MatchManagement;