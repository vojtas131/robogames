import React, { useState, useEffect, useContext } from 'react';
import { Card, CardHeader, CardBody, CardTitle, Button, Row, Col, CardFooter, Badge, Alert } from 'reactstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import robogamesLogo from '../assets/img/robogames-logo.png';

import { loginWithKeycloak } from "../components/KeyCloak/KeyCloak";
import { useUser } from "contexts/UserContext";
import { ThemeContext, themes } from "contexts/ThemeContext";
import { useToast } from "contexts/ToastContext";
import { t } from "translations/translate";

function Dashboard() {
    const [competitions, setCompetitions] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [hasTeam, setHasTeam] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showBannedAlert, setShowBannedAlert] = useState(false);
    const { token } = useUser();
    const { theme } = useContext(ThemeContext);
    const toast = useToast();
    const isDark = theme === themes.dark;

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentYear = new Date().getFullYear();

    // Check for banned parameter
    useEffect(() => {
        if (searchParams.get('banned') === 'true') {
            setShowBannedAlert(true);
            // Remove the parameter from URL
            searchParams.delete('banned');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        setIsLoggedIn(!!token);
        setLoading(true);

        const fetchCompetitions = fetch(`${process.env.REACT_APP_API_URL}api/competition/all`)
            .then(response => response.json())
            .then(data => {
                if (data.type === 'RESPONSE') {
                    const futureCompetitions = data.data
                        .filter(comp => comp.year >= currentYear);
                    setCompetitions(futureCompetitions);
                }
            })
            .catch(error => console.error('Error fetching competition data:', error));

        // Check if user has a team
        const fetchTeam = token
            ? fetch(`${process.env.REACT_APP_API_URL}api/team/myTeam`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(response => response.json())
                .then(data => {
                    setHasTeam(data.type === 'RESPONSE' && data.data !== null);
                })
                .catch(() => setHasTeam(false))
            : Promise.resolve();

        Promise.all([fetchCompetitions, fetchTeam]).finally(() => setLoading(false));
    }, [token]);

    // Handle register to competition click
    const handleRegisterClick = () => {
        if (!isLoggedIn) {
            loginWithKeycloak();
            return;
        }
        if (!hasTeam) {
            toast.addToast(t("noTeamError"), 'danger');
            return;
        }
        navigate('/admin/competition-registration');
    };

    // Function to format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    };

    // Theme-aware colors
    const colors = {
        primary: '#ef6000',
        primaryLight: '#ff8533',
        primaryDark: '#cc5200',
        cardBg: isDark ? '#27293d' : '#ffffff',
        cardBorder: isDark ? '#2b3553' : '#e9ecef',
        textPrimary: isDark ? '#ffffff' : '#344675',
        textSecondary: isDark ? 'rgba(255,255,255,0.6)' : '#8898aa',
        heroBg: isDark 
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
            : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        heroAccent: 'linear-gradient(135deg, #ef6000 0%, #ff8533 100%)',
        stepBg: isDark ? 'rgba(239, 96, 0, 0.1)' : 'rgba(239, 96, 0, 0.08)',
    };

    const guideSteps = [
        {
            number: 1,
            icon: "tim-icons icon-single-02",
            titleKey: "guideStep1Title",
            descKey: "guideStep1Desc",
        },
        {
            number: 2,
            icon: "tim-icons icon-molecule-40",
            titleKey: "guideStep2Title",
            descKey: "guideStep2Desc",
        },
        {
            number: 3,
            icon: "tim-icons icon-paper",
            titleKey: "guideStep3Title",
            descKey: "guideStep3Desc",
        },
        {
            number: 4,
            icon: "tim-icons icon-calendar-60",
            titleKey: "guideStep4Title",
            descKey: "guideStep4Desc",
        },
        {
            number: 5,
            icon: "tim-icons icon-settings-gear-63",
            titleKey: "guideStep5Title",
            descKey: "guideStep5Desc",
        }
    ];

    if (loading) {
        return (
            <div className="content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner-border" style={{ color: '#ef6000', width: '3rem', height: '3rem' }} role="status">
                        <span className="sr-only">{t("loading")}</span>
                    </div>
                    <p style={{ marginTop: '1rem', color: isDark ? '#ffffff' : '#344675' }}>{t("loading")}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="content">
            {/* Banned Alert */}
            {showBannedAlert && (
                <Alert color="danger" isOpen={showBannedAlert} toggle={() => setShowBannedAlert(false)} style={{ marginBottom: '20px' }}>
                    <h4 className="alert-heading" style={{ marginBottom: '10px' }}>
                        <i className="fa-solid fa-ban" style={{ marginRight: '10px' }}></i>
                        {t("accountBannedTitle")}
                    </h4>
                    <p style={{ marginBottom: '0' }}>{t("userBanned")}</p>
                </Alert>
            )}

            {/* Hero Section */}
            <Row>
                <Col md="12">
                    <Card style={{ 
                        background: colors.heroBg,
                        border: `2px solid ${colors.primary}`,
                        borderRadius: '12px',
                        overflow: 'hidden'
                    }}>
                        <CardBody className="py-5">
                            <Row className="align-items-center">
                                <Col lg="8" className="text-center text-lg-left">
                                    <div className="d-inline-block px-3 py-1 mb-3" style={{
                                        background: colors.heroAccent,
                                        borderRadius: '20px'
                                    }}>
                                        <small className="text-white font-weight-bold">🤖 ROBOGAMES</small>
                                    </div>
                                    <h1 className="mb-3" style={{ 
                                        fontSize: '2.2rem', 
                                        fontWeight: 700,
                                        color: colors.textPrimary
                                    }}>
                                        {t("homeWelcome")}
                                    </h1>
                                    <p className="mb-4" style={{ 
                                        fontSize: '1.05rem', 
                                        color: colors.textSecondary,
                                        maxWidth: '600px'
                                    }}>
                                        {t("homeP1")}
                                    </p>
                                    <div className="d-flex flex-wrap justify-content-center justify-content-lg-start" style={{ gap: '0.75rem' }}>
                                        {!isLoggedIn ? (
                                            <Button 
                                                style={{
                                                    background: colors.heroAccent,
                                                    border: 'none',
                                                    borderRadius: '25px',
                                                    padding: '12px 28px'
                                                }}
                                                onClick={() => loginWithKeycloak()}
                                            >
                                                <i className="tim-icons icon-key-25 mr-2" />
                                                {t("login")} / {t("register")}
                                            </Button>
                                        ) : (
                                            <Button 
                                                style={{
                                                    background: colors.heroAccent,
                                                    border: 'none',
                                                    borderRadius: '25px',
                                                    padding: '12px 28px'
                                                }}
                                                onClick={handleRegisterClick}
                                            >
                                                <i className="tim-icons icon-trophy mr-2" />
                                                {t("registerToCompetition")}
                                            </Button>
                                        )}
                                        <Button 
                                            outline
                                            style={{
                                                borderColor: colors.primary,
                                                color: colors.primary,
                                                borderRadius: '25px',
                                                padding: '12px 28px'
                                            }}
                                            href="https://www.robogames.utb.cz"
                                            target="_blank"
                                        >
                                            <i className="tim-icons icon-world mr-2" />
                                            {t("mainWebsite")}
                                        </Button>
                                    </div>
                                </Col>
                                <Col lg="4" className="text-center mt-4 mt-lg-0">
                                    <img 
                                        src={robogamesLogo} 
                                        alt="Robogames Logo" 
                                        style={{
                                            maxWidth: '200px',
                                            width: '100%',
                                            height: 'auto'
                                        }}
                                    />
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* About Section */}
            <Row className="mb-4">
                <Col md="12">
                    <Card style={{ background: colors.cardBg, borderColor: colors.cardBorder }}>
                        <CardBody>
                            <Row className="align-items-center">
                                <Col md="8">
                                    <h3 className="mb-3" style={{ color: colors.textPrimary }}>
                                        <i className="tim-icons icon-bulb-63 mr-2" style={{ color: colors.primary }} />
                                        {t("aboutRobogames")}
                                    </h3>
                                    <p className="mb-0" style={{ 
                                        lineHeight: '1.8',
                                        color: colors.textSecondary
                                    }}>
                                        {t("homeP3")}
                                    </p>
                                </Col>
                                <Col md="4" className="text-center mt-3 mt-md-0">
                                    <div style={{ 
                                        fontSize: '3.5rem', 
                                        fontWeight: 700,
                                        color: colors.primary
                                    }}>
                                        2017
                                    </div>
                                    <p className="mb-0" style={{ color: colors.textSecondary }}>{t("sinceYear")}</p>
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Competitions Section */}
            {competitions.length > 0 && (
                <>
                    <Row className="mb-3">
                        <Col md="12">
                            <h2 className="mb-0" style={{ color: colors.textPrimary }}>
                                <i className="tim-icons icon-calendar-60 mr-2" style={{ color: colors.primary }} />
                                {t("upcomingCompetitions")}
                            </h2>
                        </Col>
                    </Row>
                    <Row className="mb-4">
                        {competitions.map((comp, index) => (
                            <Col lg="6" key={index} className="mb-4">
                                <Card className="h-100" style={{ 
                                    background: colors.cardBg,
                                    border: `2px solid ${colors.primary}`,
                                    borderRadius: '12px'
                                }}>
                                    <CardHeader style={{ 
                                        background: colors.heroAccent,
                                        borderRadius: '10px 10px 0 0'
                                    }}>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <CardTitle tag="h3" className="mb-0 text-white font-weight-bold">
                                                🏆 ROBOGAMES {comp.year}
                                            </CardTitle>
                                            <Badge 
                                                style={{ 
                                                    background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.25)',
                                                    color: 'white'
                                                }} 
                                                className="px-3 py-2"
                                            >
                                                {comp.started ? t("inProgress") : t("registrationOpen")}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardBody>
                                        <div className="d-flex align-items-center mb-3">
                                            <div className="mr-3" style={{ 
                                                width: '50px', 
                                                height: '50px', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                background: colors.stepBg,
                                                borderRadius: '50%'
                                            }}>
                                                <i className="tim-icons icon-calendar-60" style={{ fontSize: '1.5rem', color: colors.primary }} />
                                            </div>
                                            <div>
                                                <small style={{ color: colors.textSecondary }} className="d-block">{t("date")}</small>
                                                <span className="font-weight-bold" style={{ fontSize: '1.25rem', color: colors.textPrimary }}>
                                                    {formatDate(comp.date)}
                                                </span>
                                            </div>
                                        </div>
                                        <Row>
                                            <Col xs="6">
                                                <div className="d-flex align-items-center">
                                                    <i className="tim-icons icon-watch-time mr-2" style={{ color: '#2dce89' }} />
                                                    <div>
                                                        <small style={{ color: colors.textSecondary }} className="d-block">{t("start")}</small>
                                                        <span className="font-weight-bold" style={{ color: colors.textPrimary }}>{comp.startTime}</span>
                                                    </div>
                                                </div>
                                            </Col>
                                            <Col xs="6">
                                                <div className="d-flex align-items-center">
                                                    <i className="tim-icons icon-time-alarm mr-2" style={{ color: '#ff003c' }} />
                                                    <div>
                                                        <small style={{ color: colors.textSecondary }} className="d-block">{t("end")}</small>
                                                        <span className="font-weight-bold" style={{ color: colors.textPrimary }}>{comp.endTime}</span>
                                                    </div>
                                                </div>
                                            </Col>
                                        </Row>
                                    </CardBody>
                                    <CardFooter className="border-0 pt-0">
                                        {!comp.started ? (
                                            <Button 
                                                block 
                                                style={{
                                                    background: colors.heroAccent,
                                                    border: 'none',
                                                    borderRadius: '25px'
                                                }}
                                                onClick={handleRegisterClick}
                                            >
                                                <i className="tim-icons icon-trophy mr-2" />
                                                {t("registerNow")}
                                            </Button>
                                        ) : (
                                            <Button 
                                                block 
                                                outline
                                                style={{
                                                    borderColor: colors.primary,
                                                    color: colors.primary,
                                                    borderRadius: '25px'
                                                }}
                                                onClick={() => navigate('/admin/competition-results')}
                                            >
                                                <i className="tim-icons icon-chart-bar-32 mr-2" />
                                                {t("viewResults")}
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </>
            )}

            {/* How to Register Guide */}
            <Row className="mb-3">
                <Col md="12">
                    <h2 className="mb-1" style={{ color: colors.textPrimary }}>
                        <i className="tim-icons icon-compass-05 mr-2" style={{ color: colors.primary }} />
                        {t("howToRegister")}
                    </h2>
                    <p style={{ color: colors.textSecondary }}>{t("howToRegisterDesc")}</p>
                </Col>
            </Row>
            <Row className="mb-4">
                {guideSteps.map((step, index) => (
                    <Col lg="4" md="6" key={index} className="mb-4">
                        <Card className="h-100" style={{ 
                            background: colors.cardBg,
                            borderColor: colors.cardBorder,
                            transition: 'transform 0.2s, box-shadow 0.2s'
                        }}>
                            <CardBody className="text-center py-4">
                                <div className="position-relative mb-4 d-inline-block">
                                    <div 
                                        className="d-flex align-items-center justify-content-center"
                                        style={{ 
                                            width: '70px', 
                                            height: '70px',
                                            background: colors.stepBg,
                                            borderRadius: '50%',
                                            margin: '0 auto'
                                        }}
                                    >
                                        <i className={step.icon} style={{ fontSize: '1.75rem', color: colors.primary }} />
                                    </div>
                                    <div 
                                        style={{ 
                                            position: 'absolute',
                                            top: '-5px', 
                                            right: '-10px',
                                            borderRadius: '50%',
                                            width: '28px',
                                            height: '28px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.85rem',
                                            fontWeight: 700,
                                            background: colors.heroAccent,
                                            color: 'white'
                                        }}
                                    >
                                        {step.number}
                                    </div>
                                </div>
                                <h4 className="mb-2" style={{ color: colors.textPrimary }}>{t(step.titleKey)}</h4>
                                <p className="mb-0" style={{ fontSize: '0.95rem', color: colors.textSecondary }}>
                                    {t(step.descKey)}
                                </p>
                            </CardBody>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Quick Start Button */}
            <Row className="mb-5">
                <Col md="12" className="text-center">
                    <Card style={{ 
                        background: colors.heroAccent,
                        border: 'none',
                        borderRadius: '12px'
                    }}>
                        <CardBody className="py-4">
                            <h3 className="text-white mb-2">{t("readyToStart")}</h3>
                            <p className="mb-4" style={{ color: 'rgba(255,255,255,0.8)' }}>{t("readyToStartDesc")}</p>
                            {!isLoggedIn ? (
                                <Button 
                                    size="lg" 
                                    style={{
                                        background: isDark ? '#27293d' : '#ffffff',
                                        color: colors.primary,
                                        border: 'none',
                                        borderRadius: '25px',
                                        padding: '12px 32px',
                                        fontWeight: 600
                                    }}
                                    onClick={() => loginWithKeycloak()}
                                >
                                    <i className="tim-icons icon-spaceship mr-2" />
                                    {t("getStarted")}
                                </Button>
                            ) : (
                                <Button 
                                    size="lg" 
                                    style={{
                                        background: isDark ? '#27293d' : '#ffffff',
                                        color: colors.primary,
                                        border: 'none',
                                        borderRadius: '25px',
                                        padding: '12px 32px',
                                        fontWeight: 600
                                    }}
                                    onClick={() => navigate('/admin/my-team')}
                                >
                                    <i className="tim-icons icon-spaceship mr-2" />
                                    {t("goToMyTeam")}
                                </Button>
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default Dashboard;