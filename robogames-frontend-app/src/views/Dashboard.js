import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, CardTitle, Button, Row, Col, CardFooter } from 'reactstrap';
import { useNavigate } from 'react-router-dom';
import abbLogo from '../assets/img/abb-logo.png';
import zfLogo from '../assets/img/ZF-logo.png';
import nxpLogo from '../assets/img/nxp-logo.png';
import blogicLogo from '../assets/img/blogic-logo.png';
import continentalLogo from '../assets/img/continental-logo.jpeg';
import kyndrylLogo from '../assets/img/kyndryl-logo.png';
import ruzovkaLogo from '../assets/img/ruzovka-logo.jpeg';
import nestleLogo from '../assets/img/nestle-logo.png';
import itcLogo from '../assets/img/itc-logo.jpeg';
import totLogo from '../assets/img/tot-logo.png';

import { useUser } from "contexts/UserContext";
import { t } from "translations/translate";

function Dashboard() {
    const [competitions, setCompetitions] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const { token } = useUser();

    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

    useEffect(() => {
        setIsLoggedIn(!!token);

        fetch(`${process.env.REACT_APP_API_URL}api/competition/all`)
            .then(response => response.json())
            .then(data => {
                if (data.type === 'RESPONSE') {
                    const futureCompetitions = data.data
                        .filter(comp => comp.year >= currentYear);
                    setCompetitions(futureCompetitions);
                }
            })
            .catch(error => console.error('Error fetching competition data:', error));
    }, []);

    // Function to format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    };

    return (
        <div className="content">
            <Row>
                <Col md="12">
                    <Card>
                        <CardHeader>
                            <CardTitle tag="h1">{t("homeWelcome")}</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <p>{t("homeP1")}</p>
                            <p>{t("homeP2")}</p>
                            <p>{t("homeP3")}</p>
                        </CardBody>
                    </Card>
                </Col>
            </Row>
            <Row>
                {competitions.map((comp, index) => (
                    <Col md="6" key={index} style={{ marginBottom: '20px' }}>
                        <Card>
                            <CardHeader className="bg-primary">
                                <CardTitle tag="h4" className='font-weight-normal' style={{ color: 'white' }}>{t("homeCompTitle", { year: comp.year })}</CardTitle>
                            </CardHeader>
                            <CardBody>
                                <h4 className='red-text' style={{ fontSize: '25px' }}>{t("homeDate", { date: formatDate(comp.date) })}</h4>

                                <p>{t("homeStart", { time: comp.startTime })}</p>
                                <p>{t("homeEnd", { time: comp.endTime })}</p>
                            </CardBody>
                            {!comp.started && (
                                <CardFooter>
                                    <Button color="success" onClick={() => navigate(isLoggedIn ? '/admin/my-team' : '/robogames/login')}>
                                        {t("register")}
                                    </Button>
                                </CardFooter>
                            )}
                            {comp.started && (
                                <CardFooter>
                                    <Button color="primary" onClick={() => navigate('/admin/competition-results')}>
                                        {t("results")}
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    </Col>
                ))}
            </Row>
            <Row>
                <Col md="12">
                    <Card>
                        <CardHeader>
                            <CardTitle tag="h4">{t("sponsors")}</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <Row>
                                <Col md="6" className="logo-box"><img src={abbLogo} alt="ABB" /></Col>
                                <Col md="6" className="logo-box"><img src={zfLogo} alt="ZF" /></Col>
                                <Col md="6" className="logo-box"><img src={kyndrylLogo} alt="Kyndryl" /></Col>
                                <Col md="6" className="logo-box"><img src={blogicLogo} alt="BLogic" /></Col>
                                <Col md="6" className="logo-box"><img src={continentalLogo} alt="Continental" /></Col>
                                <Col md="6" className="logo-box"><img src={nxpLogo} alt="NXP" /></Col>
                                <Col md="6" className="logo-box"><img src={ruzovkaLogo} alt="Ruzovka" /></Col>
                                <Col md="6" className="logo-box"><img src={totLogo} alt="TOT" /></Col>
                                <Col md="6" className="logo-box"><img src={itcLogo} alt="ITC" /></Col>
                                <Col md="6" className="logo-box"><img src={nestleLogo} alt="Nestle" /></Col>
                            </Row>
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default Dashboard;