import React, { useState, useEffect, useCallback, useRef } from 'react';
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

    const [scoreA, setScoreA] = useState('0');
    const [scoreB, setScoreB] = useState('0');
    
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

    // Referee note states
    const [refereeNote, setRefereeNote] = useState('');
    const [showNoteInput, setShowNoteInput] = useState(false);

    // Stopwatch states for TIME score type
    const [stopwatchRunning, setStopwatchRunning] = useState(false);
    const [stopwatchStartTime, setStopwatchStartTime] = useState(null);
    const [stopwatchElapsed, setStopwatchElapsed] = useState(0);
    const stopwatchIntervalRef = useRef(null);
    const [activeStopwatch, setActiveStopwatch] = useState('A'); // 'A' or 'B' for which robot's timer

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
                // Pre-fill existing referee note if any
                if (data.data.refereeNote) {
                    setRefereeNote(data.data.refereeNote);
                    setShowNoteInput(true);
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

    // Stopwatch interval effect
    useEffect(() => {
        if (stopwatchRunning && stopwatchStartTime) {
            stopwatchIntervalRef.current = setInterval(() => {
                const elapsed = Date.now() - stopwatchStartTime;
                setStopwatchElapsed(elapsed);
                
                // Update time fields in real-time
                const totalMs = elapsed;
                const mins = Math.floor(totalMs / 60000);
                const secs = Math.floor((totalMs % 60000) / 1000);
                const ms = totalMs % 1000;
                
                if (activeStopwatch === 'A') {
                    setTimeAMinutes(mins.toString());
                    setTimeASeconds(secs.toString());
                    setTimeAMillis(ms.toString());
                } else {
                    setTimeBMinutes(mins.toString());
                    setTimeBSeconds(secs.toString());
                    setTimeBMillis(ms.toString());
                }
            }, 10); // Update every 10ms for smooth display
        } else {
            if (stopwatchIntervalRef.current) {
                clearInterval(stopwatchIntervalRef.current);
                stopwatchIntervalRef.current = null;
            }
        }
        
        return () => {
            if (stopwatchIntervalRef.current) {
                clearInterval(stopwatchIntervalRef.current);
            }
        };
    }, [stopwatchRunning, stopwatchStartTime, activeStopwatch]);

    // Keyboard handler for spacebar to start/stop stopwatch
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Only handle spacebar for TIME score type and when not in input field
            if (e.code === 'Space' && match?.scoreTypeName === 'TIME') {
                // Don't trigger if user is typing in an input
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    return;
                }
                e.preventDefault();
                toggleStopwatch();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [match?.scoreTypeName, stopwatchRunning, stopwatchStartTime, stopwatchElapsed, activeStopwatch]);

    // Toggle stopwatch start/stop
    const toggleStopwatch = () => {
        if (stopwatchRunning) {
            // Stop the stopwatch
            setStopwatchRunning(false);
        } else {
            // Start the stopwatch
            const now = Date.now();
            // If there's already elapsed time, resume from there
            const resumeFrom = stopwatchElapsed > 0 ? now - stopwatchElapsed : now;
            setStopwatchStartTime(resumeFrom);
            setStopwatchRunning(true);
        }
    };

    // Reset stopwatch
    const resetStopwatch = () => {
        setStopwatchRunning(false);
        setStopwatchStartTime(null);
        setStopwatchElapsed(0);
        if (activeStopwatch === 'A') {
            setTimeAMinutes('0');
            setTimeASeconds('0');
            setTimeAMillis('0');
        } else {
            setTimeBMinutes('0');
            setTimeBSeconds('0');
            setTimeBMillis('0');
        }
    };

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
                scoreB: isTwoRobotMatch ? parseFloat(finalScoreB) : null,
                refereeNote: refereeNote.trim() || null
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
            case 'GROUP_STAGE': return t('phaseGroupStage') || 'Skupinová fáze';
            case 'PRELIMINARY': return t('phasePreliminary') || 'Předkolo';
            case 'ROUND_OF_16': return t('phaseRoundOf16') || 'Osmifinále';
            case 'QUARTERFINAL': return t('phaseQuarterfinal') || 'Čtvrtfinále';
            case 'SEMIFINAL': return t('phaseSemifinal') || 'Semifinále';
            case 'THIRD_PLACE': return t('phaseThirdPlace') || 'O 3. místo';
            case 'FINAL': return t('phaseFinal') || 'Finále';
            default: return phase || '';
        }
    };

    // Get category display text
    const getCategoryDisplay = (category) => {
        if (category === 'LOW_AGE_CATEGORY') return t('pupils') || 'Žáci';
        if (category === 'HIGH_AGE_CATEGORY') return t('students') || 'Studenti a dospělí';
        return category || '-';
    };

    // Get category badge color
    const getCategoryColor = (category) => {
        if (category === 'LOW_AGE_CATEGORY') return 'warning';
        if (category === 'HIGH_AGE_CATEGORY') return 'primary';
        return 'secondary';
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
                <Col xl="10" lg="11" md="12">
                    {/* Match Info Card */}
                    <Card>
                        <CardHeader className="pb-2">
                            <Row className="align-items-center">
                                <Col xs="auto">
                                    <Button color="link" className="p-0" onClick={() => navigate(-1)} disabled={submitting}>
                                        <i className="tim-icons icon-minimal-left" style={{ fontSize: '1.2rem' }} />
                                    </Button>
                                </Col>
                                <Col>
                                    <CardTitle tag="h3" className="mb-0 d-inline">
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
                        <CardBody className="pt-2">
                            {/* Discipline - Prominent Display */}
                            <div className="text-center mb-2">
                                <Badge 
                                    color="info" 
                                    style={{ 
                                        fontSize: '15px', 
                                        padding: '6px 18px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    <i className="tim-icons icon-trophy mr-2" />
                                    {match.disciplineName || (t('noDiscipline') || 'Bez disciplíny')}
                                </Badge>
                            </div>

                            {/* Match Details - Better organized grid */}
                            <Row className="mb-2 justify-content-center" style={{ 
                                background: 'rgba(94, 114, 228, 0.05)', 
                                borderRadius: '8px', 
                                padding: '8px 10px',
                                margin: '0 15px'
                            }}>
                                <Col xs="6" sm="4" md="2" className="text-center mb-1 mb-md-0">
                                    <small className="text-muted d-block mb-1">
                                        <i className="tim-icons icon-compass-05 mr-1" />
                                        {t('playground') || 'Hřiště'}
                                    </small>
                                    <div>
                                        <strong>{match.playgroundName}</strong>
                                        <Badge 
                                            className="ml-1"
                                            style={{ 
                                                backgroundColor: 'rgba(94, 114, 228, 0.2)', 
                                                color: '#5e72e4',
                                                fontSize: '11px',
                                                fontWeight: '700'
                                            }}
                                        >
                                            {match.playgroundNumber}
                                        </Badge>
                                    </div>
                                </Col>
                                <Col xs="6" sm="4" md="2" className="text-center mb-1 mb-md-0">
                                    <small className="text-muted d-block mb-1">
                                        <i className="tim-icons icon-badge mr-1" />
                                        {t('category') || 'Kategorie'}
                                    </small>
                                    {match.categoryA ? (
                                        <Badge color={getCategoryColor(match.categoryA)} style={{ fontSize: '11px' }}>
                                            {getCategoryDisplay(match.categoryA)}
                                        </Badge>
                                    ) : (
                                        <span className="text-muted">-</span>
                                    )}
                                </Col>
                                <Col xs="6" sm="4" md="2" className="text-center mb-1 mb-md-0">
                                    <small className="text-muted d-block mb-1">
                                        <i className="tim-icons icon-chart-bar-32 mr-1" />
                                        {t('phase') || 'Fáze'}
                                    </small>
                                    <Badge color="primary" style={{ fontSize: '11px' }}>
                                        {getPhaseLabel(match.phaseName)}
                                    </Badge>
                                </Col>
                                <Col xs="6" sm="4" md="2" className="text-center mb-1 mb-sm-0">
                                    <small className="text-muted d-block mb-1">
                                        <i className="tim-icons icon-components mr-1" />
                                        {t('groupName') || 'Skupina'}
                                    </small>
                                    {match.group ? (
                                        <Badge color="secondary" style={{ fontSize: '11px' }}>
                                            {match.group}
                                        </Badge>
                                    ) : (
                                        <span className="text-muted">-</span>
                                    )}
                                </Col>
                                <Col xs="12" sm="8" md="4" className="text-center">
                                    <small className="text-muted d-block mb-1">
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

                            {/* No Robot Warning */}
                            {noRobotAssigned && (
                                <Alert color="danger" className="text-center py-2 mx-3">
                                    <i className="tim-icons icon-alert-circle-exc mr-2" />
                                    <strong>{t('noRobotAssignedTitle') || 'Žádný robot není přiřazen'}</strong>
                                    <p className="mb-0 small mt-1">
                                        {t('noRobotAssignedDesc') || 'Nelze zapsat skóre, protože tomuto zápasu nejsou přiřazeni žádní roboti.'}
                                    </p>
                                </Alert>
                            )}

                            {/* Two Robot Match Layout */}
                            {isTwoRobotMatch && (
                                <>
                                    {/* Robots display */}
                                    <Row className="align-items-stretch mb-2 mx-2">
                                        <Col md="5" className="mb-2 mb-md-0">
                                            <div 
                                                className="robot-info-box p-2 h-100 d-flex flex-column justify-content-center" 
                                                style={{ 
                                                    background: winner === 'A' ? 'rgba(45, 206, 137, 0.25)' : 'rgba(45, 206, 137, 0.1)', 
                                                    borderRadius: '10px',
                                                    border: winner === 'A' ? '3px solid #2dce89' : '1px solid rgba(45, 206, 137, 0.3)',
                                                    transition: 'all 0.3s ease',
                                                    textAlign: 'center'
                                                }}
                                            >
                                                {winner === 'A' && (
                                                    <Badge color="success" className="mb-1" style={{ fontSize: '10px', alignSelf: 'center' }}>
                                                        <i className="tim-icons icon-trophy mr-1" />
                                                        {t('winner') || 'VÍTĚZ'}
                                                    </Badge>
                                                )}
                                                <div style={{ fontSize: '32px', fontWeight: '900', color: '#2dce89', lineHeight: '1.1' }}>
                                                    {match.robotANumber || '?'}
                                                </div>
                                                <div className="mb-0" style={{ fontSize: '14px', fontWeight: '600' }}>{match.robotAName || 'Robot A'}</div>
                                                <small className="text-muted" style={{ fontSize: '11px' }}>
                                                    <i className="tim-icons icon-single-02 mr-1" />
                                                    {match.teamAName || '-'}
                                                </small>
                                            </div>
                                        </Col>
                                        <Col md="2" className="d-flex align-items-center justify-content-center mb-2 mb-md-0">
                                            <div className="text-center">
                                                <div style={{ fontSize: '18px', fontWeight: '900', opacity: 0.7 }}>VS</div>
                                                {winner === 'TIE' && (
                                                    <Badge color="warning" className="mt-1" style={{ fontSize: '10px' }}>
                                                        {t('tie') || 'REMÍZA'}
                                                    </Badge>
                                                )}
                                            </div>
                                        </Col>
                                        <Col md="5">
                                            <div 
                                                className="robot-info-box p-2 h-100 d-flex flex-column justify-content-center" 
                                                style={{ 
                                                    background: winner === 'B' ? 'rgba(94, 114, 228, 0.25)' : 'rgba(94, 114, 228, 0.1)', 
                                                    borderRadius: '10px',
                                                    border: winner === 'B' ? '3px solid #5e72e4' : '1px solid rgba(94, 114, 228, 0.3)',
                                                    transition: 'all 0.3s ease',
                                                    textAlign: 'center'
                                                }}
                                            >
                                                {winner === 'B' && (
                                                    <Badge color="primary" className="mb-1" style={{ fontSize: '10px', alignSelf: 'center' }}>
                                                        <i className="tim-icons icon-trophy mr-1" />
                                                        {t('winner') || 'VÍTĚZ'}
                                                    </Badge>
                                                )}
                                                <div style={{ fontSize: '32px', fontWeight: '900', color: '#5e72e4', lineHeight: '1.1' }}>
                                                    {match.robotBNumber || '?'}
                                                </div>
                                                <div className="mb-0" style={{ fontSize: '14px', fontWeight: '600' }}>{match.robotBName || 'Robot B'}</div>
                                                <small className="text-muted" style={{ fontSize: '11px' }}>
                                                    <i className="tim-icons icon-single-02 mr-1" />
                                                    {match.teamBName || '-'}
                                                </small>
                                            </div>
                                        </Col>
                                    </Row>

                                    {/* Win condition hint */}
                                    <Alert color="info" className="text-center mb-2 py-1 mx-3" style={{ borderRadius: '8px', fontSize: '12px' }}>
                                        <i className="tim-icons icon-bulb-63 mr-1" />
                                        {match.highScoreWin 
                                            ? (t('highScoreWinsHint') || 'Robot s vyšším skóre vyhrává (např. RoboSumo - počet výher)')
                                            : (t('lowScoreWinsHint') || 'Robot s nižším skóre vyhrává (např. Line Follower - kratší čas)')
                                        }
                                    </Alert>

                                    {/* Stopwatch for TIME disciplines - Two Robots */}
                                    {isTimeScore && (
                                        <div style={{ 
                                            background: 'rgba(255,255,255,0.05)', 
                                            borderRadius: '8px', 
                                            padding: '12px',
                                            margin: '0 10px 10px 10px',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            <Row className="align-items-center">
                                                <Col md="4" className="text-center mb-2 mb-md-0">
                                                    <Label className="mb-2 d-block" style={{ fontSize: '12px' }}>
                                                        <i className="tim-icons icon-time-alarm mr-1" />
                                                        {t('stopwatchFor') || 'Stopky pro'}:
                                                    </Label>
                                                    <div className="btn-group">
                                                        <Button 
                                                            size="sm"
                                                            color={activeStopwatch === 'A' ? 'success' : 'secondary'}
                                                            onClick={() => !stopwatchRunning && setActiveStopwatch('A')}
                                                            disabled={stopwatchRunning}
                                                            style={{ minWidth: '60px' }}
                                                        >
                                                            {match.robotAName?.substring(0, 8) || 'A'}
                                                        </Button>
                                                        <Button 
                                                            size="sm"
                                                            color={activeStopwatch === 'B' ? 'primary' : 'secondary'}
                                                            onClick={() => !stopwatchRunning && setActiveStopwatch('B')}
                                                            disabled={stopwatchRunning}
                                                            style={{ minWidth: '60px' }}
                                                        >
                                                            {match.robotBName?.substring(0, 8) || 'B'}
                                                        </Button>
                                                    </div>
                                                </Col>
                                                <Col md="4" className="text-center mb-2 mb-md-0">
                                                    <div style={{ 
                                                        fontSize: '28px', 
                                                        fontWeight: 'bold', 
                                                        fontFamily: 'monospace',
                                                        color: stopwatchRunning ? '#2dce89' : 'inherit'
                                                    }}>
                                                        {String(Math.floor(stopwatchElapsed / 60000)).padStart(2, '0')}:
                                                        {String(Math.floor((stopwatchElapsed % 60000) / 1000)).padStart(2, '0')}.
                                                        {String(stopwatchElapsed % 1000).padStart(3, '0')}
                                                    </div>
                                                    <small className="text-muted" style={{ fontSize: '10px' }}>
                                                        {t('pressSpaceToToggle') || 'Stiskni mezerník pro start/stop'}
                                                    </small>
                                                </Col>
                                                <Col md="4" className="text-center">
                                                    <Button 
                                                        size="sm"
                                                        color={stopwatchRunning ? 'danger' : 'success'}
                                                        onClick={toggleStopwatch}
                                                        className="mr-2"
                                                        style={{ minWidth: '80px' }}
                                                    >
                                                        <i className={`tim-icons ${stopwatchRunning ? 'icon-button-pause' : 'icon-triangle-right-17'} mr-1`} />
                                                        {stopwatchRunning ? (t('stop') || 'Stop') : (t('start') || 'Start')}
                                                    </Button>
                                                    <Button 
                                                        size="sm"
                                                        color="warning"
                                                        onClick={resetStopwatch}
                                                        disabled={stopwatchRunning}
                                                    >
                                                        <i className="tim-icons icon-refresh-02" />
                                                    </Button>
                                                </Col>
                                            </Row>
                                        </div>
                                    )}

                                    {/* Score Entry Form - Two Robots */}
                                    <div style={{ 
                                        background: 'rgba(255,255,255,0.03)', 
                                        borderRadius: '8px', 
                                        padding: '10px',
                                        margin: '0 10px'
                                    }}>
                                        <Form onSubmit={(e) => { e.preventDefault(); setConfirmSaveOpen(true); }}>
                                            <Row className="align-items-center">
                                                <Col md="5">
                                                    <FormGroup className="mb-0">
                                                        <Label for="scoreA" className="text-success text-center d-block mb-1" style={{ fontSize: '13px' }}>
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
                                                                    style={{ fontSize: '18px', textAlign: 'center', height: '42px', width: '55px', padding: '4px' }}
                                                                />
                                                                <span style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 3px' }}>:</span>
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
                                                                    style={{ fontSize: '18px', textAlign: 'center', height: '42px', width: '55px', padding: '4px' }}
                                                                />
                                                                <span style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 3px' }}>.</span>
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
                                                                    style={{ fontSize: '18px', textAlign: 'center', height: '42px', width: '60px', padding: '4px' }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <Input
                                                                type="number"
                                                                id="scoreA"
                                                                step="any"
                                                                min="0"
                                                                value={scoreA}
                                                                onChange={(e) => setScoreA(e.target.value)}
                                                                placeholder="0"
                                                                disabled={submitting}
                                                                style={{ fontSize: '24px', textAlign: 'center', height: '46px' }}
                                                            />
                                                        )}
                                                    </FormGroup>
                                                </Col>
                                                <Col md="2" className="d-flex align-items-center justify-content-center">
                                                    <span style={{ fontSize: '28px', fontWeight: 'bold', opacity: 0.5 }}>:</span>
                                                </Col>
                                                <Col md="5">
                                                    <FormGroup className="mb-0">
                                                        <Label for="scoreB" className="text-primary text-center d-block mb-1" style={{ fontSize: '13px' }}>
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
                                                                    style={{ fontSize: '18px', textAlign: 'center', height: '42px', width: '55px', padding: '4px' }}
                                                                />
                                                                <span style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 3px' }}>:</span>
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
                                                                    style={{ fontSize: '18px', textAlign: 'center', height: '42px', width: '55px', padding: '4px' }}
                                                                />
                                                                <span style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 3px' }}>.</span>
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
                                                                    style={{ fontSize: '18px', textAlign: 'center', height: '42px', width: '60px', padding: '4px' }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <Input
                                                                type="number"
                                                                id="scoreB"
                                                                step="any"
                                                                min="0"
                                                                value={scoreB}
                                                                onChange={(e) => setScoreB(e.target.value)}
                                                                placeholder="0"
                                                                disabled={submitting}
                                                                style={{ fontSize: '24px', textAlign: 'center', height: '46px' }}
                                                            />
                                                        )}
                                                    </FormGroup>
                                                </Col>
                                            </Row>
                                        </Form>
                                    </div>
                                </>
                            )}

                            {/* Single Robot Match Layout */}
                            {isSingleRobotMatch && (
                                <>
                                    <Row className="mb-2 justify-content-center mx-2">
                                        <Col md="6" className="text-center">
                                            <div className="robot-info-box p-2" style={{ 
                                                background: 'rgba(45, 206, 137, 0.1)', 
                                                borderRadius: '10px',
                                                border: '1px solid rgba(45, 206, 137, 0.3)'
                                            }}>
                                                <div style={{ fontSize: '32px', fontWeight: '900', color: '#2dce89', lineHeight: '1.1' }}>
                                                    {match.robotANumber || match.robotBNumber || '?'}
                                                </div>
                                                <div className="mb-0" style={{ fontSize: '14px', fontWeight: '600' }}>{match.robotAName || match.robotBName || 'Robot'}</div>
                                                <small className="text-muted" style={{ fontSize: '11px' }}>
                                                    <i className="tim-icons icon-single-02 mr-1" />
                                                    {match.teamAName || match.teamBName || '-'}
                                                </small>
                                            </div>
                                        </Col>
                                    </Row>

                                    {/* Stopwatch for TIME disciplines - Single Robot */}
                                    {isTimeScore && (
                                        <div style={{ 
                                            background: 'rgba(255,255,255,0.05)', 
                                            borderRadius: '8px', 
                                            padding: '12px',
                                            margin: '0 10px 10px 10px',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            <Row className="align-items-center justify-content-center">
                                                <Col md="6" className="text-center mb-2">
                                                    <div style={{ 
                                                        fontSize: '32px', 
                                                        fontWeight: 'bold', 
                                                        fontFamily: 'monospace',
                                                        color: stopwatchRunning ? '#2dce89' : 'inherit'
                                                    }}>
                                                        {String(Math.floor(stopwatchElapsed / 60000)).padStart(2, '0')}:
                                                        {String(Math.floor((stopwatchElapsed % 60000) / 1000)).padStart(2, '0')}.
                                                        {String(stopwatchElapsed % 1000).padStart(3, '0')}
                                                    </div>
                                                    <small className="text-muted" style={{ fontSize: '10px' }}>
                                                        {t('pressSpaceToToggle') || 'Stiskni mezerník pro start/stop'}
                                                    </small>
                                                </Col>
                                            </Row>
                                            <Row className="justify-content-center">
                                                <Col className="text-center">
                                                    <Button 
                                                        size="sm"
                                                        color={stopwatchRunning ? 'danger' : 'success'}
                                                        onClick={toggleStopwatch}
                                                        className="mr-2"
                                                        style={{ minWidth: '100px' }}
                                                    >
                                                        <i className={`tim-icons ${stopwatchRunning ? 'icon-button-pause' : 'icon-triangle-right-17'} mr-1`} />
                                                        {stopwatchRunning ? (t('stop') || 'Stop') : (t('start') || 'Start')}
                                                    </Button>
                                                    <Button 
                                                        size="sm"
                                                        color="warning"
                                                        onClick={resetStopwatch}
                                                        disabled={stopwatchRunning}
                                                    >
                                                        <i className="tim-icons icon-refresh-02 mr-1" />
                                                        Reset
                                                    </Button>
                                                </Col>
                                            </Row>
                                        </div>
                                    )}

                                    {/* Score Entry Form - Single Robot */}
                                    <div style={{ 
                                        background: 'rgba(255,255,255,0.03)', 
                                        borderRadius: '8px', 
                                        padding: '10px',
                                        margin: '0 10px'
                                    }}>
                                        <Form onSubmit={(e) => { e.preventDefault(); setConfirmSaveOpen(true); }}>
                                            <Row className="justify-content-center">
                                                <Col md="6">
                                                    <FormGroup className="mb-0">
                                                        <Label for="scoreA" className="text-center d-block mb-1" style={{ fontSize: '14px' }}>
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
                                                                    style={{ fontSize: '20px', textAlign: 'center', height: '46px', width: '60px', padding: '4px' }}
                                                                />
                                                                <span style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 5px' }}>:</span>
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
                                                                    style={{ fontSize: '20px', textAlign: 'center', height: '46px', width: '60px', padding: '4px' }}
                                                                />
                                                                <span style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 5px' }}>.</span>
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
                                                                    style={{ fontSize: '20px', textAlign: 'center', height: '46px', width: '70px', padding: '4px' }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <Input
                                                                type="number"
                                                                id="scoreA"
                                                                step="any"
                                                                min="0"
                                                                value={scoreA}
                                                                onChange={(e) => setScoreA(e.target.value)}
                                                                placeholder="0"
                                                                disabled={submitting}
                                                                style={{ fontSize: '22px', textAlign: 'center', height: '46px' }}
                                                            />
                                                        )}
                                                        <small className="form-text text-muted text-center" style={{ fontSize: '11px' }}>
                                                            {isTimeScore ? 'mm:ss.ms' : ''}</small>
                                                    </FormGroup>
                                                </Col>
                                            </Row>
                                        </Form>
                                    </div>
                                </>
                            )}

                            {/* Current Score Display (if already set) */}
                            {isDone && !noRobotAssigned && (
                                <Row className="mt-2 mx-2">
                                    <Col>
                                        <Alert color="success" className="text-center mb-0 py-2" style={{ 
                                            backgroundColor: 'rgba(45, 206, 137, 0.2)', 
                                            border: '1px solid #2dce89',
                                            borderRadius: '8px',
                                            fontSize: '13px'
                                        }}>
                                            <i className="tim-icons icon-check-2 mr-2" />
                                            {t('currentScore') || 'Aktuální skóre'}: 
                                            <strong className="ml-2">
                                                {match.scoreA !== null ? match.scoreA : '-'}
                                                {isTwoRobotMatch && ` : ${match.scoreB !== null ? match.scoreB : '-'}`}
                                            </strong>
                                        </Alert>
                                    </Col>
                                </Row>
                            )}

                            {/* Referee Note Section */}
                            {!noRobotAssigned && (
                                <Row className="mt-3 mx-2">
                                    <Col>
                                        {!showNoteInput ? (
                                            <div className="text-center">
                                                <Button 
                                                    color="secondary" 
                                                    size="sm"
                                                    outline
                                                    onClick={() => setShowNoteInput(true)}
                                                >
                                                    <i className="tim-icons icon-paper mr-1" />
                                                    {t('addRefereeNote') || 'Přidat poznámku'}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div style={{ 
                                                background: 'rgba(255,255,255,0.05)', 
                                                borderRadius: '8px', 
                                                padding: '12px',
                                                border: '1px solid rgba(255,255,255,0.1)'
                                            }}>
                                                <FormGroup className="mb-0">
                                                    <Label style={{ fontSize: '12px' }}>
                                                        <i className="tim-icons icon-paper mr-1" />
                                                        {t('refereeNote') || 'Poznámka rozhodčího'}
                                                        <Button 
                                                            close 
                                                            className="ml-2" 
                                                            style={{ fontSize: '14px' }}
                                                            onClick={() => { setShowNoteInput(false); setRefereeNote(''); }}
                                                        />
                                                    </Label>
                                                    <Input
                                                        type="textarea"
                                                        value={refereeNote}
                                                        onChange={(e) => setRefereeNote(e.target.value)}
                                                        placeholder={t('refereeNotePlaceholder') || 'Napište poznámku k zápasu...'}
                                                        rows={2}
                                                        maxLength={1000}
                                                        disabled={submitting}
                                                        style={{ fontSize: '13px' }}
                                                    />
                                                    <small className="text-muted" style={{ fontSize: '10px' }}>
                                                        {refereeNote.length}/1000
                                                    </small>
                                                </FormGroup>
                                            </div>
                                        )}
                                    </Col>
                                </Row>
                            )}
                            
                            {/* Action buttons at bottom */}
                            {!noRobotAssigned && (
                                <Row className="mt-3 pb-1">
                                    <Col className="text-center">
                                        <Button 
                                            color="warning" 
                                            className="mr-2"
                                            onClick={() => setConfirmRematchOpen(true)}
                                            disabled={submitting}
                                            style={{ minWidth: '130px', padding: '8px 16px' }}
                                        >
                                            {submitting ? <Spinner size="sm" /> : <i className="tim-icons icon-refresh-02 mr-1" />}
                                            {t('requestRematch') || 'Opakovat'}
                                        </Button>
                                        <Button 
                                            color="success"
                                            onClick={() => setConfirmSaveOpen(true)}
                                            disabled={submitting}
                                            style={{ minWidth: '130px', padding: '8px 16px' }}
                                        >
                                            {submitting ? <Spinner size="sm" /> : <i className="tim-icons icon-check-2 mr-1" />}
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
