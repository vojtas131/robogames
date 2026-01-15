/**
 * TournamentView - Public view for tournament/competition visualization
 * 
 * Features:
 * - Tournament mode: Groups (round-robin matrix) + Bracket (elimination)
 * - Regular mode: Simple standings table sorted by score
 * - Works for any discipline type
 * - Visual bracket using react-brackets library
 */

import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import {
    Card, CardHeader, CardBody, CardTitle,
    Row, Col, Table, Badge, Progress,
    Input, Label, FormGroup, Spinner
} from 'reactstrap';
import { Bracket, Seed, SeedItem, SeedTeam } from "react-brackets";
import { Link, useSearchParams } from 'react-router-dom';

import { useAdmin } from "contexts/AdminContext";
import { useToast } from "contexts/ToastContext";
import { ThemeContext, themes } from "contexts/ThemeContext";
import { t } from "translations/translate";

// Round-Robin Matrix Component for Group Stage
const RoundRobinMatrix = ({ group, isDark, highScoreWin }) => {
    // Extract unique robots from matches
    const robots = useMemo(() => {
        const robotMap = new Map();
        group.matches?.forEach(match => {
            if (match.robotAID) {
                robotMap.set(match.robotAID, {
                    id: match.robotAID,
                    name: match.robotAName,
                    number: match.robotANumber,
                    teamName: match.teamAName
                });
            }
            if (match.robotBID) {
                robotMap.set(match.robotBID, {
                    id: match.robotBID,
                    name: match.robotBName,
                    number: match.robotBNumber,
                    teamName: match.teamBName
                });
            }
        });
        return Array.from(robotMap.values()).sort((a, b) => a.number - b.number);
    }, [group.matches]);

    // Calculate standings from matches
    const standings = useMemo(() => {
        const stats = {};
        robots.forEach(r => {
            stats[r.id] = { ...r, wins: 0, losses: 0, scoreDiff: 0 };
        });

        group.matches?.forEach(match => {
            if (match.stateName !== 'DONE' || match.scoreA == null || match.scoreB == null) return;
            
            const aWins = highScoreWin ? match.scoreA > match.scoreB : match.scoreA < match.scoreB;
            const bWins = highScoreWin ? match.scoreB > match.scoreA : match.scoreB < match.scoreA;

            if (stats[match.robotAID]) {
                if (aWins) stats[match.robotAID].wins++;
                else if (bWins) stats[match.robotAID].losses++;
                stats[match.robotAID].scoreDiff += (match.scoreA - match.scoreB);
            }
            if (stats[match.robotBID]) {
                if (bWins) stats[match.robotBID].wins++;
                else if (aWins) stats[match.robotBID].losses++;
                stats[match.robotBID].scoreDiff += (match.scoreB - match.scoreA);
            }
        });

        return Object.values(stats).sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            return b.scoreDiff - a.scoreDiff;
        });
    }, [robots, group.matches, highScoreWin]);

    // Build match lookup for quick access
    const matchLookup = useMemo(() => {
        const lookup = {};
        group.matches?.forEach(match => {
            // Store both directions
            const keyAB = `${match.robotAID}_${match.robotBID}`;
            const keyBA = `${match.robotBID}_${match.robotAID}`;
            lookup[keyAB] = { ...match, isReversed: false };
            lookup[keyBA] = { ...match, isReversed: true };
        });
        return lookup;
    }, [group.matches]);

    // Get cell content for row robot vs column robot
    const getCellContent = (rowRobot, colRobot) => {
        if (rowRobot.id === colRobot.id) {
            return { type: 'self' };
        }
        
        const key = `${rowRobot.id}_${colRobot.id}`;
        const match = matchLookup[key];
        
        if (!match) {
            return { type: 'none' };
        }

        if (match.stateName !== 'DONE') {
            return { type: 'waiting', matchId: match.id };
        }

        // Get score from row robot's perspective
        const rowScore = match.isReversed ? match.scoreB : match.scoreA;
        const colScore = match.isReversed ? match.scoreA : match.scoreB;
        
        // Determine winner
        let isWinner = false;
        if (highScoreWin) {
            isWinner = rowScore > colScore;
        } else {
            isWinner = rowScore < colScore;
        }

        return { 
            type: 'result', 
            score: `${rowScore}:${colScore}`,
            isWinner,
            matchId: match.id
        };
    };

    const cellStyle = {
        padding: '4px 8px',
        textAlign: 'center',
        fontSize: '0.8em',
        minWidth: '50px',
        border: `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}`
    };

    const headerCellStyle = {
        ...cellStyle,
        fontWeight: '600',
        backgroundColor: isDark ? '#1e1e2f' : '#f8f9fa',
        position: 'sticky',
        top: 0
    };

    return (
        <div style={{ overflowX: 'auto' }}>
            <Table size="sm" className="mb-0" style={{ 
                color: isDark ? '#fff' : '#32325d',
                borderCollapse: 'collapse'
            }}>
                <thead>
                    <tr>
                        <th style={{ ...headerCellStyle, minWidth: '120px' }}></th>
                        {robots.map(robot => (
                            <th key={robot.id} style={headerCellStyle}>
                                <div style={{ color: isDark ? '#a0aec0' : '#888' }}>N{robot.number}</div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {robots.map(rowRobot => (
                        <tr key={rowRobot.id}>
                            <td style={{ 
                                ...cellStyle, 
                                textAlign: 'left',
                                backgroundColor: isDark ? '#1e1e2f' : '#f8f9fa',
                                fontWeight: '500'
                            }}>
                                <span style={{ color: isDark ? '#fff' : '#32325d' }}>
                                    <span style={{ color: isDark ? '#a0aec0' : '#888' }}>N{rowRobot.number}</span>
                                    {' '}{rowRobot.name}
                                </span>
                            </td>
                            {robots.map(colRobot => {
                                const cell = getCellContent(rowRobot, colRobot);
                                
                                if (cell.type === 'self') {
                                    return (
                                        <td key={colRobot.id} style={{ 
                                            ...cellStyle, 
                                            backgroundColor: isDark ? '#3d3d5c' : '#e0e0e0' 
                                        }}>
                                            ×
                                        </td>
                                    );
                                }
                                
                                if (cell.type === 'none') {
                                    return (
                                        <td key={colRobot.id} style={cellStyle}>-</td>
                                    );
                                }
                                
                                if (cell.type === 'waiting') {
                                    return (
                                        <td key={colRobot.id} style={{ 
                                            ...cellStyle, 
                                            color: isDark ? '#a0aec0' : '#999' 
                                        }}>
                                            -
                                        </td>
                                    );
                                }
                                
                                return (
                                    <td key={colRobot.id} style={{ 
                                        ...cellStyle,
                                        backgroundColor: cell.isWinner 
                                            ? (isDark ? 'rgba(45, 206, 137, 0.2)' : 'rgba(45, 206, 137, 0.1)')
                                            : (isDark ? 'rgba(245, 54, 92, 0.1)' : 'rgba(245, 54, 92, 0.05)'),
                                        color: cell.isWinner ? '#2dce89' : '#f5365c',
                                        fontWeight: '600'
                                    }}>
                                        {cell.score}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </Table>

            {/* Compact standings table */}
            {standings.length > 0 && (
                <div style={{ 
                    marginTop: '12px', 
                    padding: '8px',
                    backgroundColor: isDark ? 'rgba(30, 30, 47, 0.5)' : 'rgba(248, 249, 250, 0.8)',
                    borderRadius: '4px'
                }}>
                    <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '8px',
                        fontSize: '0.75em'
                    }}>
                        {standings.map((s, idx) => (
                            <div key={s.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: idx < 2 
                                    ? (isDark ? 'rgba(45, 206, 137, 0.2)' : 'rgba(45, 206, 137, 0.15)')
                                    : 'transparent',
                                border: `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}`
                            }}>
                                <Badge 
                                    color={idx < 2 ? 'success' : 'secondary'} 
                                    pill 
                                    style={{ fontSize: '0.9em', minWidth: '18px' }}
                                >
                                    {idx + 1}
                                </Badge>
                                <span style={{ color: isDark ? '#a0aec0' : '#888' }}>N{s.number}</span>
                                <span style={{ color: isDark ? '#fff' : '#32325d', fontWeight: '500' }}>{s.name}</span>
                                <span style={{ color: '#2dce89' }}>{s.wins}V</span>
                                <span style={{ color: '#f5365c' }}>{s.losses}P</span>
                                <span style={{ 
                                    color: s.scoreDiff > 0 ? '#2dce89' : (s.scoreDiff < 0 ? '#f5365c' : '#a0aec0')
                                }}>
                                    {s.scoreDiff > 0 ? '+' : ''}{s.scoreDiff.toFixed(0)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Custom Seed component for bracket visualization
const CustomSeed = ({ seed, isDark, breakpoint }) => {
    const robotA = seed.teams?.[0];
    const robotB = seed.teams?.[1];
    const matchState = seed.matchState;
    const isCompleted = matchState === 'DONE';
    const isBye = seed.isBye;

    const getScoreStyle = (isWinner) => ({
        fontWeight: isWinner ? 'bold' : 'normal',
        color: isWinner ? '#2dce89' : (isDark ? '#fff' : '#32325d'),
        minWidth: '30px',
        textAlign: 'right'
    });

    const TeamDisplay = ({ team, isTop }) => {
        if (!team || !team.name) {
            return (
                <SeedTeam style={{
                    backgroundColor: isDark ? '#1e1e2f' : '#f5f5f5',
                    color: isDark ? '#666' : '#999',
                    padding: '8px 12px',
                    fontSize: '0.85em',
                    borderRadius: isTop ? '4px 4px 0 0' : '0 0 4px 4px',
                    borderBottom: isTop ? `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}` : 'none'
                }}>
                    <span style={{ fontStyle: 'italic' }}>
                        {isBye ? 'BYE' : (t('tbd') || 'TBD')}
                    </span>
                </SeedTeam>
            );
        }

        const isWinner = isCompleted && team.isWinner;

        return (
            <SeedTeam style={{
                backgroundColor: isWinner 
                    ? (isDark ? 'rgba(45, 206, 137, 0.2)' : 'rgba(45, 206, 137, 0.1)')
                    : (isDark ? '#1e1e2f' : '#fff'),
                padding: '8px 12px',
                fontSize: '0.85em',
                borderRadius: isTop ? '4px 4px 0 0' : '0 0 4px 4px',
                borderBottom: isTop ? `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}` : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span
                    style={{ 
                        color: isDark ? '#fff' : '#32325d',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <span style={{ color: isDark ? '#a0aec0' : '#888', marginRight: '6px' }}>
                        N{team.number}
                    </span>
                    {team.name}
                </span>
                <span style={getScoreStyle(isWinner)}>
                    {team.score !== null && team.score !== undefined ? team.score : '-'}
                </span>
            </SeedTeam>
        );
    };

    return (
        <Seed style={{ 
            fontSize: 12, 
            minWidth: breakpoint < 768 ? 180 : 220,
            margin: '8px'
        }}>
            <SeedItem style={{
                backgroundColor: isDark ? '#27293d' : '#fff',
                borderRadius: '4px',
                border: `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}`,
                boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <TeamDisplay team={robotA} isTop={true} />
                <TeamDisplay team={robotB} isTop={false} />
            </SeedItem>
        </Seed>
    );
};

// Bracket visualization component
const BracketVisualization = ({ bracket, isDark, highScoreWin }) => {
    if (!bracket || bracket.length === 0) {
        return (
            <div className="text-center text-muted py-4">
                {t('noBracketData') || 'Žádná data pavouka'}
            </div>
        );
    }

    // Transform bracket data for react-brackets format
    const transformedRounds = bracket.map((round) => ({
        title: round.name,
        seeds: round.matches.map((match) => {
            // Determine winner
            let aWins = false;
            let bWins = false;
            if (match.stateName === 'DONE' && match.scoreA != null && match.scoreB != null) {
                if (highScoreWin) {
                    aWins = match.scoreA > match.scoreB;
                    bWins = match.scoreB > match.scoreA;
                } else {
                    aWins = match.scoreA < match.scoreB;
                    bWins = match.scoreB < match.scoreA;
                }
            }

            return {
                id: match.id,
                matchState: match.stateName,
                teams: [
                    match.robotAID ? {
                        id: match.robotAID,
                        name: match.robotAName,
                        number: match.robotANumber,
                        score: match.scoreA,
                        isWinner: aWins
                    } : null,
                    match.robotBID ? {
                        id: match.robotBID,
                        name: match.robotBName,
                        number: match.robotBNumber,
                        score: match.scoreB,
                        isWinner: bWins
                    } : null
                ]
            };
        })
    }));

    return (
        <div className="bracket-container" style={{ 
            overflowX: 'auto',
            padding: '20px 10px'
        }}>
            <style>{`
                .bracket-container svg {
                    overflow: visible !important;
                }
                .bracket-container [class*="Bracket"] {
                    overflow: visible !important;
                }
                .bracket-container [class*="Round"] {
                    overflow: visible !important;
                }
                .bracket-container path {
                    stroke: ${isDark ? '#5e5e7a' : '#ccc'} !important;
                    stroke-width: 2px !important;
                }
            `}</style>
            <Bracket
                rounds={transformedRounds}
                renderSeedComponent={(props) => <CustomSeed {...props} isDark={isDark} />}
                roundTitleComponent={(title) => (
                    <div style={{
                        textAlign: 'center',
                        color: isDark ? '#fff' : '#32325d',
                        fontWeight: '600',
                        padding: '10px',
                        borderBottom: `2px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}`,
                        marginBottom: '10px'
                    }}>
                        {title}
                    </div>
                )}
            />
        </div>
    );
};

function TournamentView() {
    const { selectedYear } = useAdmin();
    const toast = useToast();
    const { theme } = useContext(ThemeContext);
    const isDark = theme === themes.dark;
    const [searchParams] = useSearchParams();

    // State
    const [disciplines, setDisciplines] = useState([]);
    const [selectedDiscipline, setSelectedDiscipline] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [tournamentData, setTournamentData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Load initial data
    useEffect(() => {
        fetchDisciplines();
    }, []);

    // Handle URL params
    useEffect(() => {
        const discId = searchParams.get('disciplineId');
        const cat = searchParams.get('category');
        
        if (discId) setSelectedDiscipline(discId);
        if (cat) setSelectedCategory(cat);
    }, [searchParams]);

    // Fetch tournament data when all params selected
    useEffect(() => {
        if (selectedYear && selectedDiscipline && selectedCategory) {
            fetchTournamentData();
        }
    }, [selectedYear, selectedDiscipline, selectedCategory]);

    const fetchDisciplines = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}api/discipline/all`);
            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                setDisciplines(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch disciplines:', error);
        }
    };

    const fetchTournamentData = useCallback(async () => {
        if (!selectedYear || !selectedDiscipline || !selectedCategory) return;

        setLoading(true);
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}module/competitionEvaluation/tournamentData?` +
                `year=${selectedYear}&category=${selectedCategory}&disciplineId=${selectedDiscipline}`
            );
            const data = await response.json();
            
            if (response.ok && data.type === 'RESPONSE') {
                setTournamentData(data.data);
            } else {
                toast.error(data.message || 'Failed to load tournament data');
                setTournamentData(null);
            }
        } catch (error) {
            console.error('Failed to fetch tournament data:', error);
            toast.error('Failed to load tournament data');
            setTournamentData(null);
        } finally {
            setLoading(false);
        }
    }, [selectedYear, selectedDiscipline, selectedCategory]);

    // Get selected discipline object
    const selectedDisciplineObj = disciplines.find(d => d.id == selectedDiscipline);

    return (
        <div className="content">
            <Row>
                <Col md="12">
                    <Card className={isDark ? 'bg-dark' : ''}>
                        <CardHeader>
                            <CardTitle tag="h4">
                                <i className="tim-icons icon-trophy mr-2" />
                                {t('tournamentVisualization') || 'Vizualizace turnaje'}
                            </CardTitle>
                        </CardHeader>
                        <CardBody>
                            {/* Selection filters */}
                            <Row className="mb-4">
                                <Col md="6">
                                    <FormGroup>
                                        <Label style={{ color: isDark ? '#fff' : '#32325d' }}>
                                            {t('discipline') || 'Disciplína'}
                                        </Label>
                                        <Input
                                            type="select"
                                            value={selectedDiscipline}
                                            onChange={(e) => setSelectedDiscipline(e.target.value)}
                                            style={{
                                                backgroundColor: isDark ? '#27293d' : '#fff',
                                                color: isDark ? '#fff' : '#32325d',
                                                border: `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}`
                                            }}
                                        >
                                            <option value="">{t('selectDiscipline') || '-- Vyberte disciplínu --'}</option>
                                            {disciplines.map(disc => (
                                                <option key={disc.id} value={disc.id}>{disc.name}</option>
                                            ))}
                                        </Input>
                                    </FormGroup>
                                </Col>
                                <Col md="6">
                                    <FormGroup>
                                        <Label style={{ color: isDark ? '#fff' : '#32325d' }}>
                                            {t('category') || 'Kategorie'}
                                        </Label>
                                        <Input
                                            type="select"
                                            value={selectedCategory}
                                            onChange={(e) => setSelectedCategory(e.target.value)}
                                            style={{
                                                backgroundColor: isDark ? '#27293d' : '#fff',
                                                color: isDark ? '#fff' : '#32325d',
                                                border: `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}`
                                            }}
                                        >
                                            <option value="">{t('selectCategory') || '-- Vyberte kategorii --'}</option>
                                            <option value="LOW_AGE_CATEGORY">{t('pupils') || 'Žáci'}</option>
                                            <option value="HIGH_AGE_CATEGORY">{t('students') || 'Studenti a dospělí'}</option>
                                        </Input>
                                    </FormGroup>
                                </Col>
                            </Row>

                            {/* Loading indicator */}
                            {loading && (
                                <div className="text-center py-5">
                                    <Spinner color="primary" />
                                    <p className="mt-2" style={{ color: isDark ? '#a0aec0' : '#666' }}>
                                        {t('loading') || 'Načítám...'}
                                    </p>
                                </div>
                            )}

                            {/* No selection */}
                            {!loading && !tournamentData && selectedYear && selectedDiscipline && selectedCategory && (
                                <div className="text-center py-5">
                                    <i className="tim-icons icon-alert-circle-exc" style={{ fontSize: '3em', color: isDark ? '#a0aec0' : '#666' }} />
                                    <p className="mt-3" style={{ color: isDark ? '#a0aec0' : '#666' }}>
                                        {t('noDataAvailable') || 'Pro tuto kombinaci nejsou dostupná žádná data'}
                                    </p>
                                </div>
                            )}

                            {/* Tournament data display */}
                            {!loading && tournamentData && (
                                <>
                                    {tournamentData.isTournament ? (
                                        /* Tournament mode view */
                                        <>
                                            {/* Groups section - Round Robin Matrix */}
                                            {tournamentData.groups && tournamentData.groups.length > 0 && (
                                                <div className="mb-5">
                                                    <h5 style={{ color: isDark ? '#fff' : '#32325d', marginBottom: '20px' }}>
                                                        <i className="tim-icons icon-components mr-2" />
                                                        {t('groupStage') || 'Skupinová fáze'}
                                                    </h5>
                                                    <Row>
                                                        {tournamentData.groups.map((group) => (
                                                            <Col lg="6" key={group.groupId}>
                                                                <Card className={`mb-4 ${isDark ? 'bg-secondary' : ''}`} style={{
                                                                    borderRadius: '8px',
                                                                    border: `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}`
                                                                }}>
                                                                    <CardHeader className="py-2 px-3" style={{
                                                                        background: isDark ? '#1e1e2f' : '#f8f9fa',
                                                                        borderRadius: '8px 8px 0 0'
                                                                    }}>
                                                                        <div className="d-flex justify-content-between align-items-center">
                                                                            <span style={{ color: isDark ? '#fff' : '#32325d', fontWeight: '600' }}>
                                                                                {t('group') || 'Skupina'} {group.groupName}
                                                                            </span>
                                                                            <small style={{ color: isDark ? '#a0aec0' : '#666' }}>
                                                                                {group.completedMatches}/{group.totalMatches} {t('matches') || 'zápasů'}
                                                                            </small>
                                                                        </div>
                                                                        <Progress
                                                                            value={group.totalMatches > 0 ? (group.completedMatches / group.totalMatches) * 100 : 0}
                                                                            color={group.completedMatches === group.totalMatches ? 'success' : 'info'}
                                                                            style={{ height: '4px', marginTop: '5px' }}
                                                                        />
                                                                    </CardHeader>
                                                                    <CardBody className="p-2">
                                                                        {group.matches && group.matches.length > 0 ? (
                                                                            <RoundRobinMatrix 
                                                                                group={group}
                                                                                isDark={isDark}
                                                                                highScoreWin={tournamentData.highScoreWin}
                                                                            />
                                                                        ) : (
                                                                            <div className="text-center py-3" style={{ color: isDark ? '#a0aec0' : '#666' }}>
                                                                                {t('noMatchesYet') || 'Zatím žádné zápasy'}
                                                                            </div>
                                                                        )}
                                                                    </CardBody>
                                                                </Card>
                                                            </Col>
                                                        ))}
                                                    </Row>
                                                </div>
                                            )}

                                            {/* Bracket section */}
                                            {tournamentData.bracket && tournamentData.bracket.length > 0 && (
                                                <div className="mb-4">
                                                    <h5 style={{ color: isDark ? '#fff' : '#32325d', marginBottom: '20px' }}>
                                                        <i className="tim-icons icon-trophy mr-2" />
                                                        {t('eliminationBracket') || 'Vyřazovací pavouk'}
                                                        <Badge color="primary" className="ml-2 ms-2">
                                                            {tournamentData.completedBracketMatches}/{tournamentData.totalBracketMatches}
                                                        </Badge>
                                                    </h5>
                                                    <Card className={isDark ? 'bg-secondary' : ''} style={{
                                                        borderRadius: '8px',
                                                        border: `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}`
                                                    }}>
                                                        <CardBody>
                                                            <BracketVisualization 
                                                                bracket={tournamentData.bracket}
                                                                isDark={isDark}
                                                                highScoreWin={tournamentData.highScoreWin}
                                                            />
                                                        </CardBody>
                                                    </Card>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        /* Regular standings mode */
                                        <div className="mb-4">
                                            <h5 style={{ color: isDark ? '#fff' : '#32325d', marginBottom: '20px' }}>
                                                <i className="tim-icons icon-chart-bar-32 mr-2" />
                                                {t('standings') || 'Pořadí'}
                                            </h5>
                                            <Card className={isDark ? 'bg-secondary' : ''} style={{
                                                borderRadius: '8px',
                                                border: `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}`
                                            }}>
                                                <CardBody>
                                                    {tournamentData.standings && tournamentData.standings.length > 0 ? (
                                                        <Table responsive style={{ color: isDark ? '#fff' : '#32325d' }}>
                                                            <thead>
                                                                <tr>
                                                                    <th style={{ width: '60px' }}>{t('place') || 'Pořadí'}</th>
                                                                    <th>{t('team') || 'Tým'}</th>
                                                                    <th>{t('robot') || 'Robot'}</th>
                                                                    <th className="text-right">{t('score') || 'Skóre'}</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {tournamentData.standings
                                                                    .filter(item => item?.data?.robotID)
                                                                    .map((item) => (
                                                                    <tr key={item.data.robotID}>
                                                                        <td>
                                                                            <Badge 
                                                                                color={item.place === 1 ? 'warning' : item.place === 2 ? 'secondary' : item.place === 3 ? 'info' : 'light'}
                                                                                style={{ fontSize: '1em' }}
                                                                            >
                                                                                {item.place}
                                                                            </Badge>
                                                                        </td>
                                                                        <td>{item.data.teamName}</td>
                                                                        <td>
                                                                            <span style={{ color: isDark ? '#fff' : '#32325d' }}>
                                                                                <small style={{ color: isDark ? '#a0aec0' : '#888' }}>
                                                                                    N{item.data.robotNumber || item.data.robotID}
                                                                                </small>
                                                                                {' '}{item.data.robotName}
                                                                            </span>
                                                                        </td>
                                                                        <td className="text-right" style={{ fontWeight: '600', fontSize: '1.1em' }}>
                                                                            {/* Format score - handle very large numbers (no score) and time format */}
                                                                            {item.data.score > 1e30 ? '-' : 
                                                                                (tournamentData.highScoreWin === false && item.data.score > 0 
                                                                                    ? item.data.score.toFixed(2) + 's' 
                                                                                    : item.data.score)}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </Table>
                                                    ) : (
                                                        <div className="text-center py-4" style={{ color: isDark ? '#a0aec0' : '#666' }}>
                                                            {t('noStandingsYet') || 'Zatím žádné výsledky'}
                                                        </div>
                                                    )}
                                                </CardBody>
                                            </Card>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Empty state when nothing selected */}
                            {!loading && !tournamentData && (!selectedYear || !selectedDiscipline || !selectedCategory) && (
                                <div className="text-center py-5">
                                    <i className="tim-icons icon-zoom-split" style={{ fontSize: '3em', color: isDark ? '#a0aec0' : '#666' }} />
                                    <p className="mt-3" style={{ color: isDark ? '#a0aec0' : '#666' }}>
                                        {t('selectAllFilters') || 'Vyberte ročník, disciplínu a kategorii pro zobrazení dat'}
                                    </p>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default TournamentView;
