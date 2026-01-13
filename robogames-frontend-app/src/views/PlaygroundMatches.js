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
    Form, FormGroup, Label, Input
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
    const [loading, setLoading] = useState(false);
    const [loadingPlayground, setLoadingPlayground] = useState(false);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    // Create Match Modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newMatch, setNewMatch] = useState({
        phase: 'PRELIMINARY',
        highScoreWin: true,
        groupName: ''
    });
    const [selectedRobotA, setSelectedRobotA] = useState(null);
    const [selectedRobotB, setSelectedRobotB] = useState(null);

    const phases = ['PRELIMINARY', 'QUARTERFINAL', 'SEMIFINAL', 'FINAL', 'THIRD_PLACE'];

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
            console.log('fetchRobots skipped:', { selectedYear, disciplineID: playground?.disciplineID });
            return;
        }
        console.log('fetchRobots called:', { selectedYear, disciplineID: playground?.disciplineID });
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
                console.log('Robots loaded:', { total: allRobots.length, filtered: disciplineFiltered.length, disciplineID: playground.disciplineID });
                setRobots(disciplineFiltered);
            }
        } catch (error) {
            console.error('Failed to fetch robots:', error);
        }
    }, [selectedYear, playground?.disciplineID, token, tokenExpired]);

    useEffect(() => {
        fetchPlayground();
    }, [fetchPlayground]);

    useEffect(() => {
        fetchMatches();
    }, [fetchMatches]);

    useEffect(() => {
        // Fetch robots when playground is loaded and selectedYear is available
        if (playground && selectedYear) {
            console.log('Triggering fetchRobots:', { playground: playground.id, selectedYear });
            fetchRobots();
        }
    }, [playground, selectedYear, fetchRobots]);

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
            } else {
                toast.error(data.message || t('matchCreateFailed') || 'Nepodařilo se vytvořit zápas');
            }
        } catch (error) {
            toast.error(t('matchCreateFailed') || 'Nepodařilo se vytvořit zápas');
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
            case 'PRELIMINARY': return t('phasePreliminary') || 'Předkolo';
            case 'QUARTERFINAL': return t('phaseQuarterfinal') || 'Čtvrtfinále';
            case 'SEMIFINAL': return t('phaseSemifinal') || 'Semifinále';
            case 'FINAL': return t('phaseFinal') || 'Finále';
            case 'THIRD_PLACE': return t('phaseThirdPlace') || 'O 3. místo';
            default: return phase || '-';
        }
    };

    // Calculate statistics
    const totalMatches = matches.length;
    const doneMatches = matches.filter(m => m.state?.name === 'DONE').length;
    const waitingMatches = matches.filter(m => m.state?.name === 'WAITING').length;
    const rematchMatches = matches.filter(m => m.state?.name === 'REMATCH').length;

    // Get filtered robots (only confirmed)
    const filteredRobots = robots.filter(r => r.confirmed);

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
                                    <CardTitle tag="h4" className="d-inline-block mb-0">
                                        <i className="tim-icons icon-square-pin mr-2" />
                                        {loadingPlayground ? (
                                            <Spinner size="sm" />
                                        ) : playground ? (
                                            <>
                                                {playground.name} <Badge color="info">#{playground.number}</Badge>
                                                <small className="text-muted ml-2">({playground.disciplineName})</small>
                                            </>
                                        ) : (
                                            t('playground') || 'Hřiště'
                                        )}
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

                            {/* Matches Table */}
                            {loading ? (
                                <div className="text-center py-5">
                                    <Spinner color="primary" />
                                </div>
                            ) : matches.length === 0 ? (
                                <Alert color="info">
                                    <i className="tim-icons icon-alert-circle-exc mr-2" />
                                    {t('noMatchesOnPlayground') || 'Na tomto hřišti nejsou žádné zápasy'}
                                </Alert>
                            ) : (
                                <Table responsive hover className="table-management">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
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
                                        {matches
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
                                totalItems={matches.length}
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

                        <Row>
                            <Col md="6">
                                <FormGroup>
                                    <Label>{t('robotA') || 'Robot A'}</Label>
                                    <RobotSearchSelect
                                        robots={filteredRobots}
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
                                        robots={filteredRobots}
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
        </div>
    );
}

export default PlaygroundMatches;
