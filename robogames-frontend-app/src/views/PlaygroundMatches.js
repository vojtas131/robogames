/**
 * PlaygroundMatches - View for displaying matches on a specific playground
 * Accessible from the playgrounds tab in MatchManagement
 */
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Card, CardHeader, CardBody, CardTitle,
    Row, Col, Button,
    Table, Badge, Spinner, Alert,
    Modal, ModalHeader, ModalBody, ModalFooter,
    Form, FormGroup, Label, Input,
    InputGroup, InputGroupText
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { useAdmin } from "contexts/AdminContext";
import { useToast } from "contexts/ToastContext";
import { ThemeContext, themes } from "contexts/ThemeContext";
import { t } from "translations/translate";
import TablePagination from "components/TablePagination";
import RobotSearchSelect from "components/RobotSearchSelect";

function PlaygroundMatches() {
    const { playgroundId } = useParams();

    const { selectedYear } = useAdmin();
    const { token, tokenExpired } = useUser();
    const toast = useToast();
    const { theme } = useContext(ThemeContext);
    const navigate = useNavigate();

    const isDark = theme === themes.dark;

    // State
    const [playground, setPlayground] = useState(null);
    const [matches, setMatches] = useState([]);
    const [robots, setRobots] = useState([]);
    const [currentMatch, setCurrentMatch] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingPlayground, setLoadingPlayground] = useState(false);
    const [loadingCurrentMatch, setLoadingCurrentMatch] = useState(false);
    const [skippingMatch, setSkippingMatch] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    // Filter states - load from localStorage
    const STORAGE_KEY = 'playgroundMatches_filters';
    const savedFilters = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const [searchQuery, setSearchQuery] = useState(savedFilters.searchQuery || '');
    const [searchType, setSearchType] = useState(savedFilters.searchType || 'all');
    const [filterPhase, setFilterPhase] = useState(savedFilters.filterPhase || '');
    const [filterState, setFilterState] = useState(savedFilters.filterState || '');
    const [filterCategory, setFilterCategory] = useState(savedFilters.filterCategory || '');

    // Save filters to localStorage when they change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            searchQuery, searchType, filterPhase, filterState, filterCategory
        }));
    }, [searchQuery, searchType, filterPhase, filterState, filterCategory]);

    // Create Match Modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newMatch, setNewMatch] = useState({
        phase: 'PRELIMINARY',
        highScoreWin: true,
        groupName: ''
    });
    const [selectedRobotA, setSelectedRobotA] = useState(null);
    const [selectedRobotB, setSelectedRobotB] = useState(null);

    // Referee Note Modal
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [selectedNote, setSelectedNote] = useState({ matchId: null, note: '' });

    const phases = ['GROUP_STAGE', 'PRELIMINARY', 'ROUND_OF_16', 'QUARTERFINAL', 'SEMIFINAL', 'THIRD_PLACE', 'FINAL'];

    // Fetch playground info
    const fetchPlayground = useCallback(async () => {
        if (!playgroundId) return;
        setLoadingPlayground(true);
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/playground/getByID?id=${playgroundId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            if (tokenExpired(response.status)) return;

            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                setPlayground(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch playground:', error);
        } finally {
            setLoadingPlayground(false);
        }
    }, [playgroundId, token, tokenExpired]);

    // Fetch matches for this playground
    const fetchMatches = useCallback(async () => {
        if (!selectedYear || !playgroundId) return;
        setLoading(true);
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/match/byPlayground?year=${selectedYear}&playgroundID=${playgroundId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            if (tokenExpired(response.status)) return;

            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                setMatches(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch matches:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedYear, playgroundId, token, tokenExpired]);

    // Fetch robots for the selected year and discipline
    const fetchRobots = useCallback(async () => {
        if (!selectedYear || !playground?.disciplineID) {
            // console.log('fetchRobots skipped:', { selectedYear, disciplineID: playground?.disciplineID });
            return;
        }
        // console.log('fetchRobots called:', { selectedYear, disciplineID: playground?.disciplineID });
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/robot/allForYear?year=${selectedYear}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            if (tokenExpired(response.status)) return;

            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                // Filter robots by discipline
                const allRobots = data.data || [];
                const disciplineFiltered = allRobots.filter(
                    robot => robot.disciplineID === playground.disciplineID
                );
                // console.log('Robots loaded:', { total: allRobots.length, filtered: disciplineFiltered.length, disciplineID: playground.disciplineID });
                setRobots(disciplineFiltered);
            }
        } catch (error) {
            console.error('Failed to fetch robots:', error);
        }
    }, [selectedYear, playground?.disciplineID, token, tokenExpired]);

    // Fetch current match for this playground
    const fetchCurrentMatch = useCallback(async () => {
        if (!playgroundId) return;
        setLoadingCurrentMatch(true);
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}module/orderManagement/currentMatch?playgroundId=${playgroundId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            if (tokenExpired(response.status)) return;

            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                setCurrentMatch(data.data);
            } else {
                setCurrentMatch(null);
            }
        } catch (error) {
            console.error('Failed to fetch current match:', error);
            setCurrentMatch(null);
        } finally {
            setLoadingCurrentMatch(false);
        }
    }, [playgroundId, token, tokenExpired]);

    // Skip current match (move to end of queue)
    const handleSkipCurrentMatch = async () => {
        if (!playgroundId) return;
        setSkippingMatch(true);
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}module/orderManagement/skipCurrentMatch?playgroundId=${playgroundId}`,
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
                toast.success(t('matchSkipped') || 'Zápas byl přeskočen');
                fetchCurrentMatch();
            } else if (data.type === 'ERROR' && data.data.includes('queue is empty or has only one match')) {
                toast.error(t('matchSkipQueueEmpty') || 'Nelze přeskočit zápas, fronta je prázdná nebo obsahuje pouze jeden zápas');
            } else {
                toast.error(data.message || t('matchSkipFailed') || 'Nepodařilo se přeskočit zápas');
            }
        } catch (error) {
            toast.error(t('matchSkipFailed') || 'Nepodařilo se přeskočit zápas');
        } finally {
            setSkippingMatch(false);
        }
    };

    useEffect(() => {
        fetchPlayground();
    }, [fetchPlayground]);

    useEffect(() => {
        fetchMatches();
    }, [fetchMatches]);

    useEffect(() => {
        // Fetch robots when playground is loaded and selectedYear is available
        if (playground && selectedYear) {
            // console.log('Triggering fetchRobots:', { playground: playground.id, selectedYear });
            fetchRobots();
        }
    }, [playground, selectedYear, fetchRobots]);

    useEffect(() => {
        fetchCurrentMatch();
    }, [fetchCurrentMatch]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, searchType, filterPhase, filterState, filterCategory]);

    // Filter matches
    const filteredMatches = matches.filter(match => {
        // Search based on selected search type
        const searchLower = searchQuery.toLowerCase();
        let matchesSearch = !searchQuery;

        if (searchQuery) {
            switch (searchType) {
                case 'id':
                    matchesSearch = match.id.toString().includes(searchQuery);
                    break;
                case 'robotName':
                    matchesSearch =
                        (match.robotAName?.toLowerCase().includes(searchLower)) ||
                        (match.robotBName?.toLowerCase().includes(searchLower));
                    break;
                case 'robotNumber':
                    matchesSearch =
                        (match.robotANumber?.toString().includes(searchQuery)) ||
                        (match.robotBNumber?.toString().includes(searchQuery));
                    break;
                case 'teamName':
                    matchesSearch =
                        (match.teamAName?.toLowerCase().includes(searchLower)) ||
                        (match.teamBName?.toLowerCase().includes(searchLower));
                    break;
                case 'all':
                default:
                    matchesSearch =
                        (match.robotAName?.toLowerCase().includes(searchLower)) ||
                        (match.robotBName?.toLowerCase().includes(searchLower)) ||
                        (match.teamAName?.toLowerCase().includes(searchLower)) ||
                        (match.teamBName?.toLowerCase().includes(searchLower)) ||
                        (match.robotANumber?.toString().includes(searchQuery)) ||
                        (match.robotBNumber?.toString().includes(searchQuery)) ||
                        match.id.toString().includes(searchQuery);
                    break;
            }
        }

        // Filter by phase
        const matchesPhase = !filterPhase || match.phaseName === filterPhase;

        // Filter by state
        const matchesState = !filterState || match.state?.name === filterState;

        // Filter by category
        const matchesCategory = !filterCategory ||
            match.categoryA === filterCategory ||
            match.categoryB === filterCategory;

        return matchesSearch && matchesPhase && matchesState && matchesCategory;
    });

    // Reset create modal
    const resetCreateModal = () => {
        setNewMatch({
            phase: 'PRELIMINARY',
            highScoreWin: true,
            groupName: ''
        });
        setSelectedRobotA(null);
        setSelectedRobotB(null);
    };

    // Create match
    const handleCreateMatch = async () => {
        try {
            const requestBody = {
                playgroundID: parseInt(playgroundId),
                phase: newMatch.phase,
                highScoreWin: newMatch.highScoreWin,
                group: newMatch.groupName || null,
                competitionYear: selectedYear  // Include year for matches without robots
            };

            if (selectedRobotA) {
                requestBody.robotAID = selectedRobotA.id;
            }
            if (selectedRobotB) {
                requestBody.robotBID = selectedRobotB.id;
            }

            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/match/create`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(requestBody)
                }
            );
            const data = await response.json();

            if (response.ok && data.type === 'RESPONSE') {
                toast.success(t('matchCreated'));
                setShowCreateModal(false);
                resetCreateModal();
                fetchMatches();
            } else if (data.type === 'ERROR' && data.data.includes("has not started yet")) {
                toast.error(t('compNotStarted'));
            } else if (data.type === 'ERROR' && data.data === 'failure, robots must be from the same category') {
                toast.error(t('matchCategoryMismatch'));
            } else {
                toast.error(t('matchCreateFailed') + ': ' + data.data);
            }
        } catch (error) {
            toast.error(t('matchCreateFailed') + ': ' + error);
        }
    };

    // Create match and navigate to score entry
    const handleCreateMatchAndScore = async () => {
        try {
            const requestBody = {
                playgroundID: parseInt(playgroundId),
                phase: newMatch.phase,
                highScoreWin: newMatch.highScoreWin,
                group: newMatch.groupName || null,
                competitionYear: selectedYear  // Include year for matches without robots
            };

            if (selectedRobotA) {
                requestBody.robotAID = selectedRobotA.id;
            }
            if (selectedRobotB) {
                requestBody.robotBID = selectedRobotB.id;
            }

            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/match/create`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(requestBody)
                }
            );
            const data = await response.json();

            if (response.ok && data.type === 'RESPONSE') {
                toast.success(t('matchCreated') || 'Zápas byl vytvořen');
                setShowCreateModal(false);
                resetCreateModal();
                // Navigate to score entry
                const matchId = data.data?.id;
                if (matchId) {
                    navigate(`/admin/match-score/${matchId}?from=playground`);
                }
            } else if (data.type === 'ERROR' && data.data.includes("has not started yet")) {
                toast.error(t('compNotStarted'));
            } else if (data.type === 'ERROR' && data.data === 'failure, robots must be from the same category') {
                toast.error(t('matchCategoryMismatch'));
            } else {
                toast.error(t('matchCreateFailed') + ': ' + data.data);
            }
        } catch (error) {
            toast.error(t('matchCreateFailed') + ': ' + error);
        }
    };

    // Navigate to score entry
    const goToScoreEntry = (matchId) => {
        navigate(`/admin/match-score/${matchId}?from=playground`);
    };

    const getStateColor = (state) => {
        switch (state) {
            case 'WAITING': return 'warning';
            case 'DONE': return 'success';
            case 'REMATCH': return 'danger';
            default: return 'secondary';
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
            default: return phase || '-';
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

    // Calculate statistics
    const totalMatches = matches.length;
    const doneMatches = matches.filter(m => m.state?.name === 'DONE').length;
    const waitingMatches = matches.filter(m => m.state?.name === 'WAITING').length;
    const rematchMatches = matches.filter(m => m.state?.name === 'REMATCH').length;

    // Get filtered robots (only confirmed)
    const filteredRobots = robots.filter(r => r.confirmed);

    // Get filtered robots for create modal for robot B (filtered by robot A's category)
    const getFilteredRobotsForCreateB = () => {
        const categoryFilter = selectedRobotA?.category || null;
        return categoryFilter ? filteredRobots.filter(robot => robot.category === categoryFilter) : filteredRobots;
    };

    return (
        <div className="content">
            <Row>
                <Col xs="12">
                    <Card>
                        <CardHeader>
                            <Row className="align-items-center">
                                <Col>
                                    <Button
                                        color="link"
                                        className="p-0 mr-3"
                                        onClick={() => navigate('/admin/match-management?tab=3')}
                                    >
                                        <i className="tim-icons icon-minimal-left" style={{ fontSize: '1.5rem' }} />
                                    </Button>
                                    {loadingPlayground ? (
                                        <Spinner size="sm" className="mr-3" />
                                    ) : playground ? (
                                        <span className="mr-3" style={{ fontSize: '1.1rem' }}>
                                            <strong>{playground.name}</strong>
                                            <Badge color="warning" className="ml-2">{playground.number}</Badge>
                                        </span>
                                    ) : (
                                        <span className="mr-3">{t('playground') || 'Hřiště'}</span>
                                    )}
                                    {playground && (
                                        <CardTitle tag="h4" className="d-inline-block mb-0">
                                            <i className="tim-icons icon-square-pin mr-2" />
                                            <Badge color="secondary">{playground.disciplineName}</Badge>
                                        </CardTitle>
                                    )}
                                </Col>
                                <Col xs="auto">
                                    <Button color="success" onClick={() => setShowCreateModal(true)}>
                                        <i className="tim-icons icon-simple-add mr-2" />
                                        {t('createMatch') || 'Vytvořit zápas'}
                                    </Button>
                                </Col>
                            </Row>
                        </CardHeader>
                        <CardBody>
                            {/* Current Match Display */}
                            <Card className="mb-4" style={{
                                background: currentMatch ? 'linear-gradient(135deg, rgba(239, 96, 0, 0.15) 0%, rgba(239, 96, 0, 0.05) 100%)' : 'rgba(255,255,255,0.02)',
                                border: currentMatch ? '2px solid rgba(239, 96, 0, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px'
                            }}>
                                <CardBody className="py-2 px-3">
                                    {loadingCurrentMatch ? (
                                        <div className="text-center py-3">
                                            <Spinner size="sm" color="warning" />
                                        </div>
                                    ) : currentMatch ? (
                                        <>
                                            {/* Header row: Title + Skip button */}
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <div className="d-flex align-items-center">
                                                    <i className="tim-icons icon-bell-55 mr-2" style={{ fontSize: '1.1rem', color: '#ef6000' }} />
                                                    <span className="text-muted d-none d-sm-inline" style={{ fontSize: '0.85rem' }}>
                                                        {t('currentMatchInQueue') || 'Aktuální zápas'}
                                                    </span>
                                                    <Badge className="ml-2 px-2" style={{ fontSize: '0.9rem', fontWeight: 'bold', backgroundColor: '#ef6000' }}>
                                                        #{currentMatch.id}
                                                    </Badge>
                                                </div>
                                                <Button
                                                    color="warning"
                                                    size="sm"
                                                    className="py-1 px-2"
                                                    onClick={handleSkipCurrentMatch}
                                                    disabled={skippingMatch}
                                                    title={t('skipMatch') || 'Přeskočit'}
                                                >
                                                    {skippingMatch ? (
                                                        <Spinner size="sm" />
                                                    ) : (
                                                        <>
                                                            <i className="tim-icons icon-double-right" />
                                                            <span className="d-none d-md-inline ml-1">{t('skipMatch') || 'Přeskočit'}</span>
                                                        </>
                                                    )}
                                                </Button>
                                            </div>

                                            {/* Main content: Robots vs layout */}
                                            <div
                                                className="d-flex flex-column flex-sm-row align-items-center justify-content-center py-2"
                                                style={{
                                                    background: 'rgba(0,0,0,0.15)',
                                                    borderRadius: '8px',
                                                    margin: '0 -0.5rem'
                                                }}
                                            >
                                                {/* Robot A */}
                                                <div className="text-center px-3 py-1">
                                                    {currentMatch.robotAID ? (
                                                        <>
                                                            <div className="d-flex align-items-center justify-content-center">
                                                                <Badge
                                                                    className="mr-2"
                                                                    style={{ fontSize: '1.1rem', padding: '6px 12px', fontWeight: 'bold', backgroundColor: '#ef6000' }}
                                                                >
                                                                    {currentMatch.robotANumber}
                                                                </Badge>
                                                                <strong style={{ fontSize: '1.2rem' }}>{currentMatch.robotAName}</strong>
                                                            </div>
                                                            <small className="text-muted">{currentMatch.teamAName}</small>
                                                        </>
                                                    ) : (
                                                        <span className="text-muted">—</span>
                                                    )}
                                                </div>

                                                {/* VS separator */}
                                                {currentMatch.robotBID && (
                                                    <div className="mx-2 my-2 my-sm-0">
                                                        <span
                                                            className="font-weight-bold"
                                                            style={{
                                                                fontSize: '1.2rem',
                                                                color: '#ef6000',
                                                                textShadow: '0 0 10px rgba(239, 96, 0, 0.5)'
                                                            }}
                                                        >
                                                            VS
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Robot B */}
                                                {currentMatch.robotBID && (
                                                    <div className="text-center px-3 py-1">
                                                        <div className="d-flex align-items-center justify-content-center">
                                                            <Badge
                                                                className="mr-2"
                                                                style={{ fontSize: '1.1rem', padding: '6px 12px', fontWeight: 'bold', backgroundColor: '#ef6000' }}
                                                            >
                                                                {currentMatch.robotBNumber}
                                                            </Badge>
                                                            <strong style={{ fontSize: '1.2rem' }}>{currentMatch.robotBName}</strong>
                                                        </div>
                                                        <small className="text-muted">{currentMatch.teamBName}</small>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer row: Badges + Action button */}
                                            <div className="d-flex flex-wrap justify-content-between align-items-center mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                <div className="d-flex flex-wrap align-items-center" style={{ gap: '6px' }}>
                                                    <Badge color={getStateColor(currentMatch.state?.name)} style={{ fontSize: '0.75rem' }}>
                                                        {currentMatch.state?.name || '-'}
                                                    </Badge>
                                                    {currentMatch.categoryA && (
                                                        <Badge color={getCategoryColor(currentMatch.categoryA)} style={{ fontSize: '0.75rem' }}>
                                                            {getCategoryDisplay(currentMatch.categoryA)}
                                                        </Badge>
                                                    )}
                                                    {currentMatch.group && (
                                                        <Badge color="secondary" style={{ fontSize: '0.75rem' }}>
                                                            {currentMatch.group}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <Button
                                                    color="success"
                                                    size="sm"
                                                    className="mt-2 mt-sm-0"
                                                    onClick={() => goToScoreEntry(currentMatch.id)}
                                                >
                                                    <i className="tim-icons icon-pencil mr-1" />
                                                    {t('writeScore') || 'Zapsat skóre'}
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="d-flex align-items-center justify-content-center py-2 text-muted">
                                            <i className="tim-icons icon-bell-55 mr-2" style={{ opacity: 0.5 }} />
                                            <span>{t('noMatchInQueue') || 'Žádný zápas ve frontě'}</span>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>

                            {/* Statistics */}
                            <Row className="mb-4">
                                <Col md="3">
                                    <div className="text-center p-3" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                        <h3 className="mb-0">{totalMatches}</h3>
                                        <small className="text-muted">{t('totalMatches') || 'Celkem zápasů'}</small>
                                    </div>
                                </Col>
                                <Col md="3">
                                    <div className="text-center p-3" style={{ background: 'rgba(29, 140, 248, 0.1)', borderRadius: '8px' }}>
                                        <h3 className="mb-0 text-success">{doneMatches}</h3>
                                        <small className="text-muted">{t('doneStatus') || 'Hotové'}</small>
                                    </div>
                                </Col>
                                <Col md="3">
                                    <div className="text-center p-3" style={{ background: 'rgba(255, 178, 43, 0.1)', borderRadius: '8px' }}>
                                        <h3 className="mb-0 text-warning">{waitingMatches}</h3>
                                        <small className="text-muted">{t('waitingStatus') || 'Čekající'}</small>
                                    </div>
                                </Col>
                                <Col md="3">
                                    <div className="text-center p-3" style={{ background: 'rgba(253, 93, 147, 0.1)', borderRadius: '8px' }}>
                                        <h3 className="mb-0 text-danger">{rematchMatches}</h3>
                                        <small className="text-muted">{t('rematchStatus') || 'Opakování'}</small>
                                    </div>
                                </Col>
                            </Row>

                            {/* Filters */}
                            <Row className="mb-4">
                                <Col md="2">
                                    <Input
                                        type="select"
                                        value={searchType}
                                        onChange={(e) => setSearchType(e.target.value)}
                                    >
                                        <option value="all">{t('searchAll') || 'Hledat vše'}</option>
                                        <option value="id">{t('searchById') || 'ID zápasu'}</option>
                                        <option value="robotName">{t('searchByRobotName') || 'Jméno robota'}</option>
                                        <option value="robotNumber">{t('searchByRobotNumber') || 'Číslo robota'}</option>
                                        <option value="teamName">{t('searchByTeamName') || 'Název týmu'}</option>
                                    </Input>
                                </Col>
                                <Col md="3">
                                    <InputGroup>
                                        <InputGroupText>
                                            <i className="tim-icons icon-zoom-split" />
                                        </InputGroupText>
                                        <Input
                                            placeholder={
                                                searchType === 'id' ? (t('enterMatchId') || 'Zadejte ID...') :
                                                    searchType === 'robotName' ? (t('enterRobotName') || 'Jméno robota...') :
                                                        searchType === 'robotNumber' ? (t('enterRobotNumber') || 'Číslo robota...') :
                                                            searchType === 'teamName' ? (t('enterTeamName') || 'Název týmu...') :
                                                                (t('searchMatchPlaceholder') || 'ID, robot, tým...')
                                            }
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                        {searchQuery && (
                                            <InputGroupText
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setSearchQuery('')}
                                                title={t('clearSearch') || 'Vymazat'}
                                            >
                                                <i className="tim-icons icon-simple-remove" />
                                            </InputGroupText>
                                        )}
                                    </InputGroup>
                                </Col>
                                <Col md="2">
                                    <Input
                                        type="select"
                                        value={filterPhase}
                                        onChange={(e) => setFilterPhase(e.target.value)}
                                    >
                                        <option value="">{t('allPhases') || 'Všechny fáze'}</option>
                                        {phases.map(phase => (
                                            <option key={phase} value={phase}>
                                                {getPhaseLabel(phase)}
                                            </option>
                                        ))}
                                    </Input>
                                </Col>
                                <Col md="2">
                                    <Input
                                        type="select"
                                        value={filterState}
                                        onChange={(e) => setFilterState(e.target.value)}
                                    >
                                        <option value="">{t('allStates') || 'Všechny stavy'}</option>
                                        <option value="WAITING">{t('waitingStatus') || 'Čekající'}</option>
                                        <option value="DONE">{t('doneStatus') || 'Hotové'}</option>
                                        <option value="REMATCH">{t('rematchStatus') || 'Opakování'}</option>
                                    </Input>
                                </Col>
                                <Col md="2">
                                    <Input
                                        type="select"
                                        value={filterCategory}
                                        onChange={(e) => setFilterCategory(e.target.value)}
                                    >
                                        <option value="">{t('allCategories') || 'Všechny kategorie'}</option>
                                        <option value="LOW_AGE_CATEGORY">{t('pupils') || 'Žáci'}</option>
                                        <option value="HIGH_AGE_CATEGORY">{t('students') || 'Studenti a dospělí'}</option>
                                    </Input>
                                </Col>
                            </Row>

                            {/* Matches Table */}
                            {loading ? (
                                <div className="text-center py-5">
                                    <Spinner color="primary" />
                                </div>
                            ) : filteredMatches.length === 0 ? (
                                <Alert color="info">
                                    <i className="tim-icons icon-alert-circle-exc mr-2" />
                                    {matches.length === 0
                                        ? (t('noMatchesOnPlayground') || 'Na tomto hřišti nejsou žádné zápasy')
                                        : (t('noMatchesMatchingFilters') || 'Žádné zápasy neodpovídají filtrům')
                                    }
                                </Alert>
                            ) : (
                                <Table responsive hover className="table-management">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>{t('category') || 'Kategorie'}</th>
                                            <th>{t('robotA') || 'Robot A'}</th>
                                            <th>{t('robotB') || 'Robot B'}</th>
                                            <th>{t('score') || 'Skóre'}</th>
                                            <th>{t('phase') || 'Fáze'}</th>
                                            <th>{t('groupName') || 'Skupina'}</th>
                                            <th>{t('note') || 'Pozn.'}</th>
                                            <th>{t('state') || 'Stav'}</th>
                                            <th>{t('lastUpdate') || 'Poslední změna'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredMatches
                                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                            .map(match => (
                                                <tr key={match.id}>
                                                    <td>
                                                        <span
                                                            style={{ cursor: 'pointer', color: '#1d8cf8', textDecoration: 'underline' }}
                                                            onClick={() => goToScoreEntry(match.id)}
                                                            title={t('clickToWriteScore') || 'Klikněte pro zápis skóre'}
                                                        >
                                                            #{match.id}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {match.categoryA ? (
                                                            <Badge color={getCategoryColor(match.categoryA)}>
                                                                {getCategoryDisplay(match.categoryA)}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted">-</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {match.robotAID ? (
                                                            <span>
                                                                <a
                                                                    href="#"
                                                                    onClick={(e) => { e.preventDefault(); navigate(`/admin/robot-profile?id=${match.robotAID}`); }}
                                                                    style={{ color: '#5e72e4', cursor: 'pointer' }}
                                                                >
                                                                    <span style={{ backgroundColor: 'rgba(94, 114, 228, 0.15)', padding: '1px 5px', borderRadius: '4px', marginRight: '6px', fontWeight: 'bold' }}>{match.robotANumber}</span>{match.robotAName}
                                                                </a>
                                                                <br />
                                                                <small className="text-muted">{match.teamAName}</small>
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted">-</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {match.robotBID ? (
                                                            <span>
                                                                <a
                                                                    href="#"
                                                                    onClick={(e) => { e.preventDefault(); navigate(`/admin/robot-profile?id=${match.robotBID}`); }}
                                                                    style={{ color: '#5e72e4', cursor: 'pointer' }}
                                                                >
                                                                    <span style={{ backgroundColor: 'rgba(94, 114, 228, 0.15)', padding: '1px 5px', borderRadius: '4px', marginRight: '6px', fontWeight: 'bold' }}>{match.robotBNumber}</span>{match.robotBName}
                                                                </a>
                                                                <br />
                                                                <small className="text-muted">{match.teamBName}</small>
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted">-</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {match.scoreA !== null ? (
                                                            <span>
                                                                <strong>{match.scoreA}</strong>
                                                                {match.robotBID && ` : ${match.scoreB !== null ? match.scoreB : '-'}`}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted">-</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <Badge color="primary">
                                                            {getPhaseLabel(match.phaseName)}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        {match.group ? (
                                                            <Badge color="secondary">
                                                                {match.group}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted">-</span>
                                                        )}
                                                    </td>
                                                    <td className="text-center">
                                                        {match.refereeNote ? (
                                                            <Button
                                                                color="link"
                                                                size="sm"
                                                                className="p-0"
                                                                onClick={() => {
                                                                    setSelectedNote({ matchId: match.id, note: match.refereeNote });
                                                                    setShowNoteModal(true);
                                                                }}
                                                                title={t('clickToViewNote') || 'Klikněte pro zobrazení poznámky'}
                                                            >
                                                                <i className="tim-icons icon-paper" style={{ color: '#1d8cf8', fontSize: '16px' }} />
                                                            </Button>
                                                        ) : (
                                                            <span className="text-muted">-</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <Badge color={getStateColor(match.state?.name)}>
                                                            {match.state?.name || '-'}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <small className="text-muted">
                                                            {match.timestamp ? new Date(match.timestamp).toLocaleString('cs-CZ') : '-'}
                                                        </small>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </Table>
                            )}

                            <TablePagination
                                currentPage={currentPage}
                                totalItems={filteredMatches.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={(page) => setCurrentPage(page)}
                                onItemsPerPageChange={(items) => { setItemsPerPage(items); setCurrentPage(1); }}
                            />
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Create Match Modal */}
            <Modal isOpen={showCreateModal} toggle={() => { setShowCreateModal(false); resetCreateModal(); }} size="lg">
                <ModalHeader toggle={() => { setShowCreateModal(false); resetCreateModal(); }}>
                    <i className="tim-icons icon-simple-add mr-2" />
                    {t('createMatch') || 'Vytvořit zápas'}
                </ModalHeader>
                <ModalBody>
                    <Form>
                        <Row>
                            <Col md="6">
                                <FormGroup>
                                    <Label>{t('playground') || 'Hřiště'} *</Label>
                                    <Input
                                        type="text"
                                        value={playground ? `${playground.name} (${playground.number}) - ${playground.disciplineName}` : (loadingPlayground ? 'Načítání...' : '')}
                                        disabled={true}
                                    />
                                    <small className="text-muted">
                                        <i className="tim-icons icon-lock-circle mr-1" />
                                        {t('fieldLockedFromPlayground') || 'Hřiště je předvyplněno'}
                                    </small>
                                </FormGroup>
                            </Col>
                            <Col md="6">
                                <FormGroup>
                                    <Label>{t('phase') || 'Fáze'}</Label>
                                    <Input
                                        type="select"
                                        value={newMatch.phase}
                                        onChange={(e) => setNewMatch({ ...newMatch, phase: e.target.value })}
                                    >
                                        {phases.map(phase => (
                                            <option key={phase} value={phase}>
                                                {getPhaseLabel(phase)}
                                            </option>
                                        ))}
                                    </Input>
                                </FormGroup>
                            </Col>
                        </Row>

                        {playground ? (
                            <Alert color="info" className="mb-3">
                                <i className="tim-icons icon-bulb-63 mr-2" />
                                {t('selectedDiscipline') || 'Vybraná disciplína'}: <strong>{playground.disciplineName}</strong>
                                {' '}({filteredRobots.length} {t('confirmedRobotsAvailable') || 'potvrzených robotů k dispozici'})
                            </Alert>
                        ) : (
                            <Alert color="warning" className="mb-3">
                                <i className="tim-icons icon-alert-circle-exc mr-2" />
                                {loadingPlayground ? 'Načítání informací o hřišti...' : 'Hřiště nebylo načteno'}
                            </Alert>
                        )}

                        {selectedRobotA && (
                            <Alert color={getCategoryColor(selectedRobotA.category)} className="mb-3">
                                <i className="tim-icons icon-badge mr-2" />
                                {t('selectedCategory') || 'Vybraná kategorie'}: <strong>{getCategoryDisplay(selectedRobotA.category)}</strong>
                                {' '}({t('robotBMustBeSameCategory') || 'Robot B musí být ze stejné kategorie'})
                            </Alert>
                        )}

                        <Row>
                            <Col md="6">
                                <FormGroup>
                                    <Label>{t('robotA') || 'Robot A'}</Label>
                                    <RobotSearchSelect
                                        robots={filteredRobots}
                                        selectedRobot={selectedRobotA}
                                        onSelect={(robot) => {
                                            setSelectedRobotA(robot);
                                            // Clear robot B if category doesn't match
                                            if (robot && selectedRobotB && robot.category !== selectedRobotB.category) {
                                                setSelectedRobotB(null);
                                            }
                                        }}
                                        placeholder={t('searchRobotPlaceholder') || 'Hledat robota (ID, číslo, název)...'}
                                        excludeRobotIds={selectedRobotB ? [selectedRobotB.id] : []}
                                        showDisciplineInfo={true}
                                        showOnlyConfirmed={true}
                                    />
                                </FormGroup>
                            </Col>
                            <Col md="6">
                                <FormGroup>
                                    <Label>{t('robotB') || 'Robot B'} ({t('optional') || 'volitelné'})</Label>
                                    <RobotSearchSelect
                                        robots={getFilteredRobotsForCreateB()}
                                        selectedRobot={selectedRobotB}
                                        onSelect={setSelectedRobotB}
                                        placeholder={t('searchRobotPlaceholder') || 'Hledat robota (ID, číslo, název)...'}
                                        excludeRobotIds={selectedRobotA ? [selectedRobotA.id] : []}
                                        showDisciplineInfo={true}
                                        showOnlyConfirmed={true}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md="6">
                                <FormGroup>
                                    <Label>{t('groupName') || 'Název skupiny'}</Label>
                                    <Input
                                        type="text"
                                        value={newMatch.groupName}
                                        onChange={(e) => setNewMatch({ ...newMatch, groupName: e.target.value })}
                                        placeholder={t('groupName') || 'Název skupiny'}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => { setShowCreateModal(false); resetCreateModal(); }}>
                        {t('cancel') || 'Zrušit'}
                    </Button>
                    <Button color="info" onClick={handleCreateMatchAndScore}>
                        <i className="tim-icons icon-pencil mr-2" />
                        {t('createAndWriteScore') || 'Vytvořit a zapsat skóre'}
                    </Button>
                    <Button color="success" onClick={handleCreateMatch}>
                        <i className="tim-icons icon-check-2 mr-2" />
                        {t('create') || 'Vytvořit'}
                    </Button>
                </ModalFooter>
            </Modal>

            <style>{`
                .table-management tbody tr:hover {
                    background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'};
                }
            `}</style>

            {/* Referee Note Modal */}
            <Modal isOpen={showNoteModal} toggle={() => setShowNoteModal(false)}>
                <ModalHeader toggle={() => setShowNoteModal(false)}>
                    <i className="tim-icons icon-paper mr-2" />
                    {t('refereeNote') || 'Poznámka rozhodčího'} - {t('match') || 'Zápas'} #{selectedNote.matchId}
                </ModalHeader>
                <ModalBody>
                    <div style={{ 
                        background: 'rgba(29, 140, 248, 0.1)', 
                        borderRadius: '8px', 
                        padding: '15px',
                        border: '1px solid rgba(29, 140, 248, 0.3)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                    }}>
                        {selectedNote.note || '-'}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setShowNoteModal(false)}>
                        {t('close') || 'Zavřít'}
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}

export default PlaygroundMatches;
