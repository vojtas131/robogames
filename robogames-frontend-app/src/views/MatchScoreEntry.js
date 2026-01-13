import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card, CardHeader, CardBody, CardTitle,
    Row, Col, Button, Form, FormGroup, Label, Input,
    Badge, Spinner, Alert
} from 'reactstrap';
import { t } from "translations/translate";
import { useUser } from "contexts/UserContext";
import { useToast } from "contexts/ToastContext";
import ConfirmModal from "components/ConfirmModal/ConfirmModal";

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
    
    // Time input states for TIME score type (mm:ss:ms format) - default to 0
    const [timeAMinutes, setTimeAMinutes] = useState('0');
    const [timeASeconds, setTimeASeconds] = useState('0');
    const [timeAMillis, setTimeAMillis] = useState('0');
    const [timeBMinutes, setTimeBMinutes] = useState('0');
    const [timeBSeconds, setTimeBSeconds] = useState('0');
    const [timeBMillis, setTimeBMillis] = useState('0');
    
    // Confirmation modal states
    const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
    const [confirmRematchOpen, setConfirmRematchOpen] = useState(false);

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
                const isTime = data.data.scoreTypeName === 'TIME';
                
                // Pre-fill existing scores if any
                if (data.data.scoreA !== null) {
                    setScoreA(data.data.scoreA.toString());
                    if (isTime) {
                        // Convert seconds to mm:ss:ms
                        const totalSeconds = data.data.scoreA;
                        const mins = Math.floor(totalSeconds / 60);
                        const secs = Math.floor(totalSeconds % 60);
                        const ms = Math.round((totalSeconds % 1) * 1000);
                        setTimeAMinutes(mins.toString());
                        setTimeASeconds(secs.toString().padStart(2, '0'));
                        setTimeAMillis(ms.toString().padStart(3, '0'));
                    }
                }
                if (data.data.scoreB !== null) {
                    setScoreB(data.data.scoreB.toString());
                    if (isTime) {
                        const totalSeconds = data.data.scoreB;
                        const mins = Math.floor(totalSeconds / 60);
                        const secs = Math.floor(totalSeconds % 60);
                        const ms = Math.round((totalSeconds % 1) * 1000);
                        setTimeBMinutes(mins.toString());
                        setTimeBSeconds(secs.toString().padStart(2, '0'));
                        setTimeBMillis(ms.toString().padStart(3, '0'));
                    }
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

    // Convert time fields (mm:ss:ms) to total seconds (float)
    const timeToSeconds = (minutes, seconds, millis) => {
        const mins = parseInt(minutes) || 0;
        const secs = parseInt(seconds) || 0;
        const ms = parseInt(millis) || 0;
        return mins * 60 + secs + ms / 1000;
    };
    
    // Update scoreA when time fields change
    useEffect(() => {
        if (match?.scoreTypeName === 'TIME' && (timeAMinutes || timeASeconds || timeAMillis)) {
            setScoreA(timeToSeconds(timeAMinutes, timeASeconds, timeAMillis).toString());
        }
    }, [timeAMinutes, timeASeconds, timeAMillis, match?.scoreTypeName]);
    
    // Update scoreB when time fields change  
    useEffect(() => {
        if (match?.scoreTypeName === 'TIME' && (timeBMinutes || timeBSeconds || timeBMillis)) {
            setScoreB(timeToSeconds(timeBMinutes, timeBSeconds, timeBMillis).toString());
        }
    }, [timeBMinutes, timeBSeconds, timeBMillis, match?.scoreTypeName]);

    // Submit score
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
        // Check if at least one robot is assigned
        if (!match.robotAID && !match.robotBID) {
            toast.error(t('noRobotAssigned') || 'Není přiřazen žádný robot');
            return;
        }

        const isTimeScore = match.scoreTypeName === 'TIME';
        const finalScoreA = isTimeScore ? timeToSeconds(timeAMinutes, timeASeconds, timeAMillis).toString() : scoreA;
        const finalScoreB = isTimeScore ? timeToSeconds(timeBMinutes, timeBSeconds, timeBMillis).toString() : scoreB;

        if (!finalScoreA && finalScoreA !== '0') {
            toast.error(t('scoreARequired') || 'Skóre A je povinné');
            return;
        }

        // For two-robot matches, scoreB is required
        const isTwoRobotMatch = match.robotAID && match.robotBID;
        if (isTwoRobotMatch && !finalScoreB && finalScoreB !== '0') {
            toast.error(t('scoreBRequired') || 'Skóre B je povinné');
            return;
        }

        setSubmitting(true);

        try {
            const requestBody = {
                matchID: parseInt(matchId),
                scoreA: parseFloat(finalScoreA),
                scoreB: isTwoRobotMatch ? parseFloat(finalScoreB) : null
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
    const isTimeScore = match.scoreTypeName === 'TIME';

    return (
        <div className="content">
            <Row className="justify-content-center">
                <Col lg="8" md="10">
                    {/* Match Info Card */}
                    <Card>
                        <CardHeader>
                            <Row className="align-items-center">
                                <Col xs="auto">
                                    <Button color="secondary" size="sm" onClick={() => navigate(-1)} disabled={submitting}>
                                        <i className="tim-icons icon-minimal-left mr-1" />
                                        {t('back') || 'Zpět'}
                                    </Button>
                                </Col>
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
                            <Row className="mb-3">
                                <Col className="text-center">
                                    <Badge 
                                        color="info" 
                                        style={{ 
                                            fontSize: '16px', 
                                            padding: '8px 20px',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        <i className="tim-icons icon-trophy mr-2" />
                                        {match.disciplineName || (t('noDiscipline') || 'Bez disciplíny')}
                                    </Badge>
                                </Col>
                            </Row>

                            {/* Match Details - Compact Layout */}
                            <Row className="mb-2">
                                <Col md="3">
                                    <small className="text-muted d-block">
                                        <i className="tim-icons icon-compass-05 mr-1" />
                                        {t('playground') || 'Hřiště'}
                                    </small>
                                    <span>
                                        <strong>{match.playgroundName}</strong>{' '}
                                        <Badge 
                                            style={{ 
                                                backgroundColor: 'rgba(94, 114, 228, 0.2)', 
                                                color: '#5e72e4',
                                                fontSize: '12px',
                                                fontWeight: '800',
                                                padding: '3px 8px'
                                            }}
                                        >
                                            {match.playgroundNumber}
                                        </Badge>
                                    </span>
                                </Col>
                                <Col md="3">
                                    <small className="text-muted d-block">
                                        <i className="tim-icons icon-chart-bar-32 mr-1" />
                                        {t('phase') || 'Fáze'}
                                    </small>
                                    <Badge color="primary" style={{ fontSize: '11px' }}>
                                        {getPhaseLabel(match.phaseName)}
                                    </Badge>
                                </Col>
                                <Col md="3">
                                    <small className="text-muted d-block">
                                        <i className="tim-icons icon-components mr-1" />
                                        {t('groupName') || 'Skupina'}
                                    </small>
                                    {match.group ? (
                                        <Badge color="secondary" style={{ fontSize: '11px' }}>
                                            {match.group}
                                        </Badge>
                                    ) : (
                                        <span className="text-muted">{t('noGroup') || 'Bez skupiny'}</span>
                                    )}
                                </Col>
                                <Col md="3">
                                    <small className="text-muted d-block">
                                        <i className="tim-icons icon-time-alarm mr-1" />
                                        {t('lastUpdate') || 'Poslední změna'}
                                    </small>
                                    <span>
                                        {match.timestamp 
                                            ? new Date(match.timestamp).toLocaleString('cs-CZ')
                                            : '-'
                                        }
                                    </span>
                                </Col>
                            </Row>

                            <hr className="my-2" />

                            {/* No Robot Warning */}
                            {noRobotAssigned && (
                                <Alert color="danger" className="text-center py-2">
                                    <i className="tim-icons icon-alert-circle-exc mr-2" />
                                    <strong>{t('noRobotAssignedTitle') || 'Žádný robot není přiřazen'}</strong>
                                    <p className="mb-0 small">
                                        {t('noRobotAssignedDesc') || 'Nelze zapsat skóre, protože tomuto zápasu nejsou přiřazeni žádní roboti.'}
                                    </p>
                                </Alert>
                            )}

                            {/* Two Robot Match Layout */}
                            {isTwoRobotMatch && (
                                <>
                                    <Row className="align-items-center mb-3">
                                        <Col md="5" className="text-center">
                                            <div 
                                                className="robot-info-box p-2" 
                                                style={{ 
                                                    background: winner === 'A' ? 'rgba(45, 206, 137, 0.25)' : 'rgba(45, 206, 137, 0.1)', 
                                                    borderRadius: '10px',
                                                    border: winner === 'A' ? '3px solid #2dce89' : 'none',
                                                    transition: 'all 0.3s ease'
                                                }}
                                            >
                                                {winner === 'A' && (
                                                    <Badge color="success" className="mb-1" style={{ fontSize: '11px' }}>
                                                        <i className="tim-icons icon-trophy mr-1" />
                                                        {t('winner') || 'VÍTĚZ'}
                                                    </Badge>
                                                )}
                                                <div style={{ fontSize: '36px', fontWeight: '900', color: '#2dce89' }}>
                                                    {match.robotANumber || '?'}
                                                </div>
                                                <h6 className="mb-0">{match.robotAName || 'Robot A'}</h6>
                                                <small className="text-muted">
                                                    <i className="tim-icons icon-single-02 mr-1" />
                                                    {match.teamAName || '-'}
                                                </small>
                                            </div>
                                        </Col>
                                        <Col md="2" className="text-center">
                                            <div style={{ fontSize: '20px', fontWeight: '900', color: '#fff' }}>VS</div>
                                            {winner === 'TIE' && (
                                                <Badge color="warning" className="mt-2">
                                                    {t('tie') || 'REMÍZA'}
                                                </Badge>
                                            )}
                                        </Col>
                                        <Col md="5" className="text-center">
                                            <div 
                                                className="robot-info-box p-2" 
                                                style={{ 
                                                    background: winner === 'B' ? 'rgba(94, 114, 228, 0.25)' : 'rgba(94, 114, 228, 0.1)', 
                                                    borderRadius: '10px',
                                                    border: winner === 'B' ? '3px solid #5e72e4' : 'none',
                                                    transition: 'all 0.3s ease'
                                                }}
                                            >
                                                {winner === 'B' && (
                                                    <Badge color="primary" className="mb-1" style={{ fontSize: '11px' }}>
                                                        <i className="tim-icons icon-trophy mr-1" />
                                                        {t('winner') || 'VÍTĚZ'}
                                                    </Badge>
                                                )}
                                                <div style={{ fontSize: '36px', fontWeight: '900', color: '#5e72e4' }}>
                                                    {match.robotBNumber || '?'}
                                                </div>
                                                <h6 className="mb-0">{match.robotBName || 'Robot B'}</h6>
                                                <small className="text-muted">
                                                    <i className="tim-icons icon-single-02 mr-1" />
                                                    {match.teamBName || '-'}
                                                </small>
                                            </div>
                                        </Col>
                                    </Row>

                                    {/* Win condition hint */}
                                    <Alert color="info" className="text-center mb-2 py-1">
                                        <i className="tim-icons icon-bulb-63 mr-2" />
                                        {match.highScoreWin 
                                            ? (t('highScoreWinsHint') || 'Robot s vyšším skóre vyhrává (např. RoboSumo - počet výher)')
                                            : (t('lowScoreWinsHint') || 'Robot s nižším skóre vyhrává (např. Line Follower - kratší čas)')
                                        }
                                    </Alert>

                                    <hr />

                                    {/* Score Entry Form - Two Robots */}
                                    <Form onSubmit={(e) => { e.preventDefault(); setConfirmSaveOpen(true); }}>
                                        <Row>
                                            <Col md="5">
                                                <FormGroup>
                                                    <Label for="scoreA" className="text-success" style={{ fontSize: '14px' }}>
                                                        <i className="tim-icons icon-chart-pie-36 mr-2" />
                                                        {isTimeScore ? (t('time') || 'Čas') : (t('score') || 'Skóre')} - {match.robotAName}
                                                    </Label>
                                                    {isTimeScore ? (
                                                        <div className="d-flex align-items-center justify-content-center">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="59"
                                                                value={timeAMinutes}
                                                                onChange={(e) => {
                                                                    const val = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                                                                    setTimeAMinutes(val.toString());
                                                                }}
                                                                disabled={submitting}
                                                                style={{ fontSize: '18px', textAlign: 'center', height: '45px', width: '60px', padding: '5px' }}
                                                            />
                                                            <span style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 4px' }}>:</span>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="59"
                                                                value={timeASeconds}
                                                                onChange={(e) => {
                                                                    const val = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                                                                    setTimeASeconds(val.toString());
                                                                }}
                                                                disabled={submitting}
                                                                style={{ fontSize: '18px', textAlign: 'center', height: '45px', width: '60px', padding: '5px' }}
                                                            />
                                                            <span style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 4px' }}>.</span>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="999"
                                                                step="100"
                                                                value={timeAMillis}
                                                                onChange={(e) => {
                                                                    const val = Math.min(999, Math.max(0, parseInt(e.target.value) || 0));
                                                                    setTimeAMillis(val.toString());
                                                                }}
                                                                disabled={submitting}
                                                                style={{ fontSize: '18px', textAlign: 'center', height: '45px', width: '70px', padding: '5px' }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <Input
                                                            type="number"
                                                            id="scoreA"
                                                            step="1"
                                                            min="0"
                                                            value={scoreA}
                                                            onChange={(e) => setScoreA(e.target.value)}
                                                            placeholder={t('enterScore') || 'Zadejte skóre'}
                                                            disabled={submitting}
                                                            style={{ fontSize: '22px', textAlign: 'center', height: '50px' }}
                                                        />
                                                    )}
                                                    {isTimeScore && (
                                                        <small className="form-text text-muted text-center">
                                                            {t('timeFormatHint') || 'Formát: mm:ss.ms'}
                                                        </small>
                                                    )}
                                                </FormGroup>
                                            </Col>
                                            <Col md="2" className="d-flex align-items-center justify-content-center">
                                                <span style={{ fontSize: '28px', fontWeight: 'bold' }}>:</span>
                                            </Col>
                                            <Col md="5">
                                                <FormGroup>
                                                    <Label for="scoreB" className="text-primary" style={{ fontSize: '14px' }}>
                                                        <i className="tim-icons icon-chart-pie-36 mr-2" />
                                                        {isTimeScore ? (t('time') || 'Čas') : (t('score') || 'Skóre')} - {match.robotBName}
                                                    </Label>
                                                    {isTimeScore ? (
                                                        <div className="d-flex align-items-center justify-content-center">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="59"
                                                                value={timeBMinutes}
                                                                onChange={(e) => {
                                                                    const val = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                                                                    setTimeBMinutes(val.toString());
                                                                }}
                                                                disabled={submitting}
                                                                style={{ fontSize: '18px', textAlign: 'center', height: '45px', width: '60px', padding: '5px' }}
                                                            />
                                                            <span style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 4px' }}>:</span>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="59"
                                                                value={timeBSeconds}
                                                                onChange={(e) => {
                                                                    const val = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                                                                    setTimeBSeconds(val.toString());
                                                                }}
                                                                disabled={submitting}
                                                                style={{ fontSize: '18px', textAlign: 'center', height: '45px', width: '60px', padding: '5px' }}
                                                            />
                                                            <span style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 4px' }}>.</span>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="999"
                                                                step="100"
                                                                value={timeBMillis}
                                                                onChange={(e) => {
                                                                    const val = Math.min(999, Math.max(0, parseInt(e.target.value) || 0));
                                                                    setTimeBMillis(val.toString());
                                                                }}
                                                                disabled={submitting}
                                                                style={{ fontSize: '18px', textAlign: 'center', height: '45px', width: '70px', padding: '5px' }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <Input
                                                            type="number"
                                                            id="scoreB"
                                                            step="1"
                                                            min="0"
                                                            value={scoreB}
                                                            onChange={(e) => setScoreB(e.target.value)}
                                                            placeholder={t('enterScore') || 'Zadejte skóre'}
                                                            disabled={submitting}
                                                            style={{ fontSize: '22px', textAlign: 'center', height: '50px' }}
                                                        />
                                                    )}
                                                    {isTimeScore && (
                                                        <small className="form-text text-muted text-center">
                                                            {t('timeFormatHint') || 'Formát: mm:ss.ms'}
                                                        </small>
                                                    )}
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
                                            <div className="robot-info-box p-2" style={{ background: 'rgba(45, 206, 137, 0.1)', borderRadius: '10px' }}>
                                                <div style={{ fontSize: '48px', fontWeight: '900', color: '#2dce89' }}>
                                                    {match.robotANumber || match.robotBNumber || '?'}
                                                </div>
                                                <h4 className="mb-1">{match.robotAName || match.robotBName || 'Robot'}</h4>
                                                <p className="text-muted mb-0">
                                                    <i className="tim-icons icon-single-02 mr-1" />
                                                    {match.teamAName || match.teamBName || '-'}
                                                </p>
                                            </div>
                                        </Col>
                                    </Row>

                                    <hr />

                                    {/* Score Entry Form - Single Robot */}
                                    <Form onSubmit={(e) => { e.preventDefault(); setConfirmSaveOpen(true); }}>
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
                                                    {isTimeScore ? (
                                                        <div className="d-flex align-items-center justify-content-center">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="59"
                                                                value={timeAMinutes}
                                                                onChange={(e) => {
                                                                    const val = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                                                                    setTimeAMinutes(val.toString());
                                                                }}
                                                                disabled={submitting}
                                                                style={{ fontSize: '22px', textAlign: 'center', height: '50px', width: '70px', padding: '5px' }}
                                                            />
                                                            <span style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 6px' }}>:</span>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="59"
                                                                value={timeASeconds}
                                                                onChange={(e) => {
                                                                    const val = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                                                                    setTimeASeconds(val.toString());
                                                                }}
                                                                disabled={submitting}
                                                                style={{ fontSize: '22px', textAlign: 'center', height: '50px', width: '70px', padding: '5px' }}
                                                            />
                                                            <span style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 6px' }}>.</span>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="999"
                                                                step="100"
                                                                value={timeAMillis}
                                                                onChange={(e) => {
                                                                    const val = Math.min(999, Math.max(0, parseInt(e.target.value) || 0));
                                                                    setTimeAMillis(val.toString());
                                                                }}
                                                                disabled={submitting}
                                                                style={{ fontSize: '22px', textAlign: 'center', height: '50px', width: '80px', padding: '5px' }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <Input
                                                            type="number"
                                                            id="scoreA"
                                                            step="1"
                                                            min="0"
                                                            value={scoreA}
                                                            onChange={(e) => setScoreA(e.target.value)}
                                                            placeholder={t('enterScore') || 'Zadejte skóre'}
                                                            disabled={submitting}
                                                            style={{ fontSize: '28px', textAlign: 'center', height: '55px' }}
                                                        />
                                                    )}
                                                    <small className="form-text text-muted text-center">
                                                        {isTimeScore 
                                                            ? (t('timeFormatHint') || 'Formát: mm:ss.ms')
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
                            
                            {/* Action buttons at bottom */}
                            {!noRobotAssigned && (
                                <Row className="mt-4">
                                    <Col className="text-center">
                                        <Button 
                                            color="warning" 
                                            className="mr-3"
                                            onClick={() => setConfirmRematchOpen(true)}
                                            disabled={submitting}
                                        >
                                            {submitting ? <Spinner size="sm" /> : <i className="tim-icons icon-refresh-02 mr-2" />}
                                            {t('requestRematch') || 'Opakovat zápas'}
                                        </Button>
                                        <Button 
                                            color="success"
                                            onClick={() => setConfirmSaveOpen(true)}
                                            disabled={submitting}
                                        >
                                            {submitting ? <Spinner size="sm" /> : <i className="tim-icons icon-check-2 mr-2" />}
                                            {t('saveScore') || 'Uložit skóre'}
                                        </Button>
                                    </Col>
                                </Row>
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>
            
            {/* Confirmation Modals */}
            <ConfirmModal
                isOpen={confirmSaveOpen}
                toggle={() => setConfirmSaveOpen(false)}
                onConfirm={handleSubmit}
                title={t('confirmSaveScoreTitle') || 'Uložit skóre'}
                message={t('confirmSaveScoreMessage') || 'Opravdu chcete uložit zadané skóre?'}
                confirmText={t('confirmYes') || 'Ano'}
                cancelText={t('confirmNo') || 'Ne'}
                confirmColor="success"
            />
            <ConfirmModal
                isOpen={confirmRematchOpen}
                toggle={() => setConfirmRematchOpen(false)}
                onConfirm={handleRematch}
                title={t('confirmRematchTitle') || 'Opakovat zápas'}
                message={t('confirmRematchMessage') || 'Opravdu chcete požádat o opakování zápasu?'}
                confirmText={t('confirmYes') || 'Ano'}
                cancelText={t('confirmNo') || 'Ne'}
                confirmColor="warning"
            />
        </div>
    );
}

export default MatchScoreEntry;
