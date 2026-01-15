/**
 * TournamentGenerator - Admin view for generating tournament structures
 * Supports groups (round-robin) + bracket (elimination) generation
 */
import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
    Card, CardHeader, CardBody, CardTitle, CardFooter,
    Row, Col, Button,
    FormGroup, Label, Input,
    Table, Badge, Spinner, Alert,
    Modal, ModalHeader, ModalBody, ModalFooter
} from 'reactstrap';
import { Bracket, Seed, SeedItem, SeedTeam } from "react-brackets";
import { useUser } from "contexts/UserContext";
import { useAdmin } from "contexts/AdminContext";
import { useToast } from "contexts/ToastContext";
import { ThemeContext, themes } from "contexts/ThemeContext";
import { t } from "translations/translate";
import "../assets/css/rs-react-styles.css";

// Round-Robin Group Component - displays robots with drag & drop support
const RoundRobinTable = ({ group, isDark, playgrounds, onPlaygroundChange, onDragStart, onDragOver, onDrop, draggedRobot }) => {
    const robots = group.robots || [];
    const matchCount = (robots.length * (robots.length - 1)) / 2;
    
    return (
        <Card 
            className={`mb-4 ${isDark ? 'bg-dark' : ''}`} 
            style={{ 
                border: `2px solid ${isDark ? '#525f7f' : '#e9ecef'}`,
                borderRadius: '12px'
            }}
            onDragOver={(e) => onDragOver && onDragOver(e, group.groupId)}
            onDrop={(e) => onDrop && onDrop(e, group.groupId)}
        >
            <CardHeader style={{ 
                background: isDark ? 'linear-gradient(135deg, #1e1e2f 0%, #2d2d44 100%)' : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderRadius: '10px 10px 0 0',
                padding: '12px 15px'
            }}>
                <div className="d-flex justify-content-between align-items-center flex-wrap">
                    <h5 className="mb-0" style={{ color: isDark ? 'white' : '#32325d', fontSize: '1.1em' }}>
                        <i className="tim-icons icon-bullet-list-67 mr-2" />
                        {t('group') || 'Skupina'} {group.name}
                    </h5>
                    <Badge color="secondary" style={{ fontSize: '0.8em' }}>
                        {matchCount} {t('matches') || 'zápasů'}
                    </Badge>
                </div>
                {/* Playground selector */}
                {playgrounds && playgrounds.length > 0 && (
                    <div className="mt-2 d-flex align-items-center">
                        <small style={{ color: isDark ? '#a0aec0' : '#525f7f', marginRight: '8px' }}>
                            <i className="tim-icons icon-square-pin mr-1" />
                            {t('playground') || 'Hřiště'}:
                        </small>
                        <Input
                            type="select"
                            bsSize="sm"
                            value={group.playgroundId || ''}
                            onChange={(e) => onPlaygroundChange && onPlaygroundChange(group.groupId, parseInt(e.target.value))}
                            className={isDark ? 'bg-dark text-white' : ''}
                            style={{ 
                                borderRadius: '6px', 
                                width: 'auto',
                                minWidth: '140px',
                                fontSize: '0.85em'
                            }}
                        >
                            {playgrounds.map(pg => (
                                <option key={pg.id} value={pg.id}>
                                    N{pg.number} - {pg.name || `Hřiště ${pg.id}`}
                                </option>
                            ))}
                        </Input>
                    </div>
                )}
            </CardHeader>
            <CardBody className="p-3">
                {robots.length > 0 ? (
                    <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '8px',
                        minHeight: '50px'
                    }}>
                        {robots.map((robot) => (
                            <div 
                                key={robot.id}
                                draggable
                                onDragStart={(e) => onDragStart && onDragStart(e, robot, group.groupId)}
                                style={{
                                    background: isDark ? '#2d2d44' : '#f0f4f8',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    fontSize: '0.9em',
                                    color: isDark ? '#fff' : '#32325d',
                                    border: `2px solid ${draggedRobot?.id === robot.id ? '#5e72e4' : (isDark ? '#3d3d5c' : '#e0e0e0')}`,
                                    cursor: 'grab',
                                    transition: 'all 0.2s ease',
                                    opacity: draggedRobot?.id === robot.id ? 0.5 : 1,
                                    userSelect: 'none'
                                }}
                            >
                                <span style={{ 
                                    color: isDark ? '#a0aec0' : '#8898aa',
                                    marginRight: '6px',
                                    fontWeight: '500'
                                }}>
                                    N{robot.number}
                                </span>
                                <span style={{ fontWeight: '600' }}>
                                    {robot.name}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div 
                        style={{ 
                            minHeight: '50px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `2px dashed ${isDark ? '#3d3d5c' : '#e0e0e0'}`,
                            borderRadius: '8px',
                            color: isDark ? '#666' : '#aaa'
                        }}
                    >
                        {t('dropRobotHere') || 'Přetáhněte sem robota'}
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

// Custom Seed component for react-brackets
const TournamentSeed = ({ seed, breakpoint, isDark }) => (
    <Seed mobileBreakpoint={breakpoint} style={{ fontSize: 12 }}>
        <SeedItem style={{
            background: isDark 
                ? 'linear-gradient(135deg, #1e1e2f 0%, #2d2d44 100%)'
                : 'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)',
            border: `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}`,
            borderRadius: '8px',
            boxShadow: isDark 
                ? '0 4px 15px rgba(0,0,0,0.3)' 
                : '0 4px 15px rgba(0,0,0,0.1)'
        }}>
            <div>
                <SeedTeam style={{
                    background: isDark ? '#252536' : '#fff',
                    color: isDark ? '#fff' : '#32325d',
                    borderBottom: `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}`
                }}>
                    {seed.teams[0]?.name || (t('waitingForWinner') || 'Čeká na vítěze')}
                </SeedTeam>
                <SeedTeam style={{
                    background: isDark ? '#252536' : '#fff',
                    color: isDark ? '#fff' : '#32325d'
                }}>
                    {seed.teams[1]?.name || (t('waitingForWinner') || 'Čeká na vítěze')}
                </SeedTeam>
            </div>
        </SeedItem>
    </Seed>
);

// Bracket visualization component using react-brackets
const BracketVisualization = ({ bracket, isDark }) => {
    if (!bracket || !bracket.rounds || bracket.rounds.length === 0) {
        return (
            <Alert color="info">
                {t('noBracketData') || 'Žádná data pavouka'}
            </Alert>
        );
    }

    // Transform bracket data for react-brackets format
    const transformedRounds = bracket.rounds.map((round, roundIndex) => ({
        title: round.name,
        seeds: round.matches.map((match, matchIndex) => ({
            id: match.tempId || `${roundIndex}-${matchIndex}`,
            teams: [
                { 
                    name: match.robotA 
                        ? `#${match.robotA.number} ${match.robotA.name}` 
                        : null 
                },
                { 
                    name: match.robotB 
                        ? `#${match.robotB.number} ${match.robotB.name}` 
                        : null 
                }
            ]
        }))
    }));

    return (
        <div className="rs-bracket-wrapper" style={{ 
            overflowX: 'auto', 
            padding: '20px',
            background: isDark ? '#1e1e2f' : '#f8f9fa',
            borderRadius: '8px'
        }}>
            <Bracket
                rounds={transformedRounds}
                renderSeedComponent={(props) => <TournamentSeed {...props} isDark={isDark} />}
                mobileBreakpoint={0}
            />
        </div>
    );
};

function TournamentGenerator() {
    const { selectedYear } = useAdmin();
    const { token, tokenExpired } = useUser();
    const toast = useToast();
    const { theme } = useContext(ThemeContext);
    
    const isDark = theme === themes.dark;

    // State
    const [disciplines, setDisciplines] = useState([]);
    const [robotCounts, setRobotCounts] = useState({});
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Form state
    const [selectedDiscipline, setSelectedDiscipline] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('HIGH_AGE_CATEGORY');
    const [params, setParams] = useState({
        matchTimeMinutes: 5,
        groupCount: 4,
        maxGroupSize: 5,
        advancingPerGroup: 2
    });
    const [playgrounds, setPlaygrounds] = useState([]);
    
    // Preview state
    const [preview, setPreview] = useState(null);
    const [activeTab, setActiveTab] = useState('groups');
    
    // Drag and drop state
    const [draggedRobot, setDraggedRobot] = useState(null);
    const [dragSourceGroup, setDragSourceGroup] = useState(null);
    
    // Tournament exists check
    const [tournamentExists, setTournamentExists] = useState(false);
    
    // Modals
    const [showStartFinalModal, setShowStartFinalModal] = useState(false);
    const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);

    // Fetch playgrounds for selected discipline
    const fetchPlaygrounds = useCallback(async (disciplineId) => {
        if (!disciplineId) {
            setPlaygrounds([]);
            return;
        }
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/playground/get?id=${disciplineId}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            if (tokenExpired(response.status)) return;
            
            const data = await response.json();
            if (data.type === 'RESPONSE') {
                setPlaygrounds(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch playgrounds:', error);
            setPlaygrounds([]);
        }
    }, [token, tokenExpired]);

    // Fetch disciplines with TOURNAMENT mode
    const fetchDisciplines = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/discipline/all`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            if (tokenExpired(response.status)) return;
            
            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                // Filter only disciplines with TOURNAMENT mode
                const tournamentDisciplines = (data.data || []).filter(
                    d => d.competitionModeName === 'TOURNAMENT'
                );
                setDisciplines(tournamentDisciplines);
            }
        } catch (error) {
            console.error('Failed to fetch disciplines:', error);
            toast.error(t('errorLoadingDisciplines') || 'Chyba při načítání disciplín');
        } finally {
            setLoading(false);
        }
    }, [token, tokenExpired, toast]);

    // Fetch robot counts for selected discipline
    const fetchRobotCounts = useCallback(async () => {
        if (!selectedDiscipline || !selectedYear) return;
        
        try {
            // Use allConfirmed endpoint which returns all confirmed robots for the year
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/robot/allConfirmed?year=${selectedYear}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            if (tokenExpired(response.status)) return;
            
            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                const robots = data.data || [];
                const disciplineId = parseInt(selectedDiscipline);
                
                // Count robots by category (already confirmed from endpoint)
                const counts = {
                    LOW_AGE_CATEGORY: robots.filter(r => 
                        r.disciplineID === disciplineId && 
                        r.category === 'LOW_AGE_CATEGORY'
                    ).length,
                    HIGH_AGE_CATEGORY: robots.filter(r => 
                        r.disciplineID === disciplineId && 
                        r.category === 'HIGH_AGE_CATEGORY'
                    ).length
                };
                setRobotCounts(counts);
            }
        } catch (error) {
            console.error('Failed to fetch robot counts:', error);
        }
    }, [selectedDiscipline, selectedYear, token, tokenExpired]);

    // Check if tournament already exists
    const checkTournamentExists = useCallback(async () => {
        if (!selectedDiscipline || !selectedYear) return;
        
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/tournament/exists?disciplineId=${selectedDiscipline}&category=${selectedCategory}&year=${selectedYear}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            if (tokenExpired(response.status)) return;
            
            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                setTournamentExists(data.data);
            }
        } catch (error) {
            console.error('Failed to check tournament:', error);
        }
    }, [selectedDiscipline, selectedCategory, selectedYear, token, tokenExpired]);

    useEffect(() => {
        fetchDisciplines();
    }, [fetchDisciplines]);

    useEffect(() => {
        fetchPlaygrounds(selectedDiscipline);
    }, [selectedDiscipline, fetchPlaygrounds]);

    useEffect(() => {
        checkTournamentExists();
        fetchRobotCounts();
    }, [checkTournamentExists, fetchRobotCounts]);

    // Generate preview
    const handleGeneratePreview = async () => {
        if (!selectedDiscipline) {
            toast.error(t('selectDiscipline') || 'Vyberte disciplínu');
            return;
        }

        const robotCount = robotCounts[selectedCategory] || 0;
        if (robotCount === 0) {
            toast.error(t('noRobotsForCategory') || 'Pro vybranou kategorii nejsou žádní potvrzení roboti');
            return;
        }

        setGenerating(true);
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/tournament/preview`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        disciplineId: parseInt(selectedDiscipline),
                        category: selectedCategory,
                        year: selectedYear,
                        ...params
                    })
                }
            );
            if (tokenExpired(response.status)) return;
            
            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                // Assign playgrounds to groups randomly
                const previewData = data.data;
                if (previewData.groups && playgrounds.length > 0) {
                    previewData.groups = previewData.groups.map((group, idx) => ({
                        ...group,
                        playgroundId: playgrounds[idx % playgrounds.length].id
                    }));
                }
                setPreview(previewData);
                toast.success(t('previewGenerated') || 'Náhled vygenerován');
            } else {
                toast.error(data.message || t('errorGenerating') || 'Chyba při generování');
            }
        } catch (error) {
            console.error('Failed to generate preview:', error);
            toast.error(t('errorGenerating') || 'Chyba při generování');
        } finally {
            setGenerating(false);
        }
    };

    // Handle playground change for a group
    const handlePlaygroundChange = (groupId, playgroundId) => {
        if (!preview) return;
        
        setPreview(prev => ({
            ...prev,
            groups: prev.groups.map(g => 
                g.groupId === groupId 
                    ? { ...g, playgroundId } 
                    : g
            )
        }));
    };

    // Drag and drop handlers for moving robots between groups
    const handleDragStart = (e, robot, sourceGroupId) => {
        setDraggedRobot(robot);
        setDragSourceGroup(sourceGroupId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, targetGroupId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetGroupId) => {
        e.preventDefault();
        
        if (!draggedRobot || !dragSourceGroup || dragSourceGroup === targetGroupId) {
            setDraggedRobot(null);
            setDragSourceGroup(null);
            return;
        }
        
        setPreview(prev => {
            if (!prev) return prev;
            
            return {
                ...prev,
                groups: prev.groups.map(group => {
                    if (group.groupId === dragSourceGroup) {
                        // Remove robot from source group
                        return {
                            ...group,
                            robots: group.robots.filter(r => r.id !== draggedRobot.id)
                        };
                    }
                    if (group.groupId === targetGroupId) {
                        // Add robot to target group
                        return {
                            ...group,
                            robots: [...group.robots, draggedRobot]
                        };
                    }
                    return group;
                })
            };
        });
        
        setDraggedRobot(null);
        setDragSourceGroup(null);
    };

    // Save tournament structure
    const handleSaveTournament = async () => {
        if (!preview) return;

        setSaving(true);
        setShowSaveConfirmModal(false);
        
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/tournament/save`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        disciplineId: preview.disciplineId,
                        category: preview.category,
                        year: preview.year,
                        groups: preview.groups,
                        bracket: preview.bracket
                    })
                }
            );
            if (tokenExpired(response.status)) return;
            
            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                toast.success(t('tournamentSaved') || 'Turnaj úspěšně uložen');
                setTournamentExists(true);
                setPreview(null);
            } else {
                toast.error(data.message || t('errorSaving') || 'Chyba při ukládání');
            }
        } catch (error) {
            console.error('Failed to save tournament:', error);
            toast.error(t('errorSaving') || 'Chyba při ukládání');
        } finally {
            setSaving(false);
        }
    };

    // Delete existing tournament
    const handleDeleteTournament = async () => {
        if (!window.confirm(t('confirmDeleteTournament') || 'Opravdu chcete smazat existující turnaj?')) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/tournament/delete?disciplineId=${selectedDiscipline}&category=${selectedCategory}&year=${selectedYear}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            if (tokenExpired(response.status)) return;
            
            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                toast.success(t('tournamentDeleted') || 'Turnaj smazán');
                setTournamentExists(false);
            } else {
                toast.error(data.message || t('errorDeleting') || 'Chyba při mazání');
            }
        } catch (error) {
            console.error('Failed to delete tournament:', error);
            toast.error(t('errorDeleting') || 'Chyba při mazání');
        } finally {
            setLoading(false);
        }
    };

    // Start final bracket
    const handleStartFinal = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}api/tournament/startFinal?disciplineId=${selectedDiscipline}&category=${selectedCategory}&year=${selectedYear}&advancingPerGroup=${params.advancingPerGroup}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            if (tokenExpired(response.status)) return;
            
            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                toast.success(t('finalStarted') || 'Finálový pavouk spuštěn');
                setShowStartFinalModal(false);
            } else {
                toast.error(data.message || t('errorStartingFinal') || 'Chyba při spouštění finále');
            }
        } catch (error) {
            console.error('Failed to start final:', error);
            toast.error(t('errorStartingFinal') || 'Chyba při spouštění finále');
        } finally {
            setLoading(false);
        }
    };

    // Get current robot count
    const currentRobotCount = robotCounts[selectedCategory] || 0;

    // Calculate matches per playground (for accurate time estimation)
    const getMatchesPerPlayground = () => {
        if (!preview || !preview.groups) return {};
        const matchCounts = {};
        preview.groups.forEach(group => {
            const pgId = group.playgroundId;
            if (pgId) {
                // Number of matches in a group with n robots = n * (n - 1) / 2
                const robotCount = group.robots?.length || 0;
                const groupMatches = (robotCount * (robotCount - 1)) / 2;
                matchCounts[pgId] = (matchCounts[pgId] || 0) + groupMatches;
            }
        });
        return matchCounts;
    };

    // Get the maximum matches on any single playground (determines group phase time)
    const getMaxMatchesOnPlayground = () => {
        const matchCounts = getMatchesPerPlayground();
        const counts = Object.values(matchCounts);
        return counts.length > 0 ? Math.max(...counts) : 0;
    };

    // Tab styles based on theme
    const getTabStyle = (isActive) => ({
        cursor: 'pointer',
        background: isActive 
            ? '#5e72e4'
            : (isDark ? '#2d2d44' : '#f8f9fa'),
        color: isActive ? 'white' : (isDark ? '#a0aec0' : '#525f7f'),
        border: isActive ? 'none' : `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}`,
        borderRadius: '8px 8px 0 0',
        padding: '10px 20px',
        fontWeight: isActive ? '600' : '400',
        marginRight: '4px',
        transition: 'all 0.2s ease'
    });

    return (
        <div className="content">
            <Row>
                <Col md="12">
                    <Card className={isDark ? 'bg-dark' : ''} style={{ borderRadius: '12px' }}>
                        <CardHeader style={{ 
                            background: isDark 
                                ? 'linear-gradient(135deg, #1e1e2f 0%, #2d2d44 100%)' 
                                : 'linear-gradient(135deg, #f8f9fa 0%, #fff 100%)',
                            borderRadius: '12px 12px 0 0'
                        }}>
                            <CardTitle tag="h4" style={{ color: isDark ? 'white' : '#32325d' }}>
                                <i className="tim-icons icon-trophy mr-2" style={{ color: '#ffd600' }} />
                                {t('tournamentGenerator') || 'Generátor turnajů'}
                            </CardTitle>
                        </CardHeader>
                        <CardBody>
                            {/* Configuration Form */}
                            <Row>
                                <Col md="6">
                                    <FormGroup>
                                        <Label style={{ fontWeight: '600', color: isDark ? '#fff' : '#32325d' }}>
                                            {t('discipline') || 'Disciplína'}
                                        </Label>
                                        <Input
                                            type="select"
                                            value={selectedDiscipline}
                                            onChange={(e) => {
                                                setSelectedDiscipline(e.target.value);
                                                setPreview(null);
                                                setRobotCounts({});
                                            }}
                                            className={isDark ? 'bg-dark text-white' : ''}
                                            style={{ borderRadius: '8px' }}
                                        >
                                            <option value="">{t('selectDiscipline') || 'Vyberte disciplínu'}</option>
                                            {disciplines.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </Input>
                                    </FormGroup>
                                </Col>
                                <Col md="6">
                                    <FormGroup>
                                        <Label style={{ fontWeight: '600', color: isDark ? '#fff' : '#32325d' }}>
                                            {t('category') || 'Kategorie'}
                                        </Label>
                                        <Input
                                            type="select"
                                            value={selectedCategory}
                                            onChange={(e) => {
                                                setSelectedCategory(e.target.value);
                                                setPreview(null);
                                            }}
                                            className={isDark ? 'bg-dark text-white' : ''}
                                            style={{ borderRadius: '8px' }}
                                        >
                                            <option value="LOW_AGE_CATEGORY">
                                                {t('pupils') || 'Žáci'} 
                                                {robotCounts.LOW_AGE_CATEGORY !== undefined && ` (${robotCounts.LOW_AGE_CATEGORY} ${t('robots') || 'robotů'})`}
                                            </option>
                                            <option value="HIGH_AGE_CATEGORY">
                                                {t('students') || 'Studenti a\u00a0dospělí'}
                                                {robotCounts.HIGH_AGE_CATEGORY !== undefined && ` (${robotCounts.HIGH_AGE_CATEGORY} ${t('robots') || 'robotů'})`}
                                            </option>
                                        </Input>
                                    </FormGroup>
                                </Col>
                            </Row>

                            {/* Robot count info */}
                            {selectedDiscipline && (
                                <Alert color={currentRobotCount > 0 ? 'info' : 'warning'} style={{ borderRadius: '8px' }}>
                                    <i className={`tim-icons ${currentRobotCount > 0 ? 'icon-check-2' : 'icon-alert-circle-exc'} mr-2`} />
                                    <strong>{currentRobotCount}</strong> {t('confirmedRobotsInCategory') || 'potvrzených robotů v této kategorii'}
                                    {currentRobotCount === 0 && (
                                        <span className="ml-2 ms-2">
                                            - {t('selectDifferentCategory') || 'vyberte jinou kategorii nebo disciplínu'}
                                        </span>
                                    )}
                                </Alert>
                            )}

                            {/* Tournament exists warning */}
                            {tournamentExists && (
                                <Alert color="warning" style={{ borderRadius: '8px' }}>
                                    <i className="tim-icons icon-alert-circle-exc mr-2" />
                                    {t('tournamentAlreadyExists') || 'Pro tuto kombinaci již existuje turnaj.'}
                                    <Button 
                                        color="danger" 
                                        size="sm" 
                                        className="ml-3 ms-3"
                                        onClick={handleDeleteTournament}
                                        style={{ borderRadius: '6px' }}
                                    >
                                        <i className="tim-icons icon-trash-simple mr-1" />
                                        {t('deleteTournament') || 'Smazat turnaj'}
                                    </Button>
                                    <Button 
                                        color="success" 
                                        size="sm" 
                                        className="ml-2 ms-2"
                                        onClick={() => setShowStartFinalModal(true)}
                                        style={{ borderRadius: '6px' }}
                                    >
                                        <i className="tim-icons icon-triangle-right-17 mr-1" />
                                        {t('startFinal') || 'Spustit finále'}
                                    </Button>
                                </Alert>
                            )}

                            <hr style={{ borderColor: isDark ? '#3d3d5c' : '#e9ecef' }} />

                            {/* Parameters */}
                            <h5 style={{ color: isDark ? 'white' : '#32325d', fontWeight: '600' }}>
                                <i className="tim-icons icon-settings mr-2" />
                                {t('parameters') || 'Parametry generování'}
                            </h5>
                            <Row className="mt-3">
                                <Col md="2">
                                    <FormGroup>
                                        <Label style={{ color: isDark ? '#a0aec0' : '#525f7f' }}>
                                            {t('matchTime') || 'Čas na zápas (min)'}
                                        </Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={params.matchTimeMinutes}
                                            onChange={(e) => setParams({...params, matchTimeMinutes: parseInt(e.target.value) || 1})}
                                            className={isDark ? 'bg-dark text-white' : ''}
                                            style={{ borderRadius: '8px' }}
                                        />
                                    </FormGroup>
                                </Col>
                                <Col md="2">
                                    <FormGroup>
                                        <Label style={{ color: isDark ? '#a0aec0' : '#525f7f' }}>
                                            {t('groupCount') || 'Počet skupin'}
                                        </Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max="16"
                                            value={params.groupCount}
                                            onChange={(e) => setParams({...params, groupCount: parseInt(e.target.value) || 1})}
                                            className={isDark ? 'bg-dark text-white' : ''}
                                            style={{ borderRadius: '8px' }}
                                        />
                                    </FormGroup>
                                </Col>
                                <Col md="2">
                                    <FormGroup>
                                        <Label style={{ color: isDark ? '#a0aec0' : '#525f7f' }}>
                                            {t('maxGroupSize') || 'Max. ve skupině'}
                                        </Label>
                                        <Input
                                            type="number"
                                            min={params.advancingPerGroup + 1}
                                            max="12"
                                            value={params.maxGroupSize}
                                            onChange={(e) => setParams({...params, maxGroupSize: parseInt(e.target.value) || params.advancingPerGroup + 1})}
                                            className={isDark ? 'bg-dark text-white' : ''}
                                            style={{ borderRadius: '8px' }}
                                        />
                                    </FormGroup>
                                </Col>
                                <Col md="2">
                                    <FormGroup>
                                        <Label style={{ color: isDark ? '#a0aec0' : '#525f7f' }}>
                                            {t('advancingPerGroup') || 'Postupujících'}
                                        </Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max={params.maxGroupSize - 1}
                                            value={params.advancingPerGroup}
                                            onChange={(e) => setParams({...params, advancingPerGroup: parseInt(e.target.value) || 1})}
                                            className={isDark ? 'bg-dark text-white' : ''}
                                            style={{ borderRadius: '8px' }}
                                        />
                                    </FormGroup>
                                </Col>
                                <Col md="2">
                                    <FormGroup>
                                        <Label style={{ color: isDark ? '#a0aec0' : '#525f7f' }}>
                                            {t('playgroundsAvailable') || 'Hřišť k dispozici'}
                                        </Label>
                                        <div style={{ 
                                            padding: '8px 12px', 
                                            background: isDark ? '#1e1e2f' : '#f8f9fa',
                                            borderRadius: '8px',
                                            border: `1px solid ${isDark ? '#3d3d5c' : '#ced4da'}`,
                                            color: isDark ? '#fff' : '#32325d',
                                            fontWeight: '600'
                                        }}>
                                            {playgrounds.length}
                                        </div>
                                    </FormGroup>
                                </Col>
                                <Col md="2" className="d-flex align-items-end">
                                    <Button 
                                        color="primary" 
                                        onClick={handleGeneratePreview}
                                        disabled={generating || !selectedDiscipline || currentRobotCount === 0 || playgrounds.length === 0}
                                        className="mb-3 w-100"
                                        style={{ borderRadius: '8px' }}
                                    >
                                        {generating ? (
                                            <><Spinner size="sm" /> {t('generating') || 'Generuji...'}</>
                                        ) : (
                                            <><i className="tim-icons icon-spaceship mr-1" /> {t('generatePreview') || 'Generovat'}</>
                                        )}
                                    </Button>
                                </Col>
                            </Row>
                            {playgrounds.length === 0 && selectedDiscipline && (
                                <Alert color="warning" style={{ borderRadius: '8px' }}>
                                    <i className="tim-icons icon-alert-circle-exc mr-2" />
                                    {t('noPlaygroundsForDiscipline') || 'Pro tuto disciplínu nejsou definována žádná hřiště. Vytvořte hřiště ve správě hřišť.'}
                                </Alert>
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Preview Section */}
            {preview && (
                <Row>
                    <Col md="12">
                        <Card className={isDark ? 'bg-dark' : ''} style={{ borderRadius: '12px' }}>
                            <CardHeader style={{ 
                                background: isDark 
                                    ? 'linear-gradient(135deg, #1e1e2f 0%, #2d2d44 100%)' 
                                    : 'linear-gradient(135deg, #f8f9fa 0%, #fff 100%)',
                                borderRadius: '12px 12px 0 0'
                            }}>
                                <CardTitle tag="h4" style={{ color: isDark ? 'white' : '#32325d' }}>
                                    <i className="tim-icons icon-zoom-split mr-2" />
                                    {t('preview') || 'Náhled'}: {preview.disciplineName} - {preview.category === 'LOW_AGE_CATEGORY' ? t('pupils') || 'Žáci' : t('students') || 'Studenti a\u00a0dospělí'}
                                </CardTitle>
                                <div className="d-flex gap-2 flex-wrap mt-2">
                                    <Badge color="secondary" style={{ fontSize: '0.9em', padding: '8px 12px', borderRadius: '6px' }}>
                                        <i className="tim-icons icon-single-02 mr-1" />
                                        {t('robotsInTournament') || 'Robotů v turnaji'}: {preview.totalRobots}
                                    </Badge>
                                    <Badge color="info" style={{ fontSize: '0.9em', padding: '8px 12px', borderRadius: '6px' }}>
                                        <i className="tim-icons icon-bullet-list-67 mr-1" />
                                        {t('groups') || 'Skupiny'}: {preview.groups.length} ({t('groupSizeAuto') || 'velikost'}: {preview.groupSize || preview.groups[0]?.robots?.length || '-'})
                                    </Badge>
                                    <Badge color="primary" style={{ fontSize: '0.9em', padding: '8px 12px', borderRadius: '6px' }}>
                                        <i className="tim-icons icon-controller mr-1" />
                                        {t('totalGroupMatches') || 'Skupinové zápasy'}: {preview.totalGroupMatches}
                                    </Badge>
                                    <Badge color="success" style={{ fontSize: '0.9em', padding: '8px 12px', borderRadius: '6px' }}>
                                        <i className="tim-icons icon-trophy mr-1" />
                                        {t('totalBracketMatches') || 'Vyřazovací'}: {preview.totalBracketMatches}
                                    </Badge>
                                </div>
                                <div className="d-flex gap-2 flex-wrap mt-2">
                                    <Badge color="warning" style={{ fontSize: '0.9em', padding: '8px 12px', borderRadius: '6px' }}>
                                        <i className="tim-icons icon-time-alarm mr-1" />
                                        {t('groupPhaseTime') || 'Čas skupiny'}: ~{getMaxMatchesOnPlayground() * params.matchTimeMinutes} min ({playgrounds.length} {t('playgrounds') || 'hřišť'})
                                    </Badge>
                                    <Badge color="warning" style={{ fontSize: '0.9em', padding: '8px 12px', borderRadius: '6px' }}>
                                        <i className="tim-icons icon-time-alarm mr-1" />
                                        {t('bracketPhaseTime') || 'Čas pavouk'}: ~{Math.ceil((preview.totalBracketMatches * params.matchTimeMinutes) / (playgrounds.length || 1))} min
                                    </Badge>
                                    <Badge color="danger" style={{ fontSize: '0.9em', padding: '8px 12px', borderRadius: '6px' }}>
                                        <i className="tim-icons icon-watch-time mr-1" />
                                        {t('totalTimeEstimate') || 'Celkem'}: ~{(getMaxMatchesOnPlayground() * params.matchTimeMinutes) + Math.ceil((preview.totalBracketMatches * params.matchTimeMinutes) / (playgrounds.length || 1))} min
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardBody>
                                {/* Warnings - filter out obsolete time warnings */}
                                {preview.warnings && preview.warnings.filter(w => !w.includes('exceeds available time') && !w.includes('Estimated time')).length > 0 && (
                                    <Alert color="warning" style={{ borderRadius: '8px' }}>
                                        {preview.warnings.filter(w => !w.includes('exceeds available time') && !w.includes('Estimated time')).map((w, i) => (
                                            <div key={i}><i className="tim-icons icon-alert-circle-exc mr-1" /> {w}</div>
                                        ))}
                                    </Alert>
                                )}

                                {/* Custom Tabs */}
                                <div className="d-flex mb-0">
                                    <div
                                        onClick={() => setActiveTab('groups')}
                                        style={getTabStyle(activeTab === 'groups')}
                                    >
                                        <i className="tim-icons icon-bullet-list-67 mr-2" />
                                        {t('groups') || 'Skupiny'} ({preview.groups.length})
                                    </div>
                                    <div
                                        onClick={() => setActiveTab('bracket')}
                                        style={getTabStyle(activeTab === 'bracket')}
                                    >
                                        <i className="tim-icons icon-trophy mr-2" />
                                        {t('bracket') || 'Pavouk'}
                                    </div>
                                </div>

                                {/* Tab Content */}
                                <div style={{ 
                                    background: isDark ? '#1e1e2f' : '#f8f9fa',
                                    borderRadius: '0 8px 8px 8px',
                                    padding: '20px',
                                    border: `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}`,
                                    borderTop: 'none'
                                }}>
                                    {activeTab === 'groups' && (
                                        <>
                                            <Alert color="info" style={{ borderRadius: '8px', marginBottom: '15px' }}>
                                                <i className="tim-icons icon-tap-02 mr-2" />
                                                {t('dragDropHint') || 'Přetáhněte roboty mezi skupinami pro změnu rozložení'}
                                            </Alert>
                                            <Row>
                                                {preview.groups.map((group, idx) => (
                                                    <Col lg="6" xl="4" key={group.groupId}>
                                                        <RoundRobinTable 
                                                            group={group} 
                                                            isDark={isDark}
                                                            playgrounds={playgrounds}
                                                            onPlaygroundChange={handlePlaygroundChange}
                                                            onDragStart={handleDragStart}
                                                            onDragOver={handleDragOver}
                                                            onDrop={handleDrop}
                                                            draggedRobot={draggedRobot}
                                                        />
                                                    </Col>
                                                ))}
                                            </Row>
                                        </>
                                    )}

                                    {activeTab === 'bracket' && (
                                        <>
                                            <BracketVisualization 
                                                bracket={preview.bracket} 
                                                isDark={isDark}
                                            />
                                            <Alert color="secondary" className="mt-3" style={{ borderRadius: '8px' }}>
                                                <i className="tim-icons icon-sound-wave mr-1" />
                                                {t('bracketInfo') || 'Zápasy v pavouku budou automaticky naplněny vítězi ze skupin po spuštění finále.'}
                                            </Alert>
                                        </>
                                    )}
                                </div>
                            </CardBody>
                            <CardFooter style={{ 
                                background: isDark ? '#1e1e2f' : '#f8f9fa',
                                borderRadius: '0 0 12px 12px'
                            }}>
                                <Button 
                                    color="success" 
                                    size="lg"
                                    onClick={() => setShowSaveConfirmModal(true)}
                                    disabled={saving}
                                    style={{ borderRadius: '8px' }}
                                >
                                    {saving ? (
                                        <><Spinner size="sm" /> {t('saving') || 'Ukládám...'}</>
                                    ) : (
                                        <><i className="tim-icons icon-check-2 mr-1" /> {t('saveTournament') || 'Uložit turnaj'}</>
                                    )}
                                </Button>
                                <Button 
                                    color="secondary" 
                                    className="ml-2 ms-2"
                                    onClick={() => setPreview(null)}
                                    style={{ borderRadius: '8px' }}
                                >
                                    <i className="tim-icons icon-simple-remove mr-1" />
                                    {t('cancel') || 'Zrušit'}
                                </Button>
                            </CardFooter>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Save Confirmation Modal */}
            <Modal isOpen={showSaveConfirmModal} toggle={() => setShowSaveConfirmModal(false)}>
                <ModalHeader toggle={() => setShowSaveConfirmModal(false)} style={{ 
                    background: isDark ? '#1e1e2f' : '#f8f9fa',
                    color: isDark ? 'white' : '#32325d'
                }}>
                    <i className="tim-icons icon-alert-circle-exc mr-2" style={{ color: '#ffd600' }} />
                    {t('confirmSave') || 'Potvrzení uložení'}
                </ModalHeader>
                <ModalBody style={{ background: isDark ? '#2d2d44' : '#fff' }}>
                    <p style={{ color: isDark ? '#a0aec0' : '#525f7f' }}>
                        {t('confirmSaveDescription') || 'Opravdu chcete uložit tento turnaj? Tato akce vytvoří všechny skupinové zápasy a strukturu vyřazovacího pavouka.'}
                    </p>
                    {preview && (
                        <div style={{ 
                            background: isDark ? '#1e1e2f' : '#f8f9fa', 
                            padding: '15px', 
                            borderRadius: '8px',
                            marginTop: '15px'
                        }}>
                            <div style={{ color: isDark ? '#fff' : '#32325d' }}>
                                <strong>{t('discipline') || 'Disciplína'}:</strong> {preview.disciplineName}
                            </div>
                            <div style={{ color: isDark ? '#fff' : '#32325d' }}>
                                <strong>{t('category') || 'Kategorie'}:</strong> {preview.category === 'LOW_AGE_CATEGORY' ? t('pupils') || 'Žáci' : t('students') || 'Studenti a\u00a0dospělí'}
                            </div>
                            <div style={{ color: isDark ? '#fff' : '#32325d' }}>
                                <strong>{t('groups') || 'Skupiny'}:</strong> {preview.groups.length}
                            </div>
                            <div style={{ color: isDark ? '#fff' : '#32325d' }}>
                                <strong>{t('totalMatches') || 'Celkem zápasů'}:</strong> {preview.totalGroupMatches + preview.totalBracketMatches}
                            </div>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter style={{ background: isDark ? '#2d2d44' : '#fff' }}>
                    <Button color="success" onClick={handleSaveTournament} disabled={saving} style={{ borderRadius: '8px' }}>
                        <i className="tim-icons icon-check-2 mr-1" />
                        {t('confirmAndSave') || 'Potvrdit a uložit'}
                    </Button>
                    <Button color="secondary" onClick={() => setShowSaveConfirmModal(false)} style={{ borderRadius: '8px' }}>
                        {t('cancel') || 'Zrušit'}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Start Final Modal */}
            <Modal isOpen={showStartFinalModal} toggle={() => setShowStartFinalModal(false)}>
                <ModalHeader toggle={() => setShowStartFinalModal(false)} style={{ 
                    background: isDark ? '#1e1e2f' : '#f8f9fa',
                    color: isDark ? 'white' : '#32325d'
                }}>
                    <i className="tim-icons icon-triangle-right-17 mr-2" style={{ color: '#2dce89' }} />
                    {t('startFinalBracket') || 'Spustit finálový pavouk'}
                </ModalHeader>
                <ModalBody style={{ background: isDark ? '#2d2d44' : '#fff' }}>
                    <p style={{ color: isDark ? '#a0aec0' : '#525f7f' }}>
                        {t('startFinalDescription') || 'Tato akce přesune vítěze ze skupin do finálového pavouka. Ujistěte se, že všechny skupinové zápasy jsou dokončeny.'}
                    </p>
                    <FormGroup>
                        <Label style={{ fontWeight: '600', color: isDark ? '#fff' : '#32325d' }}>
                            {t('advancingPerGroup') || 'Počet postupujících z každé skupiny'}
                        </Label>
                        <Input
                            type="number"
                            min="1"
                            max="4"
                            value={params.advancingPerGroup}
                            onChange={(e) => setParams({...params, advancingPerGroup: parseInt(e.target.value)})}
                            className={isDark ? 'bg-dark text-white' : ''}
                            style={{ borderRadius: '8px' }}
                        />
                    </FormGroup>
                </ModalBody>
                <ModalFooter style={{ background: isDark ? '#2d2d44' : '#fff' }}>
                    <Button color="success" onClick={handleStartFinal} disabled={loading} style={{ borderRadius: '8px' }}>
                        {loading ? <Spinner size="sm" /> : <><i className="tim-icons icon-triangle-right-17 mr-1" /> {t('startFinal') || 'Spustit finále'}</>}
                    </Button>
                    <Button color="secondary" onClick={() => setShowStartFinalModal(false)} style={{ borderRadius: '8px' }}>
                        {t('cancel') || 'Zrušit'}
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}

export default TournamentGenerator;
