/**
 * MatchGroup - View for displaying matches within a specific group
 * Accessible from the groups tab in MatchManagement
 */
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Card, CardHeader, CardBody, CardTitle,
    Row, Col, Button,
    Table, Badge, Spinner, Alert
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { useAdmin } from "contexts/AdminContext";
import { useToast } from "contexts/ToastContext";
import { ThemeContext, themes } from "contexts/ThemeContext";
import { t } from "translations/translate";
import TablePagination from "components/TablePagination";

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
    const [loading, setLoading] = useState(false);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

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

    useEffect(() => {
        fetchMatches();
    }, [fetchMatches]);

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
                                        onClick={() => navigate('/admin/match-management')}
                                    >
                                        <i className="tim-icons icon-minimal-left" style={{ fontSize: '1.5rem' }} />
                                    </Button>
                                    <CardTitle tag="h4" className="d-inline-block mb-0">
                                        <i className="tim-icons icon-components mr-2" />
                                        {t('group') || 'Skupina'}: <strong>{decodedGroupName}</strong>
                                        {selectedYear && ` (${selectedYear})`}
                                    </CardTitle>
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
                                    {t('noMatchesInGroup') || 'V této skupině nejsou žádné zápasy'}
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
                                                    {match.playgroundName || '-'} <Badge color="info">{match.playgroundNumber}</Badge>
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

            <style>{`
                .table-management tbody tr:hover {
                    background: rgba(255,255,255,0.05);
                }
            `}</style>
        </div>
    );
}

export default MatchGroup;
