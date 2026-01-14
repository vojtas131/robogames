/**
 * Admin Match Management - Full match management for administrators
 * Allows creating, editing, searching and managing matches
 */
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Card, CardHeader, CardBody, CardTitle, CardFooter,
    Row, Col, Button, Input, InputGroup, InputGroupText,
    Table, Badge, Spinner, Modal, ModalHeader, ModalBody, ModalFooter,
    Form, FormGroup, Label, Alert, Nav, NavItem, NavLink, TabContent, TabPane
} from 'reactstrap';
import classnames from 'classnames';
import { useUser } from "contexts/UserContext";
import { useAdmin } from "contexts/AdminContext";
import { useToast } from "contexts/ToastContext";
import { ThemeContext, themes } from "contexts/ThemeContext";
import { t } from "translations/translate";
import RobotSearchSelect from "components/RobotSearchSelect";
import TablePagination from "components/TablePagination";

function MatchManagement() {
    const { selectedYear } = useAdmin();
    const { token, tokenExpired } = useUser();
    const toast = useToast();
    const { theme } = useContext(ThemeContext);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const isDark = theme === themes.dark;

    // State
    const [matches, setMatches] = useState([]);
    const [playgrounds, setPlaygrounds] = useState([]);
    const [robots, setRobots] = useState([]);
    const [phases, setPhases] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [loadingPlaygrounds, setLoadingPlaygrounds] = useState(false);
    
    // Active tab - read from URL params
    const tabFromUrl = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(tabFromUrl || '1');

    // Update tab in URL when it changes
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    // Search/Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('all'); // 'all', 'id', 'robotName', 'robotNumber', 'teamName'
    const [filterPlayground, setFilterPlayground] = useState('');
    const [filterPhase, setFilterPhase] = useState('');
    const [filterState, setFilterState] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    // Create Match Modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newMatch, setNewMatch] = useState({
        playgroundID: '',
        robotAID: '',
        robotBID: '',
        phase: 'PRELIMINARY',
        highScoreWin: true,
        groupName: ''
    });
    const [selectedRobotA, setSelectedRobotA] = useState(null);
    const [selectedRobotB, setSelectedRobotB] = useState(null);

    // Edit Match Modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingMatch, setEditingMatch] = useState(null);
    const [editRobotA, setEditRobotA] = useState(null);
    const [editRobotB, setEditRobotB] = useState(null);

    // Fetch matches
    const fetchMatches = useCallback(async () => {
        if (!selectedYear) return;
        setLoading(true);
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/match/allByYear?year=${selectedYear}`,
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
    }, [selectedYear, token, tokenExpired]);

    // Fetch groups
    const fetchGroups = useCallback(async () => {
        if (!selectedYear) return;
        setLoadingGroups(true);
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/match/groups?year=${selectedYear}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            if (tokenExpired(response.status)) return;
            
            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                setGroups(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch groups:', error);
        } finally {
            setLoadingGroups(false);
        }
    }, [selectedYear, token, tokenExpired]);

    // Fetch playgrounds
    const fetchPlaygrounds = useCallback(async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}api/playground/all`);
            if (tokenExpired(response.status)) return;
            
            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                setPlaygrounds(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch playgrounds:', error);
        }
    }, [tokenExpired]);

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
        fetchGroups();
        // Set available phases
        setPhases(['PRELIMINARY', 'QUARTERFINAL', 'SEMIFINAL', 'FINAL', 'THIRD_PLACE']);
    }, [fetchMatches, fetchPlaygrounds, fetchRobots, fetchGroups]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, searchType, filterPlayground, filterPhase, filterState, filterCategory]);

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

        // Filter by playground
        const matchesPlayground = !filterPlayground || 
            match.playgroundID?.toString() === filterPlayground;

        // Filter by phase
        const matchesPhase = !filterPhase || 
            match.phaseName === filterPhase;

        // Filter by state
        const matchesState = !filterState || 
            match.state?.name === filterState;

        // Filter by category
        const matchesCategory = !filterCategory || 
            match.categoryA === filterCategory ||
            match.categoryB === filterCategory;

        return matchesSearch && matchesPlayground && matchesPhase && matchesState && matchesCategory;
    });

    // Reset create modal
    const resetCreateModal = () => {
        setNewMatch({
            playgroundID: '',
            robotAID: '',
            robotBID: '',
            phase: 'PRELIMINARY',
            highScoreWin: true,
            groupName: ''
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
                // Navigate to score entry for the newly created match
                const newMatchId = data.data?.id || data.data;
                if (newMatchId) {
                    navigate(`/admin/match-score/${newMatchId}`);
                }
            } else {
                toast.error(data.message || t('matchCreateFailed') || 'Nepodařilo se vytvořit zápas');
            }
        } catch (error) {
            toast.error(t('matchCreateFailed') || 'Nepodařilo se vytvořit zápas');
        }
    };

    // Open edit modal
    const handleOpenEditModal = (match) => {
        setEditingMatch({
            id: match.id,
            playgroundID: match.playgroundID?.toString() || '',
            phase: match.phaseName || 'PRELIMINARY',
            highScoreWin: match.highScoreWin !== undefined ? match.highScoreWin : true,
            groupName: match.group || ''
        });
        setEditRobotA(match.robotAID ? {
            id: match.robotAID,
            number: match.robotANumber,
            name: match.robotAName,
            teamName: match.teamAName,
            category: match.categoryA
        } : null);
        setEditRobotB(match.robotBID ? {
            id: match.robotBID,
            number: match.robotBNumber,
            name: match.robotBName,
            teamName: match.teamBName,
            category: match.categoryB
        } : null);
        setShowEditModal(true);
    };

    // Update match
    const handleUpdateMatch = async () => {
        if (!editingMatch.playgroundID) {
            toast.error(t('playgroundRequired') || 'Hřiště je povinné');
            return;
        }

        try {
            const requestBody = {
                playgroundID: parseInt(editingMatch.playgroundID),
                phase: editingMatch.phase,
                highScoreWin: editingMatch.highScoreWin,
                robotAID: editRobotA?.id || 0,  // 0 means remove robot
                robotBID: editRobotB?.id || 0,  // 0 means remove robot
                group: editingMatch.groupName || null
            };

            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/match/update?id=${editingMatch.id}`,
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
                toast.success(t('matchUpdated') || 'Zápas byl aktualizován');
                setShowEditModal(false);
                setEditingMatch(null);
                fetchMatches();
            } else {
                toast.error(data.message || t('matchUpdateFailed') || 'Nepodařilo se aktualizovat zápas');
            }
        } catch (error) {
            toast.error(t('matchUpdateFailed') || 'Nepodařilo se aktualizovat zápas');
        }
    };

    // Delete match
    const handleDeleteMatch = async (matchId) => {
        if (!window.confirm(t('confirmDeleteMatch') || 'Opravdu chcete smazat tento zápas?')) {
            return;
        }

        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/match/remove?id=${matchId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            const data = await response.json();

            if (response.ok && data.type === 'RESPONSE') {
                toast.success(t('matchDeleted') || 'Zápas byl smazán');
                fetchMatches();
            } else {
                toast.error(data.message || t('matchDeleteFailed') || 'Nepodařilo se smazat zápas');
            }
        } catch (error) {
            toast.error(t('matchDeleteFailed') || 'Nepodařilo se smazat zápas');
        }
    };

    // Request rematch
    const handleRematch = async (matchId) => {
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
            const data = await response.json();

            if (response.ok && data.type === 'RESPONSE') {
                toast.success(t('rematchRequested') || 'Opakování zápasu bylo vyžádáno');
                fetchMatches();
            } else {
                toast.error(data.message || t('rematchFailed') || 'Nepodařilo se vyžádat opakování');
            }
        } catch (error) {
            toast.error(t('rematchFailed') || 'Nepodařilo se vyžádat opakování');
        }
    };

    // Navigate to score entry
    const goToScoreEntry = (matchId) => {
        navigate(`/admin/match-score/${matchId}`);
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
            case 'PRELIMINARY': return t('phasePreliminary') || 'Předkolo';
            case 'QUARTERFINAL': return t('phaseQuarterfinal') || 'Čtvrtfinále';
            case 'SEMIFINAL': return t('phaseSemifinal') || 'Semifinále';
            case 'FINAL': return t('phaseFinal') || 'Finále';
            case 'THIRD_PLACE': return t('phaseThirdPlace') || 'O 3. místo';
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

    // Get playground discipline
    const getSelectedPlaygroundDiscipline = (playgroundId) => {
        const pg = playgrounds.find(p => p.id.toString() === playgroundId);
        return pg?.disciplineName || null;
    };

    // Get playground discipline ID
    const getSelectedPlaygroundDisciplineId = (playgroundId) => {
        const pg = playgrounds.find(p => p.id.toString() === playgroundId);
        return pg?.disciplineID || null;
    };

    // Filter robots by discipline (based on selected playground)
    const getFilteredRobotsForPlayground = (playgroundId, selectedCategory = null) => {
        if (!playgroundId) return [];
        const disciplineId = getSelectedPlaygroundDisciplineId(playgroundId);
        let filtered = disciplineId ? robots.filter(robot => robot.disciplineID === disciplineId) : robots;
        // If category is specified, filter by it too
        if (selectedCategory) {
            filtered = filtered.filter(robot => robot.category === selectedCategory);
        }
        return filtered;
    };

    // Get filtered robots for create modal (considering selected robot A's category)
    const getFilteredRobotsForCreateA = () => {
        return getFilteredRobotsForPlayground(newMatch.playgroundID);
    };

    // Get filtered robots for create modal for robot B (filtered by robot A's category)
    const getFilteredRobotsForCreateB = () => {
        const categoryFilter = selectedRobotA?.category || null;
        return getFilteredRobotsForPlayground(newMatch.playgroundID, categoryFilter);
    };

    // Get filtered robots for edit modal for robot A
    const getFilteredRobotsForEditA = () => {
        if (!editingMatch) return [];
        return getFilteredRobotsForPlayground(editingMatch.playgroundID);
    };

    // Get filtered robots for edit modal for robot B (filtered by robot A's category)
    const getFilteredRobotsForEditB = () => {
        if (!editingMatch) return [];
        const categoryFilter = editRobotA?.category || null;
        return getFilteredRobotsForPlayground(editingMatch.playgroundID, categoryFilter);
    };

    return (
        <div className="content">
            <Row>
                <Col xs="12">
                    <Card>
                        <CardHeader>
                            <Row className="align-items-center">
                                <Col>
                                    <CardTitle tag="h4">
                                        <i className="tim-icons icon-controller mr-2" />
                                        {t('matchManagement') || 'Správa zápasů'}
                                    </CardTitle>
                                </Col>
                                {activeTab === '1' && (
                                    <Col xs="auto">
                                        <Button color="success" onClick={() => setShowCreateModal(true)}>
                                            <i className="tim-icons icon-simple-add mr-2" />
                                            {t('createMatch') || 'Vytvořit zápas'}
                                        </Button>
                                    </Col>
                                )}
                            </Row>
                        </CardHeader>
                        <CardBody>
                            {/* Tabs Navigation */}
                            <Nav tabs className="mb-4">
                                <NavItem>
                                    <NavLink
                                        className={classnames({ active: activeTab === '1' })}
                                        onClick={() => handleTabChange('1')}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <i className="tim-icons icon-bullet-list-67 mr-2" />
                                        {t('matchesList') || 'Seznam zápasů'}
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink
                                        className={classnames({ active: activeTab === '2' })}
                                        onClick={() => handleTabChange('2')}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <i className="tim-icons icon-components mr-2" />
                                        {t('matchGroups') || 'Skupiny'}
                                        {groups.length > 0 && (
                                            <Badge color="primary" className="ml-2">{groups.length}</Badge>
                                        )}
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink
                                        className={classnames({ active: activeTab === '3' })}
                                        onClick={() => handleTabChange('3')}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <i className="tim-icons icon-square-pin mr-2" />
                                        {t('matchPlaygrounds') || 'Hřiště'}
                                        {playgrounds.length > 0 && (
                                            <Badge color="info" className="ml-2">{playgrounds.length}</Badge>
                                        )}
                                    </NavLink>
                                </NavItem>
                            </Nav>

                            <TabContent activeTab={activeTab}>
                                {/* Tab 1: Matches List */}
                                <TabPane tabId="1">
                                    {/* Statistics */}
                                    <Row className="mb-4">
                                        <Col md="3">
                                            <div className="text-center p-3" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                                <h3 className="mb-0">{matches.length}</h3>
                                                <small className="text-muted">{t('totalMatches') || 'Celkem zápasů'}</small>
                                            </div>
                                        </Col>
                                        <Col md="3">
                                            <div className="text-center p-3" style={{ background: 'rgba(29, 140, 248, 0.1)', borderRadius: '8px' }}>
                                                <h3 className="mb-0 text-success">{matches.filter(m => m.state?.name === 'DONE').length}</h3>
                                                <small className="text-muted">{t('doneStatus') || 'Hotové'}</small>
                                            </div>
                                        </Col>
                                        <Col md="3">
                                            <div className="text-center p-3" style={{ background: 'rgba(255, 178, 43, 0.1)', borderRadius: '8px' }}>
                                                <h3 className="mb-0 text-warning">{matches.filter(m => m.state?.name === 'WAITING').length}</h3>
                                                <small className="text-muted">{t('waitingStatus') || 'Čekající'}</small>
                                            </div>
                                        </Col>
                                        <Col md="3">
                                            <div className="text-center p-3" style={{ background: 'rgba(253, 93, 147, 0.1)', borderRadius: '8px' }}>
                                                <h3 className="mb-0 text-danger">{matches.filter(m => m.state?.name === 'REMATCH').length}</h3>
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
                                                <option value="all">{t('searchAll') || 'Vše'}</option>
                                                <option value="id">{t('searchById') || 'ID zápasu'}</option>
                                                <option value="robotName">{t('searchByRobotName') || 'Jméno robota'}</option>
                                                <option value="robotNumber">{t('searchByRobotNumber') || 'Číslo robota'}</option>
                                                <option value="teamName">{t('searchByTeamName') || 'Název týmu'}</option>
                                            </Input>
                                        </Col>
                                        <Col md="2">
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
                                                value={filterPlayground}
                                                onChange={(e) => setFilterPlayground(e.target.value)}
                                            >
                                                <option value="">{t('allPlaygrounds') || 'Všechna hřiště'}</option>
                                                {playgrounds.map(pg => (
                                                    <option key={pg.id} value={pg.id}>
                                                        {pg.name} ({pg.number})
                                                    </option>
                                                ))}
                                            </Input>
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
                                            {t('noMatchesFound') || 'Žádné zápasy nenalezeny'}
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
                                                    <th>{t('actions') || 'Akce'}</th>
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
                                                        <td>
                                                            <Button
                                                                color="primary"
                                                                size="sm"
                                                                className="mr-1"
                                                                onClick={() => handleOpenEditModal(match)}
                                                                title={t('edit') || 'Upravit'}
                                                            >
                                                                <i className="tim-icons icon-settings" />
                                                            </Button>
                                                            <Button
                                                                color="danger"
                                                                size="sm"
                                                                onClick={() => handleDeleteMatch(match.id)}
                                                                title={t('delete') || 'Smazat'}
                                                            >
                                                                <i className="tim-icons icon-trash-simple" />
                                                            </Button>
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
                                </TabPane>

                                {/* Tab 2: Groups List */}
                                <TabPane tabId="2">
                                    {loadingGroups ? (
                                        <div className="text-center py-5">
                                            <Spinner color="primary" />
                                        </div>
                                    ) : groups.length === 0 ? (
                                        <Alert color="info">
                                            <i className="tim-icons icon-alert-circle-exc mr-2" />
                                            {t('noGroupsFound') || 'Žádné skupiny nenalezeny'}
                                            <br />
                                            <small>{t('noGroupsHint') || 'Skupiny se vytvoří přiřazením atributu "group" k zápasům.'}</small>
                                        </Alert>
                                    ) : (
                                        <Row>
                                            {groups.map((groupName, index) => {
                                                // Count matches in this group
                                                const groupMatches = matches.filter(m => m.group === groupName);
                                                const doneMatches = groupMatches.filter(m => m.state?.name === 'DONE').length;
                                                
                                                return (
                                                    <Col md="4" lg="3" key={groupName}>
                                                        <Card 
                                                            className="group-card mb-3"
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => navigate(`/admin/match-group/${encodeURIComponent(groupName)}`)}
                                                        >
                                                            <CardBody className="text-center py-4">
                                                                <i className="tim-icons icon-components mb-3" style={{ fontSize: '2rem', color: '#1d8cf8' }} />
                                                                <h4 className="mb-2">{groupName}</h4>
                                                                <Badge color="info" className="mr-1">
                                                                    {groupMatches.length} {t('matches') || 'zápasů'}
                                                                </Badge>
                                                                <Badge color="success">
                                                                    {doneMatches} {t('doneStatus') || 'hotových'}
                                                                </Badge>
                                                            </CardBody>
                                                        </Card>
                                                    </Col>
                                                );
                                            })}
                                        </Row>
                                    )}

                                    <div className="text-muted mt-3">
                                        {t('totalGroups') || 'Celkem skupin'}: {groups.length}
                                    </div>
                                </TabPane>

                                {/* Tab 3: Playgrounds List */}
                                <TabPane tabId="3">
                                    {loadingPlaygrounds ? (
                                        <div className="text-center py-5">
                                            <Spinner color="primary" />
                                        </div>
                                    ) : playgrounds.length === 0 ? (
                                        <Alert color="info">
                                            <i className="tim-icons icon-alert-circle-exc mr-2" />
                                            {t('noPlaygroundsFound') || 'Žádná hřiště nenalezena'}
                                        </Alert>
                                    ) : (
                                        <Row>
                                            {playgrounds.map((pg) => {
                                                // Count matches on this playground
                                                const pgMatches = matches.filter(m => m.playgroundID === pg.id);
                                                const doneMatches = pgMatches.filter(m => m.state?.name === 'DONE').length;
                                                
                                                return (
                                                    <Col md="4" lg="3" key={pg.id}>
                                                        <Card 
                                                            className="playground-card mb-3"
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => navigate(`/admin/playground-matches/${pg.id}`)}
                                                        >
                                                            <CardBody className="text-center py-4">
                                                                <i className="tim-icons icon-square-pin mb-3" style={{ fontSize: '2rem', color: '#e14eca' }} />
                                                                <h4 className="mb-1">{pg.name}</h4>
                                                                <p className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>
                                                                    #{pg.number} - {pg.disciplineName}
                                                                </p>
                                                                <Badge color="info" className="mr-1">
                                                                    {pgMatches.length} {t('matches') || 'zápasů'}
                                                                </Badge>
                                                                <Badge color="success">
                                                                    {doneMatches} {t('doneStatus') || 'hotových'}
                                                                </Badge>
                                                            </CardBody>
                                                        </Card>
                                                    </Col>
                                                );
                                            })}
                                        </Row>
                                    )}

                                    <div className="text-muted mt-3">
                                        {t('totalPlaygrounds') || 'Celkem hřišť'}: {playgrounds.length}
                                    </div>
                                </TabPane>
                            </TabContent>
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
                                {t('selectedDiscipline') || 'Vybraná disciplína'}: <strong>{getSelectedPlaygroundDiscipline(newMatch.playgroundID)}</strong>
                                {' '}({getFilteredRobotsForCreateA().filter(r => r.confirmed).length} {t('confirmedRobotsAvailable') || 'potvrzených robotů k dispozici'})
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
                                        robots={getFilteredRobotsForCreateA()}
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

            {/* Edit Match Modal */}
            <Modal isOpen={showEditModal} toggle={() => setShowEditModal(false)} size="lg">
                <ModalHeader toggle={() => setShowEditModal(false)}>
                    <i className="tim-icons icon-settings mr-2" />
                    {t('editMatch') || 'Upravit zápas'} #{editingMatch?.id}
                </ModalHeader>
                <ModalBody>
                    {editingMatch && (
                        <Form>
                            <Row>
                                <Col md="6">
                                    <FormGroup>
                                        <Label>{t('playground') || 'Hřiště'} *</Label>
                                        <Input
                                            type="select"
                                            value={editingMatch.playgroundID}
                                            onChange={(e) => setEditingMatch({ ...editingMatch, playgroundID: e.target.value })}
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
                                            value={editingMatch.phase}
                                            onChange={(e) => setEditingMatch({ ...editingMatch, phase: e.target.value })}
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

                            {editRobotA && (
                                <Alert color={getCategoryColor(editRobotA.category)} className="mb-3">
                                    <i className="tim-icons icon-badge mr-2" />
                                    {t('selectedCategory') || 'Vybraná kategorie'}: <strong>{getCategoryDisplay(editRobotA.category)}</strong>
                                    {' '}({t('robotBMustBeSameCategory') || 'Robot B musí být ze stejné kategorie'})
                                </Alert>
                            )}

                            <Row>
                                <Col md="6">
                                    <FormGroup>
                                        <Label>{t('robotA') || 'Robot A'}</Label>
                                        <RobotSearchSelect
                                            robots={getFilteredRobotsForEditA()}
                                            selectedRobot={editRobotA}
                                            onSelect={(robot) => {
                                                setEditRobotA(robot);
                                                // Clear robot B if category doesn't match
                                                if (robot && editRobotB && robot.category !== editRobotB.category) {
                                                    setEditRobotB(null);
                                                }
                                            }}
                                            placeholder={t('searchRobotPlaceholder') || 'Hledat robota (ID, číslo, název)...'}
                                            excludeRobotIds={editRobotB ? [editRobotB.id] : []}
                                            showDisciplineInfo={true}
                                            showOnlyConfirmed={true}
                                        />
                                    </FormGroup>
                                </Col>
                                <Col md="6">
                                    <FormGroup>
                                        <Label>{t('robotB') || 'Robot B'} ({t('optional') || 'volitelné'})</Label>
                                        <RobotSearchSelect
                                            robots={getFilteredRobotsForEditB()}
                                            selectedRobot={editRobotB}
                                            onSelect={setEditRobotB}
                                            placeholder={t('searchRobotPlaceholder') || 'Hledat robota (ID, číslo, název)...'}
                                            excludeRobotIds={editRobotA ? [editRobotA.id] : []}
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
                                            value={editingMatch.groupName}
                                            onChange={(e) => setEditingMatch({ ...editingMatch, groupName: e.target.value })}
                                            placeholder={t('groupName') || 'Název skupiny'}
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                        </Form>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setShowEditModal(false)}>
                        {t('cancel') || 'Zrušit'}
                    </Button>
                    <Button color="primary" onClick={handleUpdateMatch}>
                        <i className="tim-icons icon-check-2 mr-2" />
                        {t('save') || 'Uložit'}
                    </Button>
                </ModalFooter>
            </Modal>

            <style>{`
                .playground-card {
                    transition: all 0.3s ease;
                }
                .playground-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }
                .group-card {
                    transition: all 0.3s ease;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .group-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    border-color: #1d8cf8;
                }
                .table-management tbody tr:hover {
                    background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'};
                }
                .nav-tabs .nav-link {
                    border: none;
                    color: ${isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'};
                }
                .nav-tabs .nav-link.active {
                    background: transparent;
                    border-bottom: 2px solid #1d8cf8;
                    color: ${isDark ? '#fff' : '#344675'};
                }
                .nav-tabs .nav-link:hover {
                    color: #1d8cf8;
                }
            `}</style>
        </div>
    );
}

export default MatchManagement;
