/**
 * Admin Match Management - Full match management for administrators
 * Allows creating, editing, searching and managing matches
 */
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card, CardHeader, CardBody, CardTitle, CardFooter,
    Row, Col, Button, Input, InputGroup, InputGroupText,
    Table, Badge, Spinner, Modal, ModalHeader, ModalBody, ModalFooter,
    Form, FormGroup, Label, Alert
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { useAdmin } from "contexts/AdminContext";
import { useToast } from "contexts/ToastContext";
import { ThemeContext, themes } from "contexts/ThemeContext";
import { t } from "translations/translate";
import RobotSearchSelect from "components/RobotSearchSelect";

function MatchManagement() {
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
    const [phases, setPhases] = useState([]);
    const [loading, setLoading] = useState(false);

    // Search/Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPlayground, setFilterPlayground] = useState('');
    const [filterPhase, setFilterPhase] = useState('');
    const [filterState, setFilterState] = useState('');

    // Create Match Modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newMatch, setNewMatch] = useState({
        playgroundID: '',
        robotAID: '',
        robotBID: '',
        phase: 'PRELIMINARY',
        highScoreWin: true
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
        // Set available phases
        setPhases(['PRELIMINARY', 'QUARTERFINAL', 'SEMIFINAL', 'FINAL', 'THIRD_PLACE']);
    }, [fetchMatches, fetchPlaygrounds, fetchRobots]);

    // Filter matches
    const filteredMatches = matches.filter(match => {
        // Search by robot name or team name
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery || 
            (match.robotA?.name?.toLowerCase().includes(searchLower)) ||
            (match.robotB?.name?.toLowerCase().includes(searchLower)) ||
            (match.teamAName?.toLowerCase().includes(searchLower)) ||
            (match.teamBName?.toLowerCase().includes(searchLower)) ||
            (match.robotA?.number?.toString().includes(searchQuery)) ||
            (match.robotB?.number?.toString().includes(searchQuery)) ||
            match.id.toString().includes(searchQuery);

        // Filter by playground
        const matchesPlayground = !filterPlayground || 
            match.playground?.id?.toString() === filterPlayground;

        // Filter by phase
        const matchesPhase = !filterPhase || 
            match.phase?.name === filterPhase;

        // Filter by state
        const matchesState = !filterState || 
            match.state?.name === filterState;

        return matchesSearch && matchesPlayground && matchesPhase && matchesState;
    });

    // Reset create modal
    const resetCreateModal = () => {
        setNewMatch({
            playgroundID: '',
            robotAID: '',
            robotBID: '',
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
                highScoreWin: newMatch.highScoreWin
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

    // Open edit modal
    const handleOpenEditModal = (match) => {
        setEditingMatch({
            id: match.id,
            playgroundID: match.playground?.id?.toString() || '',
            phase: match.phase?.name || 'PRELIMINARY',
            highScoreWin: match.highScoreWin !== undefined ? match.highScoreWin : true
        });
        setEditRobotA(match.robotA ? {
            id: match.robotA.id,
            number: match.robotA.number,
            name: match.robotA.name,
            teamName: match.teamAName
        } : null);
        setEditRobotB(match.robotB ? {
            id: match.robotB.id,
            number: match.robotB.number,
            name: match.robotB.name,
            teamName: match.teamBName
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
                robotAID: editRobotA?.id || null,
                robotBID: editRobotB?.id || null
            };

            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/match/edit?id=${editingMatch.id}`,
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
    const getFilteredRobotsForPlayground = (playgroundId) => {
        if (!playgroundId) return [];
        const disciplineId = getSelectedPlaygroundDisciplineId(playgroundId);
        if (!disciplineId) return robots;
        return robots.filter(robot => robot.disciplineID === disciplineId);
    };

    // Get filtered robots for create modal
    const filteredRobotsForCreate = getFilteredRobotsForPlayground(newMatch.playgroundID);
    
    // Get filtered robots for edit modal
    const filteredRobotsForEdit = editingMatch ? getFilteredRobotsForPlayground(editingMatch.playgroundID) : [];

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
                                        {selectedYear && ` (${selectedYear})`}
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
                            {/* Filters */}
                            <Row className="mb-4">
                                <Col md="3">
                                    <InputGroup>
                                        <InputGroupText>
                                            <i className="tim-icons icon-zoom-split" />
                                        </InputGroupText>
                                        <Input
                                            placeholder={t('searchMatchPlaceholder') || 'ID, robot, tým...'}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </InputGroup>
                                </Col>
                                <Col md="3">
                                    <Input
                                        type="select"
                                        value={filterPlayground}
                                        onChange={(e) => setFilterPlayground(e.target.value)}
                                    >
                                        <option value="">{t('allPlaygrounds') || 'Všechna hřiště'}</option>
                                        {playgrounds.map(pg => (
                                            <option key={pg.id} value={pg.id}>
                                                {pg.name} (#{pg.number})
                                            </option>
                                        ))}
                                    </Input>
                                </Col>
                                <Col md="3">
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
                                <Col md="3">
                                    <Input
                                        type="select"
                                        value={filterState}
                                        onChange={(e) => setFilterState(e.target.value)}
                                    >
                                        <option value="">{t('allStates') || 'Všechny stavy'}</option>
                                        <option value="WAITING">{t('waiting') || 'Čekající'}</option>
                                        <option value="DONE">{t('done') || 'Hotové'}</option>
                                        <option value="REMATCH">{t('rematch') || 'Opakování'}</option>
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
                                            <th>{t('robotA') || 'Robot A'}</th>
                                            <th>{t('robotB') || 'Robot B'}</th>
                                            <th>{t('score') || 'Skóre'}</th>
                                            <th>{t('phase') || 'Fáze'}</th>
                                            <th>{t('state') || 'Stav'}</th>
                                            <th>{t('actions') || 'Akce'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredMatches.map(match => (
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
                                                    <Badge color="info">
                                                        {match.playgroundName || '-'} (#{match.playgroundNumber})
                                                    </Badge>
                                                </td>
                                                <td>
                                                    {match.robotA ? (
                                                        <span>
                                                            <strong>#{match.robotA.number}</strong> {match.robotA.name}
                                                            <br />
                                                            <small className="text-muted">{match.teamAName}</small>
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted">-</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {match.robotB ? (
                                                        <span>
                                                            <strong>#{match.robotB.number}</strong> {match.robotB.name}
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
                                                            {match.robotB && ` : ${match.scoreB !== null ? match.scoreB : '-'}`}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted">-</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <Badge color="primary">
                                                        {getPhaseLabel(match.phase?.name)}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Badge color={getStateColor(match.state?.name)}>
                                                        {match.state?.name || '-'}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Button
                                                        color="info"
                                                        size="sm"
                                                        className="mr-1"
                                                        onClick={() => goToScoreEntry(match.id)}
                                                        title={t('writeScore') || 'Zapsat skóre'}
                                                    >
                                                        <i className="tim-icons icon-pencil" />
                                                    </Button>
                                                    <Button
                                                        color="primary"
                                                        size="sm"
                                                        className="mr-1"
                                                        onClick={() => handleOpenEditModal(match)}
                                                        title={t('edit') || 'Upravit'}
                                                    >
                                                        <i className="tim-icons icon-settings" />
                                                    </Button>
                                                    {match.state?.name !== 'REMATCH' && (
                                                        <Button
                                                            color="warning"
                                                            size="sm"
                                                            className="mr-1"
                                                            onClick={() => handleRematch(match.id)}
                                                            title={t('rematch') || 'Opakovat'}
                                                        >
                                                            <i className="tim-icons icon-refresh-02" />
                                                        </Button>
                                                    )}
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

                            <div className="text-muted mt-3">
                                {t('totalMatches') || 'Celkem zápasů'}: {filteredMatches.length}
                            </div>
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
                                                {pg.name} (#{pg.number}) - {pg.disciplineName}
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
                                {' '}({filteredRobotsForCreate.length} {t('robotsAvailable') || 'robotů k dispozici'})
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
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md="6">
                                <FormGroup check>
                                    <Label check>
                                        <Input
                                            type="checkbox"
                                            checked={newMatch.highScoreWin}
                                            onChange={(e) => setNewMatch({ ...newMatch, highScoreWin: e.target.checked })}
                                        />
                                        {t('highScoreWins') || 'Vyšší skóre vyhrává'}
                                    </Label>
                                </FormGroup>
                            </Col>
                        </Row>
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => { setShowCreateModal(false); resetCreateModal(); }}>
                        {t('cancel') || 'Zrušit'}
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
                                                    {pg.name} (#{pg.number}) - {pg.disciplineName}
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
                            <Row>
                                <Col md="6">
                                    <FormGroup>
                                        <Label>{t('robotA') || 'Robot A'}</Label>
                                        <RobotSearchSelect
                                            robots={filteredRobotsForEdit}
                                            selectedRobot={editRobotA}
                                            onSelect={setEditRobotA}
                                            placeholder={t('searchRobotPlaceholder') || 'Hledat robota (ID, číslo, název)...'}
                                            excludeRobotIds={editRobotB ? [editRobotB.id] : []}
                                            showDisciplineInfo={true}
                                        />
                                    </FormGroup>
                                </Col>
                                <Col md="6">
                                    <FormGroup>
                                        <Label>{t('robotB') || 'Robot B'} ({t('optional') || 'volitelné'})</Label>
                                        <RobotSearchSelect
                                            robots={filteredRobotsForEdit}
                                            selectedRobot={editRobotB}
                                            onSelect={setEditRobotB}
                                            placeholder={t('searchRobotPlaceholder') || 'Hledat robota (ID, číslo, název)...'}
                                            excludeRobotIds={editRobotA ? [editRobotA.id] : []}
                                            showDisciplineInfo={true}
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                            <Row>
                                <Col md="6">
                                    <FormGroup check>
                                        <Label check>
                                            <Input
                                                type="checkbox"
                                                checked={editingMatch.highScoreWin}
                                                onChange={(e) => setEditingMatch({ ...editingMatch, highScoreWin: e.target.checked })}
                                            />
                                            {t('highScoreWins') || 'Vyšší skóre vyhrává'}
                                        </Label>
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
                .table-management tbody tr:hover {
                    background: rgba(255,255,255,0.05);
                }
            `}</style>
        </div>
    );
}

export default MatchManagement;
