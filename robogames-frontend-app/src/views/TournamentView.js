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
    Input, Label, FormGroup, Spinner, Button
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
                    background: isDark ? '#252536' : '#fff',
                    color: isDark ? '#666' : '#999',
                    padding: '10px 14px',
                    fontSize: '0.9em',
                    borderBottom: isTop ? `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}` : 'none'
                }}>
                    <span style={{ fontStyle: 'italic' }}>
                        {isBye ? (t('bye') || 'BYE') : (t('waitingForWinner') || 'Čeká na vítěze')}
                    </span>
                </SeedTeam>
            );
        }

        const isWinner = isCompleted && team.isWinner;

        return (
            <SeedTeam style={{
                background: isWinner 
                    ? (isDark ? 'rgba(45, 206, 137, 0.15)' : 'rgba(45, 206, 137, 0.1)')
                    : (isDark ? '#252536' : '#fff'),
                padding: '10px 14px',
                fontSize: '0.9em',
                borderBottom: isTop ? `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}` : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Link 
                    to={`/admin/robot-profile?id=${team.id}`}
                    style={{ 
                        color: isDark ? '#fff' : '#32325d',
                        textDecoration: 'none',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span style={{ 
                        color: isDark ? '#a0aec0' : '#888', 
                        fontSize: '0.85em',
                        fontWeight: '500'
                    }}>
                        N{team.number}
                    </span>
                    <span style={{ fontWeight: isWinner ? '600' : '500' }}>
                        {team.name}
                    </span>
                </Link>
                <span style={getScoreStyle(isWinner)}>
                    {team.score !== null && team.score !== undefined ? team.score : '-'}
                </span>
            </SeedTeam>
        );
    };

    return (
        <Seed mobileBreakpoint={breakpoint} style={{ fontSize: 12 }}>
            <SeedItem style={{
                background: isBye 
                    ? (isDark ? 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)' : 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)')
                    : (isDark 
                        ? 'linear-gradient(135deg, #1e1e2f 0%, #2d2d44 100%)'
                        : 'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)'),
                border: `1px solid ${isBye ? (isDark ? '#4a5568' : '#a0aec0') : (isDark ? '#3d3d5c' : '#e0e0e0')}`,
                borderRadius: '8px',
                boxShadow: isDark 
                    ? '0 4px 15px rgba(0,0,0,0.3)' 
                    : '0 4px 15px rgba(0,0,0,0.1)',
                opacity: isBye ? 0.7 : 1,
                minWidth: '220px'
            }}>
                <div>
                    <TeamDisplay team={robotA} isTop={true} />
                    <TeamDisplay team={robotB} isTop={false} />
                </div>
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

    // Filter out the 3rd place round from main bracket (it will be shown separately)
    // Check by round name or by individual match phase
    const mainRounds = bracket.filter(round => {
        // Check round name
        if (round.name && (round.name.includes('3. místo') || round.name === 'O 3. místo' || round.name === '3rd Place Match')) {
            return false;
        }
        // Check if all matches in round have THIRD_PLACE phase
        if (round.matches && round.matches.length > 0 && round.matches.every(m => m.phaseName === 'THIRD_PLACE')) {
            return false;
        }
        return true;
    });

    // Find the 3rd place round (by name or by phase)
    const thirdPlaceRound = bracket.find(round => {
        if (round.name && (round.name.includes('3. místo') || round.name === 'O 3. místo' || round.name === '3rd Place Match')) {
            return true;
        }
        if (round.matches && round.matches.length > 0 && round.matches.every(m => m.phaseName === 'THIRD_PLACE')) {
            return true;
        }
        return false;
    });

    // Transform bracket data for react-brackets format
    const transformedRounds = mainRounds.map((round) => ({
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

    // Transform 3rd place match for display
    const renderThirdPlaceMatch = () => {
        if (!thirdPlaceRound || !thirdPlaceRound.matches || thirdPlaceRound.matches.length === 0) {
            return null;
        }
        const match = thirdPlaceRound.matches[0];
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

        return (
            <div style={{ 
                marginTop: '20px',
                padding: '15px',
                background: isDark 
                    ? 'linear-gradient(135deg, #2d2d44 0%, #1e1e2f 100%)' 
                    : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderRadius: '8px',
                border: `2px solid ${isDark ? '#cd7f32' : '#cd7f32'}`, // Bronze color
                maxWidth: '350px',
                margin: '20px auto 0 auto'
            }}>
                <h6 style={{ 
                    color: '#cd7f32', 
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <i className="tim-icons icon-trophy" />
                    {t('thirdPlaceMatch') || 'Zápas o 3. místo'}
                </h6>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <CustomSeed 
                        seed={{
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
                        }}
                        isDark={isDark}
                        breakpoint={0}
                    />
                </div>
                <small style={{ 
                    color: isDark ? '#a0aec0' : '#666',
                    display: 'block',
                    textAlign: 'center',
                    marginTop: '10px',
                    fontStyle: 'italic'
                }}>
                    {t('thirdPlaceDesc') || 'Poražení ze semifinále soutěží o 3. místo'}
                </small>
            </div>
        );
    };

    return (
        <div className="bracket-wrapper" style={{ 
            overflowX: 'auto',
            padding: '20px',
            background: isDark ? '#1e1e2f' : '#f8f9fa',
            borderRadius: '12px',
            border: `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}`
        }}>
            <style>{`
                .bracket-wrapper .rs-bracket-wrapper {
                    min-width: fit-content;
                }
                .bracket-wrapper svg {
                    overflow: visible !important;
                }
                .bracket-wrapper [class*="jMNptE"],
                .bracket-wrapper [class*="sc-"],
                .bracket-wrapper svg path {
                    stroke-width: 2px !important;
                }
                .bracket-wrapper [class*="Bracket"],
                .bracket-wrapper [class*="Round"] {
                    overflow: visible !important;
                }
            `}</style>
            <Bracket
                rounds={transformedRounds}
                renderSeedComponent={(props) => <CustomSeed {...props} isDark={isDark} />}
                mobileBreakpoint={0}
                roundTitleComponent={(title) => (
                    <div style={{
                        textAlign: 'center',
                        color: isDark ? '#fff' : '#32325d',
                        fontWeight: '600',
                        padding: '12px 16px',
                        marginBottom: '15px',
                        background: isDark 
                            ? 'linear-gradient(135deg, #2d2d44 0%, #1e1e2f 100%)'
                            : 'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)',
                        borderRadius: '8px',
                        border: `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}`,
                        boxShadow: isDark 
                            ? '0 2px 8px rgba(0,0,0,0.2)' 
                            : '0 2px 8px rgba(0,0,0,0.08)'
                    }}>
                        {title}
                    </div>
                )}
            />
            
            {/* 3rd Place Match - shown separately below the bracket */}
            {renderThirdPlaceMatch()}
        </div>
    );
};

// Medal icons component
const MedalIcon = ({ place }) => {
    const colors = {
        1: { main: '#FFD700', shadow: '#B8860B' }, // Gold
        2: { main: '#C0C0C0', shadow: '#A0A0A0' }, // Silver
        3: { main: '#CD7F32', shadow: '#8B4513' }  // Bronze
    };
    const color = colors[place] || colors[3];
    
    return (
        <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${color.main} 0%, ${color.shadow} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: place === 2 ? '#333' : '#fff',
            fontSize: '14px',
            boxShadow: `0 2px 8px ${color.shadow}40`,
            flexShrink: 0
        }}>
            {place}
        </div>
    );
};

// Winners Overview Component - displays all winners when no specific discipline/category selected
const WinnersOverview = ({ winners, isDark, loading, year, onSelectCategory }) => {
    if (loading) {
        return (
            <div className="text-center py-5">
                <Spinner color="primary" />
                <p className="mt-2" style={{ color: isDark ? '#a0aec0' : '#666' }}>
                    {t('loadingWinners') || 'Načítám vítěze...'}
                </p>
            </div>
        );
    }

    if (!winners || winners.length === 0) {
        return (
            <div className="text-center py-5">
                <i className="tim-icons icon-trophy" style={{ fontSize: '3em', color: isDark ? '#a0aec0' : '#666' }} />
                <p className="mt-3" style={{ color: isDark ? '#a0aec0' : '#666' }}>
                    {t('noWinnersYet') || 'Zatím nejsou k dispozici žádní vítězové'}
                </p>
            </div>
        );
    }

    // Filter disciplines that have at least some winners
    const disciplinesWithWinners = winners.filter(d => d.hasAnyWinners);

    if (disciplinesWithWinners.length === 0) {
        return (
            <div className="text-center py-5">
                <i className="tim-icons icon-trophy" style={{ fontSize: '3em', color: isDark ? '#a0aec0' : '#666' }} />
                <p className="mt-3" style={{ color: isDark ? '#a0aec0' : '#666' }}>
                    {t('noWinnersYet') || 'Zatím nejsou k dispozici žádní vítězové'}
                </p>
            </div>
        );
    }

    return (
        <div>
            <div className="text-center mb-4">
                <h4 style={{ color: isDark ? '#fff' : '#32325d' }}>
                    {t('winnersOverview')} {year}
                </h4>
                <p style={{ color: isDark ? '#a0aec0' : '#666', fontSize: '0.9em' }}>
                    {t('winnersDescription') || 'Vyberte disciplínu a kategorii pro podrobné zobrazení turnaje'}
                </p>
            </div>

            <Row>
                {disciplinesWithWinners.map((discipline) => (
                    <Col lg="6" key={discipline.disciplineId} className="mb-4">
                        <Card style={{
                            borderRadius: '12px',
                            border: `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}`,
                            overflow: 'hidden',
                            height: '100%',
                            background: isDark ? '#27293d' : '#fff'
                        }}>
                            <CardHeader style={{
                                background: 'linear-gradient(0deg, #ef6000 0%, #ef6000 100%)',
                                color: '#fff',
                                padding: '15px 20px',
                                borderBottom: 'none'
                            }}>
                                <h5 className="mb-0" style={{ fontWeight: '600', color: '#fff' }}>
                                    <i className="tim-icons icon-controller mr-2" style={{ color: '#fff' }} />
                                    {discipline.disciplineName}
                                </h5>
                            </CardHeader>
                            <CardBody style={{ 
                                padding: '20px',
                                background: isDark ? '#27293d' : '#fff'
                            }}>
                                {discipline.categories.map((category, catIdx) => (
                                    <div key={category.category} style={{
                                        marginBottom: catIdx < discipline.categories.length - 1 ? '20px' : 0,
                                        paddingBottom: catIdx < discipline.categories.length - 1 ? '20px' : 0,
                                        borderBottom: catIdx < discipline.categories.length - 1 
                                            ? `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}` 
                                            : 'none'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: '12px'
                                        }}>
                                            <Badge 
                                                color={category.category === 'LOW_AGE_CATEGORY' ? 'info' : 'warning'}
                                                style={{ fontSize: '0.8em' }}
                                            >
                                                {category.categoryLabel}
                                            </Badge>
                                            {onSelectCategory && (
                                                <Button
                                                    color="primary"
                                                    size="sm"
                                                    onClick={() => onSelectCategory(discipline.disciplineId, category.category)}
                                                    style={{
                                                        padding: '4px 10px',
                                                        fontSize: '0.75em',
                                                        borderRadius: '6px'
                                                    }}
                                                    title={t('showFullStandings') || 'Zobrazit kompletní pořadí'}
                                                >
                                                    <i className="tim-icons icon-bullet-list-67 mr-1" />
                                                    {t('allStandings') || 'Vše'}
                                                </Button>
                                            )}
                                        </div>
                                        
                                        {category.hasWinners ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {category.winners.map((winner) => (
                                                    <div key={`${winner.robotId}-${winner.place}`} style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        padding: '12px 14px',
                                                        background: isDark 
                                                            ? '#1e1e2f' 
                                                            : '#f8f9fa',
                                                        borderRadius: '8px',
                                                        border: `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}`
                                                    }}>
                                                        <MedalIcon place={winner.place} />
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                color: isDark ? '#fff' : '#32325d',
                                                                fontWeight: '600',
                                                                fontSize: '0.95em'
                                                            }}>
                                                                <span style={{ 
                                                                    color: isDark ? '#a0aec0' : '#888',
                                                                    fontSize: '0.85em'
                                                                }}>
                                                                    N{winner.robotNumber}
                                                                </span>
                                                                <Link 
                                                                    to={`/admin/robot-profile?id=${winner.robotId}`}
                                                                    style={{ 
                                                                        color: isDark ? '#fff' : '#32325d',
                                                                        textDecoration: 'none',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap'
                                                                    }}
                                                                >
                                                                    {winner.robotName}
                                                                </Link>
                                                            </div>
                                                            <div style={{
                                                                color: isDark ? '#a0aec0' : '#666',
                                                                fontSize: '0.8em',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                <i className="tim-icons icon-single-02 mr-1" style={{ fontSize: '0.9em' }} />
                                                                {winner.teamName}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{
                                                padding: '15px',
                                                textAlign: 'center',
                                                color: isDark ? '#a0aec0' : '#999',
                                                fontStyle: 'italic',
                                                fontSize: '0.85em',
                                                background: isDark 
                                                    ? '#1e1e2f' 
                                                    : '#f8f9fa',
                                                borderRadius: '8px',
                                                border: `1px solid ${isDark ? '#3d3d5c' : '#e0e0e0'}`
                                            }}>
                                                {t('noWinnerInCategory') || 'Zatím žádný vítěz'}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </CardBody>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
};

function TournamentView() {
    const { selectedYear, currentCompetition } = useAdmin();
    const toast = useToast();
    const { theme } = useContext(ThemeContext);
    const isDark = theme === themes.dark;
    const [searchParams] = useSearchParams();

    // Check if user has admin-level role (can see results even when hidden)
    const rolesString = localStorage.getItem('roles');
    const rolesArray = rolesString ? rolesString.split(', ') : [];
    const hasAdminAccess = rolesArray.some(role => ['ADMIN', 'LEADER', 'REFEREE', 'ASSISTANT'].includes(role));
    
    // User can see results if: showResults is true OR user has admin access
    const canSeeResults = currentCompetition?.showResults || hasAdminAccess;

    // State
    const [disciplines, setDisciplines] = useState([]);
    const [selectedDiscipline, setSelectedDiscipline] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [tournamentData, setTournamentData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [allWinners, setAllWinners] = useState([]);
    const [winnersLoading, setWinnersLoading] = useState(false);

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

    // Fetch all winners when year is selected but no specific discipline/category
    useEffect(() => {
        if (selectedYear && (!selectedDiscipline || !selectedCategory)) {
            fetchAllWinners();
        }
    }, [selectedYear, selectedDiscipline, selectedCategory]);

    // Fetch tournament data when all params selected
    useEffect(() => {
        if (selectedYear && selectedDiscipline && selectedCategory) {
            fetchTournamentData();
        }
    }, [selectedYear, selectedDiscipline, selectedCategory]);

    // Manual refresh function
    const handleRefresh = () => {
        if (selectedYear && selectedDiscipline && selectedCategory) {
            fetchTournamentData();
        } else if (selectedYear) {
            fetchAllWinners();
        }
    };

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

    const fetchAllWinners = async () => {
        if (!selectedYear) return;
        
        setWinnersLoading(true);
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}module/competitionEvaluation/allWinners?year=${selectedYear}`
            );
            const data = await response.json();
            
            if (response.ok && data.type === 'RESPONSE') {
                setAllWinners(data.data);
            } else {
                setAllWinners([]);
            }
        } catch (error) {
            console.error('Failed to fetch winners:', error);
            setAllWinners([]);
        } finally {
            setWinnersLoading(false);
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
                            <Row className="mb-4 align-items-end">
                                <Col md="5">
                                    <FormGroup className="mb-0">
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
                                <Col md="5">
                                    <FormGroup className="mb-0">
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
                                <Col md="2">
                                    <FormGroup className="mb-0">
                                        <Label style={{ color: 'transparent' }}>&nbsp;</Label>
                                        <button
                                            onClick={handleRefresh}
                                            disabled={loading || winnersLoading}
                                            className="btn btn-primary w-100"
                                            style={{
                                                height: '40px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                marginTop: '0',
                                                marginBottom: '0'
                                            }}
                                        >
                                            {(loading || winnersLoading) ? (
                                                <Spinner size="sm" />
                                            ) : (
                                                <i className="tim-icons icon-refresh-02" />
                                            )}
                                            <span className="d-none d-lg-inline">{t('refresh') || 'Obnovit'}</span>
                                        </button>
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
                            {!loading && !tournamentData && selectedYear && (!selectedDiscipline || !selectedCategory) && canSeeResults && (
                                <WinnersOverview 
                                    winners={allWinners}
                                    isDark={isDark}
                                    loading={winnersLoading}
                                    year={selectedYear}
                                    onSelectCategory={(disciplineId, category) => {
                                        setSelectedDiscipline(disciplineId.toString());
                                        setSelectedCategory(category);
                                    }}
                                />
                            )}

                            {/* Message when showResults is false and user doesn't have admin access */}
                            {!loading && !tournamentData && selectedYear && (!selectedDiscipline || !selectedCategory) && !canSeeResults && (
                                <div className="text-center py-5">
                                    <i className="tim-icons icon-lock-circle" style={{ fontSize: '3em', color: isDark ? '#a0aec0' : '#666' }} />
                                    <p className="mt-3" style={{ color: isDark ? '#a0aec0' : '#666' }}>
                                        {t('resultsHidden') || 'Globální výsledky jsou pro tento ročník skryty'}
                                    </p>
                                </div>
                            )}

                            {/* Empty state when no year selected */}
                            {!loading && !selectedYear && (
                                <div className="text-center py-5">
                                    <i className="tim-icons icon-zoom-split" style={{ fontSize: '3em', color: isDark ? '#a0aec0' : '#666' }} />
                                    <p className="mt-3" style={{ color: isDark ? '#a0aec0' : '#666' }}>
                                        {t('selectYear') || 'Vyberte ročník pro zobrazení dat'}
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
