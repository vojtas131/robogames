import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card, CardHeader, CardBody, CardTitle, CardFooter,
    Row, Col, Button, Form, FormGroup, Label, Input,
    Badge, Spinner, Alert
} from 'reactstrap';
import { t } from "translations/translate";
import { useUser } from "contexts/UserContext";
import { useToast } from "contexts/ToastContext";

/**
 * MatchScoreEntry - View for referees to enter match scores
 * Accepts match ID from URL parameter
 * Supports both single-robot matches (only scoreA) and two-robot matches (scoreA and scoreB)
 */
function MatchScoreEntry() {
    const { matchId } = useParams();
    const navigate = useNavigate();
    const { token, tokenExpired } = useUser();
    const toast = useToast();

    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const [scoreA, setScoreA] = useState('');
    const [scoreB, setScoreB] = useState('');

    // Fetch match details
    const fetchMatch = useCallback(async () => {
        if (!matchId) {
            setError(t('matchIdNotProvided') || 'ID zápasu nebylo poskytnuto');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/match/getByID?id=${matchId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            if (tokenExpired(response.status)) return;
            const data = await response.json();

            if (response.ok && data.type === 'RESPONSE') {
                setMatch(data.data);
                // Pre-fill existing scores if any
                if (data.data.scoreA !== null) {
                    setScoreA(data.data.scoreA.toString());
                }
                if (data.data.scoreB !== null) {
                    setScoreB(data.data.scoreB.toString());
                }
            } else {
                setError(data.message || t('matchLoadFailed') || 'Nepodařilo se načíst zápas');
            }
        } catch (err) {
            setError(t('matchFetchError') || 'Chyba při načítání dat zápasu');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [matchId, token, tokenExpired]);

    useEffect(() => {
        fetchMatch();
    }, [fetchMatch]);

    // Submit score
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Check if at least one robot is assigned
        if (!match.robotAID && !match.robotBID) {
            toast.error(t('noRobotAssigned') || 'Není přiřazen žádný robot');
            return;
        }

        if (!scoreA && scoreA !== '0') {
            toast.error(t('scoreARequired') || 'Skóre A je povinné');
            return;
        }

        // For two-robot matches, scoreB is required
        const isTwoRobotMatch = match.robotAID && match.robotBID;
        if (isTwoRobotMatch && !scoreB && scoreB !== '0') {
            toast.error(t('scoreBRequired') || 'Skóre B je povinné');
            return;
        }

        setSubmitting(true);

        try {
            const requestBody = {
                matchID: parseInt(matchId),
                scoreA: parseFloat(scoreA),
                scoreB: isTwoRobotMatch ? parseFloat(scoreB) : null
            };

            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/match/writeScore`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(requestBody)
                }
            );
            const data = await response.json();

            if (response.ok && data.type === 'RESPONSE') {
                toast.success(t('scoreWrittenSuccess') || 'Skóre bylo úspěšně zapsáno');
                // Refresh match data
                fetchMatch();
            } else {
                toast.error(data.message || t('scoreWriteFailed') || 'Nepodařilo se zapsat skóre');
            }
        } catch (err) {
            toast.error(t('scoreWriteFailed') || 'Nepodařilo se zapsat skóre');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    // Request rematch
    const handleRematch = async () => {
        setSubmitting(true);

        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/match/rematch?id=${matchId}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            if (tokenExpired(response.status)) return;
            const data = await response.json();

            if (response.ok && data.type === 'RESPONSE') {
                toast.success(t('rematchRequested') || 'Opakování zápasu bylo vyžádáno');
                fetchMatch();
            } else {
                toast.error(data.message || t('rematchFailed') || 'Nepodařilo se vyžádat opakování');
            }
        } catch (err) {
            toast.error(t('rematchFailed') || 'Nepodařilo se vyžádat opakování');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const getStateColor = (state) => {
        switch (state) {
            case 'WAITING': return 'warning';
            case 'DONE': return 'success';
            case 'REMATCH': return 'danger';
            default: return 'secondary';
        }
    };

    const getStateLabel = (state) => {
        switch (state) {
            case 'WAITING': return t('matchWaiting') || 'Čeká';
            case 'DONE': return t('matchDone') || 'Hotovo';
            case 'REMATCH': return t('matchRematch') || 'Opakování';
            default: return state;
        }
    };

    const getPhaseLabel = (phase) => {
        switch (phase) {
            case 'PRELIMINARY': return t('phasePreliminary') || 'Předkolo';
            case 'QUARTERFINAL': return t('phaseQuarterfinal') || 'Čtvrtfinále';
            case 'SEMIFINAL': return t('phaseSemifinal') || 'Semifinále';
            case 'FINAL': return t('phaseFinal') || 'Finále';
            case 'THIRD_PLACE': return t('phaseThirdPlace') || 'O 3. místo';
            default: return phase || '';
        }
    };

    const getScoreTypeLabel = (scoreType) => {
        switch (scoreType) {
            case 'TIME': return t('scoreTypeTime') || 'Čas';
            case 'SCORE': return t('scoreTypeScore') || 'Body';
            default: return scoreType || '';
        }
    };

    // Determine winner based on scores and highScoreWin setting
    const determineWinner = () => {
        if (!match || !match.robotAID || !match.robotBID) return null;
        if (scoreA === '' || scoreB === '') return null;
        
        const sA = parseFloat(scoreA);
        const sB = parseFloat(scoreB);
        
        if (isNaN(sA) || isNaN(sB)) return null;
        
        if (match.highScoreWin) {
            if (sA > sB) return 'A';
            if (sB > sA) return 'B';
        } else {
            if (sA < sB) return 'A';
            if (sB < sA) return 'B';
        }
        return 'TIE';
    };

    const winner = determineWinner();

    if (loading) {
        return (
            <div className="content">
                <Row className="justify-content-center">
                    <Col md="6" className="text-center py-5">
                        <Spinner color="primary" />
                        <p className="mt-3">{t('loading') || 'Načítání...'}</p>
                    </Col>
                </Row>
            </div>
        );
    }

    if (error) {
        return (
            <div className="content">
                <Row className="justify-content-center">
                    <Col md="6">
                        <Alert color="danger">
                            <i className="tim-icons icon-alert-circle-exc mr-2" />
                            {error}
                        </Alert>
                        <Button color="secondary" onClick={() => navigate(-1)}>
                            <i className="tim-icons icon-minimal-left mr-2" />
                            {t('back') || 'Zpět'}
                        </Button>
                    </Col>
                </Row>
            </div>
        );
    }

    const noRobotAssigned = !match.robotAID && !match.robotBID;
    const isTwoRobotMatch = match.robotAID && match.robotBID;
    const isSingleRobotMatch = (match.robotAID && !match.robotBID) || (!match.robotAID && match.robotBID);
    const isDone = match.state?.name === 'DONE';
    const isTimeScore = match.scoreType?.name === 'TIME';

    return (
        <div className="content">
            <Row className="justify-content-center">
                <Col lg="8" md="10">
                    {/* Match Info Card */}
                    <Card>
                        <CardHeader>
                            <Row className="align-items-center">
                                <Col>
                                    <CardTitle tag="h3" className="mb-0">
                                        <i className="tim-icons icon-pencil mr-2" />
                                        {t('scoreEntry') || 'Zápis skóre'} - {t('match') || 'Zápas'} #{matchId}
                                    </CardTitle>
                                </Col>
                                <Col xs="auto">
                                    <Badge color={getStateColor(match.state?.name)} style={{ fontSize: '14px', padding: '8px 15px' }}>
                                        {getStateLabel(match.state?.name)}
                                    </Badge>
                                </Col>
                            </Row>
                        </CardHeader>
                        <CardBody>
                            {/* Discipline - Prominent Display */}
                            <Row className="mb-4">
                                <Col className="text-center">
                                    <Badge 
                                        color="info" 
                                        style={{ 
                                            fontSize: '20px', 
                                            padding: '12px 30px',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        <i className="tim-icons icon-trophy mr-2" />
                                        {match.disciplineName || (t('noDiscipline') || 'Bez disciplíny')}
                                    </Badge>
                                </Col>
                            </Row>

                            {/* Match Details */}
                            <Row className="mb-4">
                                <Col md="12">
                                    <h5 className="text-muted mb-2">
                                        <i className="tim-icons icon-compass-05 mr-2" />
                                        {t('playground') || 'Hřiště'}
                                    </h5>
                                    <p className="mb-0">
                                        <strong>{match.playgroundName}</strong> (#{match.playgroundNumber})
                                    </p>
                                </Col>
                            </Row>

                            <Row className="mb-4">
                                <Col md="6">
                                    <h5 className="text-muted mb-2">
                                        <i className="tim-icons icon-chart-bar-32 mr-2" />
                                        {t('phase') || 'Fáze'}
                                    </h5>
                                    <Badge color="primary">
                                        {getPhaseLabel(match.phaseName)}
                                    </Badge>
                                </Col>
                                <Col md="3">
                                    <h5 className="text-muted mb-2">
                                        <i className="tim-icons icon-settings mr-2" />
                                        {t('scoreType') || 'Typ skóre'}
                                    </h5>
                                    <Badge color="info">
                                        {getScoreTypeLabel(match.scoreType?.name)}
                                    </Badge>
                                    {match.highScoreWin !== undefined && (
                                        <Badge color={match.highScoreWin ? 'success' : 'warning'} className="ml-2">
                                            {match.highScoreWin 
                                                ? (t('highScoreWins') || 'Vyšší vyhrává')
                                                : (t('lowScoreWins') || 'Nižší vyhrává')
                                            }
                                        </Badge>
                                    )}
                                </Col>
                                <Col md="3">
                                    <h5 className="text-muted mb-2">
                                        <i className="tim-icons icon-time-alarm mr-2" />
                                        {t('lastUpdate') || 'Poslední změna'}
                                    </h5>
                                    <p className="mb-0">
                                        {match.timestamp 
                                            ? new Date(match.timestamp).toLocaleString('cs-CZ')
                                            : '-'
                                        }
                                    </p>
                                </Col>
                            </Row>

                            <hr />

                            {/* No Robot Warning */}
                            {noRobotAssigned && (
                                <Alert color="danger" className="text-center">
                                    <i className="tim-icons icon-alert-circle-exc mr-2" style={{ fontSize: '24px' }} />
                                    <h4 className="alert-heading mt-2">{t('noRobotAssignedTitle') || 'Žádný robot není přiřazen'}</h4>
                                    <p className="mb-0">
                                        {t('noRobotAssignedDesc') || 'Nelze zapsat skóre, protože tomuto zápasu nejsou přiřazeni žádní roboti. Vraťte se do správy zápasů a přiřaďte roboty.'}
                                    </p>
                                </Alert>
                            )}

                            {/* Two Robot Match Layout */}
                            {isTwoRobotMatch && (
                                <>
                                    <Row className="align-items-center mb-4">
                                        <Col md="5" className="text-center">
                                            <div 
                                                className="robot-info-box p-3" 
                                                style={{ 
                                                    background: winner === 'A' ? 'rgba(45, 206, 137, 0.25)' : 'rgba(45, 206, 137, 0.1)', 
                                                    borderRadius: '10px',
                                                    border: winner === 'A' ? '3px solid #2dce89' : 'none',
                                                    transition: 'all 0.3s ease'
                                                }}
                                            >
                                                {winner === 'A' && (
                                                    <Badge color="success" className="mb-2" style={{ fontSize: '12px' }}>
                                                        <i className="tim-icons icon-trophy mr-1" />
                                                        {t('winner') || 'VÍTĚZ'}
                                                    </Badge>
                                                )}
                                                <div style={{ fontSize: '48px', fontWeight: '900', color: '#2dce89' }}>
                                                    #{match.robotANumber || '?'}
                                                </div>
                                                <h4 className="mb-1">{match.robotAName || 'Robot A'}</h4>
                                                <p className="text-muted mb-0">
                                                    <i className="tim-icons icon-single-02 mr-1" />
                                                    {match.teamAName || '-'}
                                                </p>
                                            </div>
                                        </Col>
                                        <Col md="2" className="text-center">
                                            <div style={{ fontSize: '24px', fontWeight: '900', color: '#fff' }}>VS</div>
                                            {winner === 'TIE' && (
                                                <Badge color="warning" className="mt-2">
                                                    {t('tie') || 'REMÍZA'}
                                                </Badge>
                                            )}
                                        </Col>
                                        <Col md="5" className="text-center">
                                            <div 
                                                className="robot-info-box p-3" 
                                                style={{ 
                                                    background: winner === 'B' ? 'rgba(94, 114, 228, 0.25)' : 'rgba(94, 114, 228, 0.1)', 
                                                    borderRadius: '10px',
                                                    border: winner === 'B' ? '3px solid #5e72e4' : 'none',
                                                    transition: 'all 0.3s ease'
                                                }}
                                            >
                                                {winner === 'B' && (
                                                    <Badge color="primary" className="mb-2" style={{ fontSize: '12px' }}>
                                                        <i className="tim-icons icon-trophy mr-1" />
                                                        {t('winner') || 'VÍTĚZ'}
                                                    </Badge>
                                                )}
                                                <div style={{ fontSize: '48px', fontWeight: '900', color: '#5e72e4' }}>
                                                    #{match.robotBNumber || '?'}
                                                </div>
                                                <h4 className="mb-1">{match.robotBName || 'Robot B'}</h4>
                                                <p className="text-muted mb-0">
                                                    <i className="tim-icons icon-single-02 mr-1" />
                                                    {match.teamBName || '-'}
                                                </p>
                                            </div>
                                        </Col>
                                    </Row>

                                    {/* Win condition hint */}
                                    <Alert color="info" className="text-center mb-4">
                                        <i className="tim-icons icon-bulb-63 mr-2" />
                                        {match.highScoreWin 
                                            ? (t('highScoreWinsHint') || 'Robot s vyšším skóre vyhrává (např. RoboSumo - počet výher)')
                                            : (t('lowScoreWinsHint') || 'Robot s nižším skóre vyhrává (např. Line Follower - kratší čas)')
                                        }
                                    </Alert>

                                    <hr />

                                    {/* Score Entry Form - Two Robots */}
                                    <Form onSubmit={handleSubmit}>
                                        <Row>
                                            <Col md="5">
                                                <FormGroup>
                                                    <Label for="scoreA" className="text-success" style={{ fontSize: '16px' }}>
                                                        <i className="tim-icons icon-chart-pie-36 mr-2" />
                                                        {isTimeScore ? (t('time') || 'Čas') : (t('score') || 'Skóre')} - {match.robotAName}
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        id="scoreA"
                                                        step={isTimeScore ? "0.01" : "1"}
                                                        min="0"
                                                        value={scoreA}
                                                        onChange={(e) => setScoreA(e.target.value)}
                                                        placeholder={isTimeScore ? (t('enterTime') || 'Zadejte čas') : (t('enterScore') || 'Zadejte skóre')}
                                                        disabled={submitting}
                                                        style={{ fontSize: '28px', textAlign: 'center', height: '60px' }}
                                                    />
                                                </FormGroup>
                                            </Col>
                                            <Col md="2" className="d-flex align-items-center justify-content-center">
                                                <span style={{ fontSize: '36px', fontWeight: 'bold' }}>:</span>
                                            </Col>
                                            <Col md="5">
                                                <FormGroup>
                                                    <Label for="scoreB" className="text-primary" style={{ fontSize: '16px' }}>
                                                        <i className="tim-icons icon-chart-pie-36 mr-2" />
                                                        {isTimeScore ? (t('time') || 'Čas') : (t('score') || 'Skóre')} - {match.robotBName}
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        id="scoreB"
                                                        step={isTimeScore ? "0.01" : "1"}
                                                        min="0"
                                                        value={scoreB}
                                                        onChange={(e) => setScoreB(e.target.value)}
                                                        placeholder={isTimeScore ? (t('enterTime') || 'Zadejte čas') : (t('enterScore') || 'Zadejte skóre')}
                                                        disabled={submitting}
                                                        style={{ fontSize: '28px', textAlign: 'center', height: '60px' }}
                                                    />
                                                </FormGroup>
                                            </Col>
                                        </Row>
                                    </Form>
                                </>
                            )}

                            {/* Single Robot Match Layout */}
                            {isSingleRobotMatch && (
                                <>
                                    <Row className="mb-4">
                                        <Col md={{ size: 6, offset: 3 }} className="text-center">
                                            <div className="robot-info-box p-3" style={{ background: 'rgba(45, 206, 137, 0.1)', borderRadius: '10px' }}>
                                                <div style={{ fontSize: '64px', fontWeight: '900', color: '#2dce89' }}>
                                                    #{match.robotANumber || match.robotBNumber || '?'}
                                                </div>
                                                <h3 className="mb-1">{match.robotAName || match.robotBName || 'Robot'}</h3>
                                                <p className="text-muted mb-0">
                                                    <i className="tim-icons icon-single-02 mr-1" />
                                                    {match.teamAName || match.teamBName || '-'}
                                                </p>
                                            </div>
                                        </Col>
                                    </Row>

                                    <hr />

                                    {/* Score Entry Form - Single Robot */}
                                    <Form onSubmit={handleSubmit}>
                                        <Row>
                                            <Col md={{ size: 6, offset: 3 }}>
                                                <FormGroup>
                                                    <Label for="scoreA" style={{ fontSize: '18px' }}>
                                                        <i className="tim-icons icon-chart-pie-36 mr-2" />
                                                        {isTimeScore 
                                                            ? (t('time') || 'Čas')
                                                            : (t('score') || 'Skóre')
                                                        }
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        id="scoreA"
                                                        step={isTimeScore ? "0.01" : "1"}
                                                        min="0"
                                                        value={scoreA}
                                                        onChange={(e) => setScoreA(e.target.value)}
                                                        placeholder={isTimeScore ? (t('enterTime') || 'Zadejte čas (sekundy)') : (t('enterScore') || 'Zadejte skóre')}
                                                        disabled={submitting}
                                                        style={{ fontSize: '36px', textAlign: 'center', height: '70px' }}
                                                    />
                                                    <small className="form-text text-muted text-center">
                                                        {isTimeScore 
                                                            ? (t('timeHint') || 'Zadejte čas v sekundách (např. 45.23)')
                                                            : (t('scoreHintInt') || 'Zadejte celé číslo')
                                                        }
                                                    </small>
                                                </FormGroup>
                                            </Col>
                                        </Row>
                                    </Form>
                                </>
                            )}

                            {/* Current Score Display (if already set) */}
                            {isDone && !noRobotAssigned && (
                                <Row className="mt-3">
                                    <Col className="text-center">
                                        <Alert color="success" style={{ backgroundColor: '#2dce89', color: 'white' }}>
                                            <i className="tim-icons icon-check-2 mr-2" />
                                            {t('currentScore') || 'Aktuální skóre'}: 
                                            <strong className="ml-2" style={{ color: 'white' }}>
                                                {match.scoreA !== null ? match.scoreA : '-'}
                                                {isTwoRobotMatch && ` : ${match.scoreB !== null ? match.scoreB : '-'}`}
                                            </strong>
                                        </Alert>
                                    </Col>
                                </Row>
                            )}
                        </CardBody>
                        <CardFooter>
                            <Row>
                                <Col>
                                    <Button color="secondary" onClick={() => navigate(-1)} disabled={submitting}>
                                        <i className="tim-icons icon-minimal-left mr-2" />
                                        {t('back') || 'Zpět'}
                                    </Button>
                                </Col>
                                <Col className="text-right">
                                    {!noRobotAssigned && (
                                        <>
                                            <Button 
                                                color="warning" 
                                                className="mr-2"
                                                onClick={handleRematch}
                                                disabled={submitting}
                                            >
                                                {submitting ? <Spinner size="sm" /> : <i className="tim-icons icon-refresh-02 mr-2" />}
                                                {t('requestRematch') || 'Opakovat zápas'}
                                            </Button>
                                            <Button 
                                                color="success" 
                                                onClick={handleSubmit}
                                                disabled={submitting}
                                            >
                                                {submitting ? <Spinner size="sm" /> : <i className="tim-icons icon-check-2 mr-2" />}
                                                {t('saveScore') || 'Uložit skóre'}
                                            </Button>
                                        </>
                                    )}
                                </Col>
                            </Row>
                        </CardFooter>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default MatchScoreEntry;
