/**
 * MatchGroup - View for displaying matches within a specific group
 * Accessible from the groups tab in MatchManagement
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

function MatchGroup() {
    const { groupName } = useParams();
    const decodedGroupName = decodeURIComponent(groupName || '');
    
    const { selectedYear } = useAdmin();
    const { token, tokenExpired } = useUser();
    const toast = useToast();
    const { theme } = useContext(ThemeContext);
    const navigate = useNavigate();
    
    const isDark = theme === themes.dark;

    // State
    const [matches, setMatches] = useState([]);
    const [playgrounds, setPlaygrounds] = useState([]);
    const [robots, setRobots] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    // Filter states - load from localStorage
    const STORAGE_KEY = 'matchGroup_filters';
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
        playgroundID: '',
        phase: 'PRELIMINARY',
        highScoreWin: true
    });
    const [selectedRobotA, setSelectedRobotA] = useState(null);
    const [selectedRobotB, setSelectedRobotB] = useState(null);

    const phases = ['GROUP_STAGE', 'PRELIMINARY', 'ROUND_OF_16', 'QUARTERFINAL', 'SEMIFINAL', 'THIRD_PLACE', 'FINAL'];

    // Fetch matches for this group
    const fetchMatches = useCallback(async () => {
        if (!selectedYear || !decodedGroupName) return;
        setLoading(true);
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/match/byGroup?year=${selectedYear}&group=${encodeURIComponent(decodedGroupName)}`,
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
    }, [selectedYear, decodedGroupName, token, tokenExpired]);

    // Fetch playgrounds
    const fetchPlaygrounds = useCallback(async () => {
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/playground/all`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            if (tokenExpired(response.status)) return;
            
            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                setPlaygrounds(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch playgrounds:', error);
        }
    }, [token, tokenExpired]);

    // Fetch robots for the selected year
    const fetchRobots = useCallback(async () => {
        if (!selectedYear) return;
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
                setRobots(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch robots:', error);
        }
    }, [selectedYear, token, tokenExpired]);

    useEffect(() => {
        fetchMatches();
        fetchPlaygrounds();
        fetchRobots();
    }, [fetchMatches, fetchPlaygrounds, fetchRobots]);

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
            playgroundID: '',
            phase: 'PRELIMINARY',
            highScoreWin: true
        });
        setSelectedRobotA(null);
        setSelectedRobotB(null);
    };

    // Create match
    const handleCreateMatch = async () => {
        if (!newMatch.playgroundID) {
            toast.error(t('playgroundRequired') || 'Hřiště je povinné');
            return;
        }

        try {
            const requestBody = {
                playgroundID: parseInt(newMatch.playgroundID),
                phase: newMatch.phase,
                highScoreWin: newMatch.highScoreWin,
                group: decodedGroupName,
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
                fetchMatches();
            } else {
                toast.error(data.message || t('matchCreateFailed') || 'Nepodařilo se vytvořit zápas');
            }
        } catch (error) {
            toast.error(t('matchCreateFailed') || 'Nepodařilo se vytvořit zápas');
        }
    };

    // Create match and navigate to score entry
    const handleCreateMatchAndScore = async () => {
        if (!newMatch.playgroundID) {
            toast.error(t('playgroundRequired') || 'Hřiště je povinné');
            return;
        }

        try {
            const requestBody = {
                playgroundID: parseInt(newMatch.playgroundID),
                phase: newMatch.phase,
                highScoreWin: newMatch.highScoreWin,
                group: decodedGroupName,
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
                    navigate(`/admin/match-score/${matchId}?from=group`);
                }
            } else {
                toast.error(data.message || t('matchCreateFailed') || 'Nepodařilo se vytvořit zápas');
            }
        } catch (error) {
            toast.error(t('matchCreateFailed') || 'Nepodařilo se vytvořit zápas');
        }
    };

    // Navigate to score entry
    const goToScoreEntry = (matchId) => {
        navigate(`/admin/match-score/${matchId}?from=group`);
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

    // Get playground discipline ID
    const getSelectedPlaygroundDisciplineId = (playgroundId) => {
        const pg = playgrounds.find(p => p.id.toString() === playgroundId);
        return pg?.disciplineID || null;
    };

    // Filter robots by discipline (based on selected playground)
    const getFilteredRobotsForPlayground = (playgroundId) => {
        if (!playgroundId) return [];
        const disciplineId = getSelectedPlaygroundDisciplineId(playgroundId);
        if (!disciplineId) return robots;
        return robots.filter(robot => robot.disciplineID === disciplineId);
    };

    // Get filtered robots for create modal
    const filteredRobotsForCreate = getFilteredRobotsForPlayground(newMatch.playgroundID);

    // Calculate statistics
    const totalMatches = matches.length;
    const doneMatches = matches.filter(m => m.state?.name === 'DONE').length;
    const waitingMatches = matches.filter(m => m.state?.name === 'WAITING').length;
    const rematchMatches = matches.filter(m => m.state?.name === 'REMATCH').length;

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
                                        onClick={() => navigate('/admin/match-management?tab=2')}
                                    >
                                        <i className="tim-icons icon-minimal-left" style={{ fontSize: '1.5rem' }} />
                                    </Button>
                                    <CardTitle tag="h4" className="d-inline-block mb-0">
                                        <i className="tim-icons icon-components mr-2" />
                                        {t('group') || 'Skupina'}: <strong>{decodedGroupName}</strong>
                                    </CardTitle>
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
                                        <small className="text-muted">{t('done') || 'Hotové'}</small>
                                    </div>
                                </Col>
                                <Col md="3">
                                    <div className="text-center p-3" style={{ background: 'rgba(255, 178, 43, 0.1)', borderRadius: '8px' }}>
                                        <h3 className="mb-0 text-warning">{waitingMatches}</h3>
                                        <small className="text-muted">{t('waiting') || 'Čekající'}</small>
                                    </div>
                                </Col>
                                <Col md="3">
                                    <div className="text-center p-3" style={{ background: 'rgba(253, 93, 147, 0.1)', borderRadius: '8px' }}>
                                        <h3 className="mb-0 text-danger">{rematchMatches}</h3>
                                        <small className="text-muted">{t('rematch') || 'Opakování'}</small>
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
                                        ? (t('noMatchesInGroup') || 'V této skupině nejsou žádné zápasy')
                                        : (t('noMatchesMatchingFilters') || 'Žádné zápasy neodpovídají filtrům')
                                    }
                                </Alert>
                            ) : (
                                <Table responsive hover className="table-management">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>{t('playground') || 'Hřiště'}</th>
                                            <th>{t('category') || 'Kategorie'}</th>
                                            <th>{t('robotA') || 'Robot A'}</th>
                                            <th>{t('robotB') || 'Robot B'}</th>
                                            <th>{t('score') || 'Skóre'}</th>
                                            <th>{t('phase') || 'Fáze'}</th>
                                            <th>{t('groupName') || 'Skupina'}</th>
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
                                                    {match.playgroundName || '-'} <Badge color="info">{match.playgroundNumber}</Badge>
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
                                        type="select"
                                        value={newMatch.playgroundID}
                                        onChange={(e) => setNewMatch({ ...newMatch, playgroundID: e.target.value })}
                                    >
                                        <option value="">{t('selectPlayground') || 'Vyberte hřiště'}</option>
                                        {playgrounds.map(pg => (
                                            <option key={pg.id} value={pg.id}>
                                                {pg.name} ({pg.number}) - {pg.disciplineName}
                                            </option>
                                        ))}
                                    </Input>
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

                        {newMatch.playgroundID && (
                            <Alert color="info" className="mb-3">
                                <i className="tim-icons icon-bulb-63 mr-2" />
                                {t('selectedDiscipline') || 'Vybraná disciplína'}: <strong>{playgrounds.find(p => p.id.toString() === newMatch.playgroundID)?.disciplineName}</strong>
                                {' '}({filteredRobotsForCreate.filter(r => r.confirmed).length} {t('confirmedRobotsAvailable') || 'potvrzených robotů k dispozici'})
                            </Alert>
                        )}

                        <Row>
                            <Col md="6">
                                <FormGroup>
                                    <Label>{t('robotA') || 'Robot A'}</Label>
                                    <RobotSearchSelect
                                        robots={filteredRobotsForCreate}
                                        selectedRobot={selectedRobotA}
                                        onSelect={setSelectedRobotA}
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
                                        robots={filteredRobotsForCreate}
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
                                        value={decodedGroupName}
                                        disabled={true}
                                    />
                                    <small className="text-muted">
                                        <i className="tim-icons icon-lock-circle mr-1" />
                                        {t('fieldLockedFromGroup') || 'Skupina je předvyplněna'}
                                    </small>
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
        </div>
    );
}

export default MatchGroup;
