/**
* Renders the MatchManagement component, which displays a list of playgrounds for a selected competition year.
* The component fetches the available competition years and the playgrounds for the selected year.
* Users can click on a playground card to navigate to the playground detail page.
*/
import { number } from 'prop-types';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardHeader, CardBody, CardTitle, Button,
  Dropdown, DropdownToggle, DropdownMenu, DropdownItem,
  Row, Col
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { t } from "translations/translate";

function MatchManagement() {
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [playgrounds, setPlaygrounds] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { tokenExpired } = useUser();
  const navigate = useNavigate(); // initialize the navigate function

  useEffect(() => {
    fetchCompetitionYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchPlaygroundsForYear(selectedYear);
    }
  }, [selectedYear]);

  const fetchCompetitionYears = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/competition/all`);
      if (tokenExpired(response.status)) { return; }

      const data = await response.json();
      if (response.ok && data.type === 'RESPONSE') {
        setYears(data.data.filter(item => item.started).map(item => item.year));
      }
    } catch (error) {
      console.error('Failed to fetch competition years:', error);
    }
  };

  const fetchPlaygroundsForYear = async (year) => {
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

  const handleCardClick = (id) => {
    // navigate to the playground detail page with year and id in query params
    navigate(`/admin/playground-detail?year=${selectedYear}&id=${id}`);
  };

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  return (
    <div className="content">
      <Row>
        <Col xs="12">
          <Card>
            <CardHeader>
              <CardTitle tag="h4">{t("pgChoose")}</CardTitle>
              <hr></hr>
              <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
                <DropdownToggle caret>
                  {selectedYear || t("selectYear")}
                </DropdownToggle>
                <DropdownMenu>
                  {years.map(year => (
                    <DropdownItem key={year} onClick={() => setSelectedYear(year)}>
                      {year}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>
            </CardHeader>
            <CardBody>
              <Row>
                {playgrounds.map(playground => (
                  <Col key={playground.id} sm="6" md="3" lg="3" className="mb-4 mr-4">
                    <div className='pg-card' onClick={() => handleCardClick(playground.id)} style={{ cursor: 'pointer', height: '200px', width: '200px', borderRadius: '50%' }}>
                      <div className="d-flex flex-column justify-content-center align-items-center h-100">
                        {/* <div>{t("pgID",{id: playground.number})}</div> */}
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