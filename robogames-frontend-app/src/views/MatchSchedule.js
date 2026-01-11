import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { Card, CardBody, Row, Col, Badge, Button } from 'reactstrap';
import { t } from "translations/translate";
import { ThemeContext, themes } from "contexts/ThemeContext";

/**
 * MatchSchedule - Vyzvací systém pro roboty
 * Zobrazuje roboty, kteří se mají dostavit k zápasu (první ve frontě na každém hřišti)
 */
function MatchSchedule() {
    const [currentMatches, setCurrentMatches] = useState([]);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const ITEMS_PER_PAGE = 5;
    const isRefreshing = useRef(false);
    const lastMatchCount = useRef(0);
    const { theme } = useContext(ThemeContext);
    const isDarkTheme = theme === themes.dark;

    const fetchCurrentMatches = useCallback(async () => {
        isRefreshing.current = true;
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}module/orderManagement/currentMatches`);
            const data = await response.json();
            
            if (response.ok && data.type === 'RESPONSE') {
                const newMatches = data.data || [];
                const newTotalPages = Math.ceil(newMatches.length / ITEMS_PER_PAGE);
                
                // Pokud se změnil počet zápasů a aktuální stránka by byla mimo rozsah
                setCurrentPage(prev => {
                    if (newTotalPages === 0) return 0;
                    if (prev >= newTotalPages) return newTotalPages - 1;
                    return prev;
                });
                
                lastMatchCount.current = newMatches.length;
                setCurrentMatches(newMatches);
                setLastUpdate(new Date());
            }
        } catch (error) {
            console.error('Failed to fetch current matches:', error);
        } finally {
            isRefreshing.current = false;
        }
    }, []);

    useEffect(() => {
        fetchCurrentMatches();
        // Aktualizace každých 15 sekund
        const intervalId = setInterval(fetchCurrentMatches, 15000);
        return () => clearInterval(intervalId);
    }, [fetchCurrentMatches]);

    // Automatické přepínání stránek
    useEffect(() => {
        const totalPages = Math.ceil(currentMatches.length / ITEMS_PER_PAGE);
        
        if (totalPages <= 1) {
            return;
        }

        const rotateInterval = setInterval(() => {
            // Nepřepínat během refreshe
            if (isRefreshing.current) return;
            
            setCurrentPage(prev => {
                const currentTotal = Math.ceil(currentMatches.length / ITEMS_PER_PAGE);
                if (currentTotal <= 1) return 0;
                return (prev + 1) % currentTotal;
            });
        }, 5000); // Přepnutí každých 5 sekund

        return () => clearInterval(rotateInterval);
    }, [currentMatches.length]);

    // Toggle fullscreen
    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        
        // Skrytí/zobrazení navbar a sidebar
        const sidebar = document.querySelector('.sidebar');
        const mainPanel = document.querySelector('.main-panel');
        const navbar = document.querySelector('.navbar');
        
        if (!isFullscreen) {
            // Zapínáme fullscreen
            if (sidebar) sidebar.style.display = 'none';
            if (navbar) navbar.style.display = 'none';
            if (mainPanel) {
                mainPanel.style.width = '100%';
                mainPanel.style.marginLeft = '0';
            }
        } else {
            // Vypínáme fullscreen
            if (sidebar) sidebar.style.display = '';
            if (navbar) navbar.style.display = '';
            if (mainPanel) {
                mainPanel.style.width = '';
                mainPanel.style.marginLeft = '';
            }
        }
    };

    // Cleanup při unmount
    useEffect(() => {
        return () => {
            const sidebar = document.querySelector('.sidebar');
            const mainPanel = document.querySelector('.main-panel');
            const navbar = document.querySelector('.navbar');
            
            if (sidebar) sidebar.style.display = '';
            if (navbar) navbar.style.display = '';
            if (mainPanel) {
                mainPanel.style.width = '';
                mainPanel.style.marginLeft = '';
            }
        };
    }, []);

    const getCategoryLabel = (category) => {
        switch (category) {
            case 'LOW_AGE_CATEGORY': return t('pupils');
            case 'HIGH_AGE_CATEGORY': return t('students');
            default: return category || '-';
        }
    };

    const getMatchStateColor = (state) => {
        return state === 'REMATCH' ? '#fb6340' : '#f5365c';
    };

    const totalPages = Math.ceil(currentMatches.length / ITEMS_PER_PAGE);
    const paginatedMatches = currentMatches.slice(
        currentPage * ITEMS_PER_PAGE, 
        (currentPage + 1) * ITEMS_PER_PAGE
    );

    // Kontejner styly pro fullscreen
    const containerStyle = isFullscreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: isDarkTheme ? '#1e1e2f' : '#f5f6fa',
        padding: '20px',
        overflowY: 'auto',
        overflowX: 'hidden'
    } : {
        minHeight: 'calc(100vh - 200px)',
        paddingBottom: '50px'
    };

    return (
        <div className={`content ${isFullscreen ? 'fullscreen-content' : ''}`} style={containerStyle}>
            {/* Hlavička */}
            <Row className="mb-3">
                <Col>
                    <div className="d-flex align-items-center">
                        {/* Tlačítko maximalizace vlevo */}
                        <div className="mr-3">
                            <Button 
                                color="info" 
                                size="sm" 
                                onClick={toggleFullscreen}
                                title={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
                                style={{ padding: '8px 12px' }}
                            >
                                <i className={`fa ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} style={{ fontSize: '16px' }} />
                            </Button>
                        </div>
                        
                        {/* Titulek uprostřed */}
                        <div className="text-center flex-grow-1">
                            <h1 className={`text-warning mb-1 ${isFullscreen ? 'display-3' : 'display-4'}`}>
                                <i className="tim-icons icon-bell-55 mr-3" />
                                {t('matchCallSystem')}
                            </h1>
                            <p className="text-muted mb-0">
                                {t('matchCallSystemDesc')} 
                                <span className="ml-3">
                                    <i className="tim-icons icon-refresh-02 mr-1" />
                                    {lastUpdate.toLocaleTimeString()}
                                </span>
                                {totalPages > 1 && (
                                    <span className="ml-3">
                                        <Badge color="info">{currentPage + 1} / {totalPages}</Badge>
                                    </span>
                                )}
                            </p>
                        </div>
                        
                        {/* Prázdný prostor vpravo pro vycentrování */}
                        <div style={{ width: '52px' }}></div>
                    </div>
                </Col>
            </Row>

            {/* Výzvy */}
            {currentMatches.length === 0 ? (
                <Row>
                    <Col md={{ size: 6, offset: 3 }}>
                        <Card className="text-center">
                            <CardBody className="py-5">
                                <i className="tim-icons icon-time-alarm text-muted mb-3" style={{ fontSize: '64px' }} />
                                <h3>{t('noActiveMatches')}</h3>
                                <p className="text-muted mb-0">{t('noActiveMatchesDesc')}</p>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            ) : (
                <div 
                    className="matches-carousel" 
                    style={isFullscreen ? { 
                        display: 'flex', 
                        flexDirection: 'column',
                        justifyContent: 'center',
                        minHeight: 'calc(100vh - 180px)'
                    } : {}}
                >
                    <Row className="justify-content-center align-items-start">
                        {paginatedMatches.map((match, idx) => {
                            const stateColor = getMatchStateColor(match.state?.name);
                            const isRematch = match.state?.name === 'REMATCH';
                            
                            return (
                                <Col 
                                    style={{ 
                                        flex: '0 0 20%', 
                                        maxWidth: '20%',
                                        animation: 'fadeIn 0.5s ease-in-out',
                                        animationDelay: `${idx * 0.1}s`,
                                        animationFillMode: 'both'
                                    }}
                                    key={`${match.id}-${idx}`} 
                                    className="mb-3 px-2"
                                >
                                    <Card 
                                        className="match-call-card"
                                        style={{
                                            border: `4px solid ${stateColor}`,
                                            borderRadius: '20px',
                                            overflow: 'hidden',
                                            background: `linear-gradient(135deg, rgba(30,30,47,1) 0%, rgba(30,30,47,0.95) 100%)`,
                                            boxShadow: `0 10px 40px rgba(0,0,0,0.3), 0 0 20px ${stateColor}40`
                                        }}
                                    >
                                        {/* Header - Hřiště */}
                                        <div 
                                            className="text-center py-2 px-3"
                                            style={{ 
                                                background: stateColor,
                                                color: 'white'
                                            }}
                                        >
                                            <div className="d-flex justify-content-between align-items-center">
                                                <span className="font-weight-bold" style={{ fontSize: '14px' }}>
                                                    {match.playgroundName || 'Hřiště'}
                                                </span>
                                                <span style={{ fontSize: '20px', fontWeight: '800' }}>
                                                    #{match.playgroundNumber || 0}
                                                </span>
                                            </div>
                                        </div>

                                        <CardBody className="text-center py-2 px-2">
                                            {/* Číslo robota - největší */}
                                            <div 
                                                style={{ 
                                                    fontSize: isFullscreen ? '72px' : '56px', 
                                                    fontWeight: '900',
                                                    lineHeight: '1',
                                                    color: stateColor,
                                                    textShadow: `0 0 30px ${stateColor}60`
                                                }}
                                            >
                                                {match.robotNumber || '?'}
                                            </div>

                                            {/* Název robota */}
                                            <h3 
                                                className="mb-2 font-weight-bold text-white" 
                                                style={{ 
                                                    fontSize: isFullscreen ? '16px' : '14px',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '1px'
                                                }}
                                            >
                                                {match.robotName || 'Robot'}
                                            </h3>

                                            {/* Tým - zvýrazněný */}
                                            <div 
                                                className="text-center mb-2 py-1 px-2" 
                                                style={{ 
                                                    background: 'rgba(255,255,255,0.1)',
                                                    borderRadius: '8px'
                                                }}
                                            >
                                                <span className="text-warning font-weight-bold" style={{ fontSize: '15px' }}>
                                                    <i className="tim-icons icon-single-02 mr-1" />
                                                    {match.teamName || '-'}
                                                </span>
                                            </div>

                                            {/* Info grid */}
                                            <div className="match-info-grid mt-2">

                                                {/* Disciplína */}
                                                <div className="info-row mb-1">
                                                    <span className="info-label text-muted">
                                                        <i className="tim-icons icon-trophy mr-1" />
                                                        {t('discipline')}:
                                                    </span>
                                                    <Badge color="warning" style={{ fontSize: '11px' }}>
                                                        {match.disciplineName || '-'}
                                                    </Badge>
                                                </div>

                                                {/* Kategorie */}
                                                <div className="info-row">
                                                    <span className="info-label text-muted">
                                                        <i className="tim-icons icon-badge mr-1" />
                                                        {t('category')}:
                                                    </span>
                                                    <Badge color="info" style={{ fontSize: '11px' }}>
                                                        {getCategoryLabel(match.category)}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardBody>

                                        {/* Footer - stav zápasu */}
                                        {isRematch && (
                                            <div 
                                                className="text-center py-2"
                                                style={{ 
                                                    background: 'rgba(251, 99, 64, 0.2)',
                                                    borderTop: `2px solid ${stateColor}`
                                                }}
                                            >
                                                <Badge 
                                                    style={{ 
                                                        background: stateColor,
                                                        fontSize: '14px',
                                                        padding: '8px 20px'
                                                    }}
                                                >
                                                    <i className="tim-icons icon-refresh-02 mr-1" />
                                                    {t('matchRematch')}
                                                </Badge>
                                            </div>
                                        )}
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>

                    {/* Pagination dots */}
                    {totalPages > 1 && (
                        <div className="text-center mt-3">
                            {[...Array(totalPages)].map((_, i) => (
                                <span 
                                    key={i}
                                    onClick={() => setCurrentPage(i)}
                                    style={{
                                        display: 'inline-block',
                                        width: currentPage === i ? '30px' : '12px',
                                        height: '12px',
                                        borderRadius: '6px',
                                        background: currentPage === i ? '#f5365c' : 'rgba(255,255,255,0.3)',
                                        margin: '0 5px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Legenda */}
            <Row className="mt-4 mb-4">
                <Col>
                    <div className="text-center">
                        <span className="mr-4">
                            <span style={{ 
                                display: 'inline-block', 
                                width: '20px', 
                                height: '20px', 
                                background: '#f5365c',
                                borderRadius: '4px',
                                marginRight: '8px',
                                verticalAlign: 'middle'
                            }}></span>
                            {t('matchWaiting')}
                        </span>
                        <span>
                            <span style={{ 
                                display: 'inline-block', 
                                width: '20px', 
                                height: '20px', 
                                background: '#fb6340',
                                borderRadius: '4px',
                                marginRight: '8px',
                                verticalAlign: 'middle'
                            }}></span>
                            {t('matchRematch')}
                        </span>
                    </div>
                </Col>
            </Row>

            <style>{`
                .match-call-card {
                    transition: all 0.3s ease;
                }
                .match-call-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 15px 50px rgba(0,0,0,0.4), 0 0 30px rgba(245, 54, 92, 0.3) !important;
                }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 5px 0;
                }
                .info-label {
                    font-size: 11px;
                }
                .info-value {
                    font-size: 12px;
                }
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .fullscreen-content {
                    animation: fadeIn 0.3s ease;
                }
            `}</style>
        </div>
    );
}

export default MatchSchedule;
