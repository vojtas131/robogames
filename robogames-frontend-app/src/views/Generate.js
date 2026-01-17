import React, { useState, useEffect, useRef } from "react";
import { Bracket, Seed, SeedItem, SeedTeam } from "react-brackets";
import "../assets/css/rs-react-styles.css";
import { t } from "translations/translate";

/* ===== Seed pre react-brackets (čas + ring) ===== */

const FastSeed = ({ seed, breakpoint }) => (
    <Seed mobileBreakpoint={breakpoint} style={{ fontSize: 12 }}>
        <SeedItem>
            <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    {seed.time} • Ring {seed.ring}
                </div>
                <SeedTeam>{seed.teams[0]?.name || "NaN"}</SeedTeam>
                <SeedTeam>{seed.teams[1]?.name || "NaN"}</SeedTeam>
            </div>
        </SeedItem>
    </Seed>
);

/* ===== Helpery pre čas a kapacitu ===== */

function parseTimeToMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

function formatMinutesToTime(m) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    const hhStr = String(h).padStart(2, "0");
    const mmStr = String(mm).padStart(2, "0");
    return `${hhStr}:${mmStr}`;
}

function computeCapacity(rings, startTime, endTime, matchMinutes) {
    const start = parseTimeToMinutes(startTime);
    const end = parseTimeToMinutes(endTime);
    const totalMinutes = Math.max(0, end - start);
    const capacityMatches = Math.floor((rings * totalMinutes) / matchMinutes);
    return { start, end, totalMinutes, capacityMatches };
}

function assignSchedule(matches, startMinute, matchMinutes, rings) {
    // Improved scheduler: greedily pick the unscheduled match that can start the
    // earliest (considering robot and ring availability). This maximizes
    // parallelism across rings while preventing robot overlaps.
    const ringNext = new Array(Math.max(1, rings)).fill(startMinute);
    const robotNext = Object.create(null);
    const scheduled = [];

    // Clone matches so we can mutate unscheduled list
    const unscheduled = matches.map((m) => ({ ...m }));

    while (unscheduled.length > 0) {
        let bestIdx = -1;
        let bestMatchStart = Number.POSITIVE_INFINITY;
        let bestRing = 0;

        // evaluate earliest start for each unscheduled match
        for (let i = 0; i < unscheduled.length; i++) {
            const m = unscheduled[i];
            const aRaw = m.a;
            const bRaw = m.b;
            const aId = typeof aRaw === 'number' && !isNaN(aRaw) ? String(aRaw) : null;
            const bId = typeof bRaw === 'number' && !isNaN(bRaw) ? String(bRaw) : null;
            const aNext = aId ? (robotNext[aId] || startMinute) : startMinute;
            const bNext = bId ? (robotNext[bId] || startMinute) : startMinute;

            // pick ring that gives earliest start for this match
            let localBestStart = Number.POSITIVE_INFINITY;
            let localBestRing = 0;
            for (let r = 0; r < ringNext.length; r++) {
                const candidateStart = Math.max(aNext, bNext, ringNext[r]);
                if (candidateStart < localBestStart) {
                    localBestStart = candidateStart;
                    localBestRing = r;
                }
            }

            // prefer matches that can start earlier; tie-breaker by id
            if (
                localBestStart < bestMatchStart ||
                (localBestStart === bestMatchStart && bestIdx !== -1 && String(m.id) < String(unscheduled[bestIdx].id))
            ) {
                bestMatchStart = localBestStart;
                bestIdx = i;
                bestRing = localBestRing;
            }
        }

        // schedule the selected match
        const m = unscheduled.splice(bestIdx, 1)[0];
        const matchStart = bestMatchStart;
        const matchEnd = matchStart + matchMinutes;
        const assigned = { ...m, start: matchStart, end: matchEnd, ring: bestRing + 1 };
        scheduled.push(assigned);

        // update availability
        ringNext[bestRing] = matchEnd;
        const aId = typeof m.a === 'number' && !isNaN(m.a) ? String(m.a) : null;
        const bId = typeof m.b === 'number' && !isNaN(m.b) ? String(m.b) : null;
        if (aId) robotNext[aId] = matchEnd;
        if (bId) robotNext[bId] = matchEnd;
    }

    return scheduled;
}

/* ===== Generátory zápasov – pavouk ===== */

function splitPreRoundAndMain(playersCount) {
    let base = 1;
    while ((base << 1) <= playersCount) base <<= 1;

    if (playersCount === base) {
        return { preRoundPairs: 0, mainSize: playersCount };
    }

    const preRoundPlayers = 2 * (playersCount - base);
    const mainSize = base;
    return {
        preRoundPairs: preRoundPlayers / 2,
        mainSize,
    };
}

function buildMainSlots(playersCount) {
    const { preRoundPairs, mainSize } = splitPreRoundAndMain(playersCount);

    const preRoundSlots = [];
    const directSlots = [];
    const preWinners = [];

    let currentPlayer = 1;

    // hráči do předkola
    for (let i = 0; i < preRoundPairs * 2; i++) {
        preRoundSlots.push(`Robot ${currentPlayer++}`);
    }

    // hráči s bye idú rovno do hlavného pavúka
    while (currentPlayer <= playersCount) {
        directSlots.push(`Robot ${currentPlayer++}`);
    }

    // víťazi z předkola ako sloty
    for (let i = 0; i < preRoundPairs; i++) {
        preWinners.push(`Vítěz předkola ${i + 1}`);
    }

    const allMain = [...directSlots, ...preWinners].slice(0, mainSize);
    return { preRoundSlots, allMain, preRoundPairs, mainSize };
}

// Generuje komplet zápasy + rounds pre Bracket
function generateSpiderMatchesAndRounds(playersCount, rings) {
    const matches = [];
    let matchId = 1;

    const { preRoundSlots, allMain, preRoundPairs } =
        buildMainSlots(playersCount);

    const roundsForBracket = [];

    // 1) Předkolo
    if (preRoundPairs > 0) {
        const seeds = [];
        for (let i = 0; i < preRoundPairs; i++) {
            const a = preRoundSlots[i * 2];
            const b = preRoundSlots[i * 2 + 1];
            const ringNum = (i % rings) + 1;

            matches.push({
                id: `PR_${matchId}`,
                phase: "Play-off",
                roundName: "Předkolo",
                ring: ringNum,
                aLabel: a,
                bLabel: b,
                a: parseInt(a.replace(/[^\d]/g, ""), 10),
                b: parseInt(b.replace(/[^\d]/g, ""), 10),
                seedId: `PR-${i + 1}`,
            });

            seeds.push({
                id: `PR-${i + 1}`,
                ring: ringNum,
                teams: [{ name: a }, { name: b }],
            });

            matchId++;
        }

        roundsForBracket.push({
            title: "Předkolo",
            seeds,
        });
    }

    // 2) Hlavný pavouk z allMain (2^k slotov)
    let currentSlots = allMain.slice();
    let roundIndex = 0;

    while (currentSlots.length > 1) {
        const nextSlots = [];
        const seeds = [];
        const pairs = currentSlots.length / 2;
        const matchesPerRing = Math.max(1, Math.ceil(pairs / rings));

        for (let i = 0; i < pairs; i++) {
            const p1 = currentSlots[i * 2];
            const p2 = currentSlots[i * 2 + 1];
            const ringNum = (Math.floor(i / matchesPerRing) % rings) + 1;

            const roundName =
                currentSlots.length === 2
                    ? "Finále"
                    : currentSlots.length === 4
                    ? "Semifinále"
                    : currentSlots.length === 8
                    ? "Čtvrtfinále"
                    : `Kolo ${roundIndex + 1}`;

            matches.push({
                id: `KO_${matchId}`,
                phase: "Play-off",
                roundName,
                ring: ringNum,
                aLabel: p1,
                bLabel: p2,
                a: parseInt(p1.replace(/[^\d]/g, ""), 10),
                b: parseInt(p2.replace(/[^\d]/g, ""), 10),
                seedId: `${roundIndex + 1}-${i + 1}`,
            });

            seeds.push({
                id: `${roundIndex + 1}-${i + 1}`,
                ring: ringNum,
                teams: [{ name: p1 }, { name: p2 }],
            });

            nextSlots.push(`Vítěz ${roundName} ${i + 1}`);
            matchId++;
        }

        roundsForBracket.push({
            title:
                currentSlots.length === 2
                    ? "Finále"
                    : currentSlots.length === 4
                    ? "Semifinále"
                    : currentSlots.length === 8
                    ? "Čtvrtfinále"
                    : `Kolo ${roundIndex + 1}`,
            seeds,
        });

        currentSlots = nextSlots;
        roundIndex++;
    }

    return { matches, rounds: roundsForBracket };
}

/* ===== Skupiny (len group fáza) ===== */

function generateGroupsOnly(S, rings, groupSize) {
    // Balanced distribution of players into groups and round-robin ring assignment
    const numGroups = Math.max(1, Math.ceil(S / groupSize));
    const baseSize = Math.floor(S / numGroups);
    const extra = S % numGroups; // first `extra` groups get +1 player

    const groups = [];
    let player = 1;
    for (let g = 0; g < numGroups; g++) {
        const size = g < extra ? baseSize + 1 : baseSize;
        const groupPlayers = [];
        for (let i = 0; i < size; i++) {
            if (player <= S) groupPlayers.push(player++);
        }
        groups.push(groupPlayers);
    }

    const matches = [];
    let id = 1;
    // rotate rings across all generated matches to keep load balanced
    let ringRotation = 0;

    groups.forEach((players, gi) => {
        const label = String.fromCharCode(65 + gi); // A, B, C...
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const a = players[i];
                const b = players[j];
                const ringNum = (ringRotation % Math.max(1, rings)) + 1;
                ringRotation++;
                matches.push({
                    id: `G_${id++}`,
                    phase: `Skupina ${label}`,
                    roundName: `Skupina ${label}`,
                    ring: ringNum,
                    a,
                    b,
                });
            }
        }
    });

    return { matches, groups };
}

function estimateGroupMatches(S, groupSize) {
    const numGroups = Math.ceil(S / groupSize);
    let matches = 0;
    let playersLeft = S;

    for (let g = 0; g < numGroups; g++) {
        const size = Math.min(groupSize, playersLeft);
        matches += (size * (size - 1)) / 2;
        playersLeft -= size;
    }
    return matches;
}

// Divide players into groups as evenly as possible
function divideIntoGroupsEvenly(S, groupSize) {
    const numGroups = Math.max(1, Math.ceil(S / groupSize));
    const baseSize = Math.floor(S / numGroups);
    const extra = S % numGroups;
    const groups = [];
    let player = 1;
    for (let g = 0; g < numGroups; g++) {
        const size = g < extra ? baseSize + 1 : baseSize;
        const groupPlayers = [];
        for (let i = 0; i < size; i++) {
            if (player <= S) groupPlayers.push(player++);
        }
        groups.push(groupPlayers);
    }
    return groups;
}

// Choose best group size considering capacity, ring balance and group balance
function findBestGroupSize(S, rings, cap, minSize = 4, maxSize = 6) {
    let best = null;
    let bestScore = Infinity;

    for (let gSize = minSize; gSize <= maxSize; gSize++) {
        const matches = estimateGroupMatches(S, gSize);
        if (matches === 0) continue;
        if (matches > cap.capacityMatches) continue; // skip over-capacity

        const numGroups = Math.max(1, Math.ceil(S / gSize));
        const baseSize = Math.floor(S / numGroups);
        const extra = S % numGroups;
        const balancePenalty = extra; // fewer extra -> better

        const matchesPerRing = matches / Math.max(1, rings);
        const ringBalancePenalty = Math.abs(matchesPerRing - Math.round(matchesPerRing));

        const utilizationDiff = Math.abs(cap.capacityMatches - matches);

        const score = utilizationDiff + balancePenalty * 1.5 + ringBalancePenalty * 2;
        if (score < bestScore) {
            bestScore = score;
            best = { gSize, matches, numGroups };
        }
    }
    return best;
}

// Validate if matches fit into available ring slots; return suggestion if not
function validateRingCapacity(matchesCount, rings, matchMinutes, totalMinutes) {
    const slotsPerRing = Math.floor(totalMinutes / matchMinutes);
    const totalSlots = slotsPerRing * Math.max(1, rings);
    if (matchesCount > totalSlots) {
        return {
            valid: false,
            requiredSlots: matchesCount,
            totalSlots,
            suggestion: `Potrebujete viac ringov alebo dlhší čas; dostupných slotov: ${totalSlots}`,
        };
    }
    return { valid: true };
}

// Ensure number of groups is a power of 2 (2^n). If not, redistribute players
// evenly into the largest 2^n groups that keeps min 4 players per group.
function splitPlayersIntoNGroups(players, target) {
    const groups = [];
    let idx = 0;
    for (let g = 0; g < target; g++) {
        const remaining = players.length - idx;
        const groupsLeft = target - g;
        const size = Math.ceil(remaining / groupsLeft);
        const gp = [];
        for (let i = 0; i < size && idx < players.length; i++) {
            gp.push(players[idx++]);
        }
        groups.push(gp);
    }
    return groups;
}

function enforcePerfectSquareGroups(groups, totalPlayers) {
    // Choose the largest power-of-two group count that keeps min 4 players per group.
    const maxGroupsByMinSize = Math.floor(totalPlayers / 4);
    // Find largest power of 2 <= maxGroupsByMinSize
    let target = 1;
    while (target * 2 <= maxGroupsByMinSize) {
        target *= 2;
    }
    // Ensure at least 1 group
    target = Math.max(1, target);

    // flatten players and redistribute into `target` groups
    const players = [];
    groups.forEach((g) => players.push(...g));
    if (players.length === 0) {
        for (let p = 1; p <= totalPlayers; p++) players.push(p);
    }
    players.sort((a, b) => a - b);
    return splitPlayersIntoNGroups(players, target);
}

function regenerateMatchesFromGroups(groups, rings) {
    const matches = [];
    let id = 1;
    let ringRotation = 0;
    groups.forEach((players, gi) => {
        const label = String.fromCharCode(65 + gi);
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const a = players[i];
                const b = players[j];
                const ringNum = (ringRotation % Math.max(1, rings)) + 1;
                ringRotation++;
                matches.push({
                    id: `G_${id++}`,
                    phase: `Skupina ${label}`,
                    roundName: `Skupina ${label}`,
                    ring: ringNum,
                    a,
                    b,
                });
            }
        }
    });
    return matches;
}

// Build provisional play-off bracket (single elimination) from groups:
// seed order: 1st of group A vs 2nd of group B (shifted), repeated; then standard bracket with byes to power-of-two.
function buildGroupPlayoff(groups, rings) {
    const G = groups.length;
    if (G < 2) return { rounds: [], matches: [] };

    const label = (idx) => String.fromCharCode(65 + idx);
    const seeds = [];
    for (let i = 0; i < G; i++) {
        const a = `1. ${label(i)}`;
        const b = `2. ${label((i + 1) % G)}`;
        seeds.push(a, b);
    }

    // pad to next power of two with null (byes)
    let size = 1;
    while (size < seeds.length) size <<= 1;
    const padded = seeds.slice();
    while (padded.length < size) padded.push(null);

    const rounds = [];
    const allMatches = [];
    let current = padded;
    let roundIndex = 0;
    let matchId = 1;
    const ringCount = Math.max(1, rings);
    let ringRotation = 0;

    while (current.length > 1) {
        const nextSeeds = [];
        const seedsForBracket = [];
        const roundMatches = [];
        const pairs = current.length / 2;

        for (let i = 0; i < pairs; i++) {
            const p1 = current[i * 2];
            const p2 = current[i * 2 + 1];
            const ringNum = (ringRotation % ringCount) + 1;
            ringRotation++;

            if (p1 && p2) {
                const roundName =
                    current.length === 2
                        ? "Finále"
                        : current.length === 4
                        ? "Semifinále"
                        : current.length === 8
                        ? "Čtvrtfinále"
                        : `Kolo ${roundIndex + 1}`;

                const match = {
                    id: `PO_${matchId++}`,
                    phase: "Play-off",
                    roundName,
                    ring: ringNum,
                    aLabel: p1,
                    bLabel: p2,
                    a: matchId * 10 + i * 2 + 1, // synthetic ids to avoid collisions
                    b: matchId * 10 + i * 2 + 2,
                };
                roundMatches.push(match);
                seedsForBracket.push({
                    id: `${roundIndex + 1}-${i + 1}`,
                    ring: ringNum,
                    teams: [{ name: p1 }, { name: p2 }],
                });
                nextSeeds.push(`Vítěz ${roundName} ${i + 1}`);
            } else if (p1 || p2) {
                // bye: whoever exists advances
                nextSeeds.push(p1 || p2);
            }
        }

        if (roundMatches.length) {
            rounds.push({
                title:
                    current.length === 2
                        ? "Finále"
                        : current.length === 4
                        ? "Semifinále"
                        : current.length === 8
                        ? "Čtvrtfinále"
                        : `Kolo ${roundIndex + 1}`,
                seeds: seedsForBracket,
            });
            allMatches.push(...roundMatches);
        }

        current = nextSeeds;
        roundIndex++;
    }

    return { rounds, matches: allMatches };
}

/* ===== Pomocná funkcia na vytvorenie plánu ===== */

function buildPlan(cap, mode, scheduled, rawCount, extraInfo = {}) {
    const count = scheduled.length;
    const utilization =
        cap.capacityMatches > 0
            ? Math.round((count / cap.capacityMatches) * 100)
            : 0;
    const overload = count > cap.capacityMatches;
    return {
        mode,
        matches: scheduled,
        matchCount: count,
        rawCount,
        utilization,
        overload,
        ...extraInfo,
    };
}

/* ===== Prezentančné komponenty ===== */

const GlobalStats = ({ info }) => {
    if (!info) return null;
    if (info.error) {
        return (
            <div className="rs-stats rs-stats-error">
                {info.error}
            </div>
        );
    }
    return (
        <div className="rs-stats rs-stats-info">
            Celkový čas: <b>{info.totalMinutes}</b> min, kapacita:{" "}
            <b>{info.capacityMatches}</b> zápasů.
        </div>
    );
};

const VariantStats = ({ plan }) => {
    if (!plan) return null;

    let extraClass = "rs-stats-ok";
    if (plan.overload) extraClass = "rs-stats-error";
    else if (plan.utilization < 40) extraClass = "rs-stats-warn";

    let label = "";
    if (plan.mode === "SPIDER") label = "Vyřazovací pavouk";
    if (plan.mode === "GROUP") label = "Skupinová fáze (skupiny)";

    return (
        <div className={`rs-stats ${extraClass}`}>
            <b>{label}</b>
            {plan.groupSize ? (
                <>
                    {" "}
                    • Velikost skupiny: <b>{plan.groupSize}</b>
                </>
            ) : null}
            <br />
            Počet zápasů: <b>{plan.matchCount}</b>
            <br />
            Využití kapacity: <b>{plan.utilization}%</b>
            {plan.overload ? " (překročeno!)" : ""}
        </div>
    );
};

const PlanTable = ({ plan }) => {
    if (!plan) return null;

    const sorted = [...plan.matches].sort(
        (m1, m2) => m1.start - m2.start || m1.ring - m2.ring
    );

    if (!sorted.length) {
        return (
            <table className="rs-table">
                <tbody>
                    <tr>
                        <td className="rs-td">Žádné zápasy.</td>
                    </tr>
                </tbody>
            </table>
        );
    }

    return (
        <table className="rs-table">
            <thead>
                <tr>
                    <th className="rs-th">Čas</th>
                    <th className="rs-th">Ring</th>
                    <th className="rs-th">Část</th>
                    <th className="rs-th">Kolo</th>
                    <th className="rs-th">Zápas</th>
                </tr>
            </thead>
            <tbody>
                {sorted.map((m, idx) => (
                    <tr
                        key={m.id}
                        className={idx % 2 === 0 ? "rs-row-even" : "rs-row-odd"}
                    >
                        <td className="rs-td">
                            {formatMinutesToTime(m.start)} – {formatMinutesToTime(m.end)}
                        </td>
                        <td className="rs-td">Ring {m.ring}</td>
                        <td className="rs-td">{m.phase}</td>
                        <td className="rs-td">{m.roundName}</td>
                        <td className="rs-td">
                            Robot {m.a} vs Robot {m.b}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

const GroupsMeta = ({ groups }) => {
    if (!groups || !groups.length) return null;
    return (
        <div className="rs-groups-meta">
            <b>Skupiny (sloty pro play-off):</b>{" "}
            {groups.map((g, idx) => {
                const label = String.fromCharCode(65 + idx);
                const first = g[0] ? `1. místo: Robot ${g[0]}` : "—";
                const second = g[1] ? `2. místo: Robot ${g[1]}` : "—";
                return (
                    <div key={idx} className="rs-groups-line">
                        Skupina {label}: {first}, {second}
                    </div>
                );
            })}
            <div className="rs-groups-note">
                Play-off pavouk se vytvoří z těchto 1. a 2. míst starým
                algoritmem (např. v jiné části aplikace).
            </div>
        </div>
    );
};

const GroupMatrix = ({ group, label, matches }) => {
    // players are numeric IDs in `group` array
    const players = group.slice();

    // build a lookup of match by pair (a,b) normalized
    const matchMap = {};
    (matches || []).forEach((m) => {
        const a = m.a;
        const b = m.b;
        if (a == null || b == null) return;
        const key = `${Math.min(a, b)}_${Math.max(a, b)}`;
        matchMap[key] = m;
    });

    const cellStyle = {
        border: '1px solid rgba(0,0,0,0.06)',
        padding: '6px 8px',
        textAlign: 'center',
        fontSize: 12,
        background: '#fff'
    };

    const diagStyle = {
        ...cellStyle,
        background: '#0b0b0b',
        color: '#fff',
        fontWeight: 700
    };

    const tableRef = useRef(null);

    const handlePrintGroup = async () => {
        const el = tableRef.current;
        if (!el) return alert('Element pre tlač nenájdený');
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2, logging: false });
            const imgData = canvas.toDataURL('image/png');
            const printWindow = window.open('', '', 'width=1000,height=800');
            printWindow.document.write(`
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Skupina ${label}</title>
                    <style>body{margin:0;padding:20px;background:white}img{max-width:100%;height:auto}</style>
                </head>
                <body>
                    <img src="${imgData}" />
                </body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 400);
        } catch (err) {
            console.error('Print group error', err);
            alert('Chyba pri príprave tlače skupiny');
        }
    };

    return (
        <div style={{ marginBottom: 16, background: '#fff', padding: 8, borderRadius: 6 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Skupina {label}</div>
            <div style={{ overflowX: 'auto' }}>
                <table ref={tableRef} style={{ borderCollapse: 'collapse', width: '100%', minWidth: 420 }}>
                    <thead>
                        <tr>
                            <th style={{ ...cellStyle, textAlign: 'left' }}>Žáci</th>
                            {players.map((p) => (
                                <th key={`h-${p}`} style={cellStyle}>Robot {p}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {players.map((rowPlayer, rIdx) => (
                            <tr key={`r-${rowPlayer}`}>
                                <td style={{ ...cellStyle, textAlign: 'left', fontWeight: 600 }}>Robot {rowPlayer}</td>
                                {players.map((colPlayer, cIdx) => {
                                    if (rowPlayer === colPlayer) {
                                        return <td key={`cell-${rowPlayer}-${colPlayer}`} style={diagStyle}> </td>;
                                    }
                                    const key = `${Math.min(rowPlayer, colPlayer)}_${Math.max(rowPlayer, colPlayer)}`;
                                    const m = matchMap[key];
                                    const score = m ? (m.score || '0:0') : '0:0';
                                    const timeStr = m && m.start != null ? formatMinutesToTime(m.start) : null;
                                    const ringStr = m && m.ring ? `R${m.ring}` : null;
                                    return (
                                        <td key={`cell-${rowPlayer}-${colPlayer}`} style={cellStyle}>
                                            <div style={{ fontWeight: 600 }}>{score}</div>
                                            {(timeStr || ringStr) && (
                                                <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                                                    {timeStr ? `${timeStr}` : ''}{timeStr && ringStr ? ' • ' : ''}{ringStr ? ringStr : ''}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div style={{ marginTop: 8, textAlign: 'right' }}>
                <button className="rs-button" onClick={handlePrintGroup}>{t("printGroup")}</button>
            </div>
        </div>
    );
};

/* ===== React App ===== */

function Generate() {
    const [rings, setRings] = useState(4);
    const [maxRings, setMaxRings] = useState(1);
    const [competitors, setCompetitors] = useState(32);
    const [matchMinutes, setMatchMinutes] = useState(4);
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("11:00");
    const [globalInfo, setGlobalInfo] = useState(null);
    const [plans, setPlans] = useState(null);
    const [groupsMeta, setGroupsMeta] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState("fast");

    useEffect(() => {
        handleCheckBackend();
    }, []);

    const handleGenerate = () => {
        const R = Number(rings);
        const S = Number(competitors);
        const M = Number(matchMinutes);

        if (!startTime || !endTime) {
            alert("Zadejte prosím čas začátku i konce.");
            return;
        }

        const cap = computeCapacity(R, startTime, endTime, M);

        if (cap.totalMinutes <= 0) {
            setGlobalInfo({
                error: "Čas konce musí být po čase začátku.",
                totalMinutes: cap.totalMinutes,
                capacityMatches: cap.capacityMatches,
            });
            setPlans(null);
            setGroupsMeta(null);
            return;
        }

        setGlobalInfo({
            totalMinutes: cap.totalMinutes,
            capacityMatches: cap.capacityMatches,
            error: null,
        });

        // 1) pavouk
        const spider = generateSpiderMatchesAndRounds(S, R);
        const spiderScheduled = assignSchedule(spider.matches, cap.start, M, R);

        const planSpider = buildPlan(
            cap,
            "SPIDER",
            spiderScheduled,
            spider.matches.length,
            {
                bracketRounds: spider.rounds.map((round) => ({
                    ...round,
                    seeds: round.seeds.map((seed) => {
                        // Find match by seedId for reliable matching
                        const match = spiderScheduled.find((m) => m.seedId === seed.id);
                        if (!match) return seed;
                        return {
                            ...seed,
                            time: `${formatMinutesToTime(
                                match.start
                            )} – ${formatMinutesToTime(match.end)}`,
                            ring: match.ring,
                        };
                    }),
                })),
            }
        );

        // 2) skupiny (len group fáza) - vybereme inteligentne pomocou heuristiky
        let planGroups = null;
        let groupsInfo = null;

        const best = findBestGroupSize(S, R, cap, 4, 6);
        if (best && best.gSize) {
            const { gSize } = best;
            let { matches: groupMatches, groups } = generateGroupsOnly(
                S,
                R,
                gSize
            );

            // enforce number of groups to be a power of 2 (2^n) for tidy play-off brackets
            const enforced = enforcePerfectSquareGroups(groups, S);
            if (enforced.length !== groups.length) {
                groups = enforced;
                // regenerate matches for the new grouping
                groupMatches = regenerateMatchesFromGroups(groups, R);
            }

            // provisional play-off bracket seeded 1st vs 2nd from different groups
            const playoff = buildGroupPlayoff(groups, R);

            const totalMatchesCount = groupMatches.length + playoff.matches.length;
            // capacity validation (groups + provisional playoffs)
            const validation = validateRingCapacity(totalMatchesCount, R, M, cap.totalMinutes);
            if (!validation.valid) {
                setGlobalInfo((prev) => ({
                    ...(prev || {}),
                    error: validation.suggestion,
                }));
                // fallback to spider if groups won't fit
                planGroups = planSpider;
                groupsInfo = null;
            } else {
                // schedule groups first
                const groupScheduled = assignSchedule(groupMatches, cap.start, M, R);
                let currentStart = groupScheduled.length
                    ? Math.max(...groupScheduled.map((m) => m.end))
                    : cap.start;

                // schedule play-off rounds sequentially after groups
                const playoffScheduled = [];
                playoff.rounds.forEach((round, idx) => {
                    const roundMatches = playoff.matches.filter((m) => m.roundName === round.title);
                    if (!roundMatches.length) return;
                    const scheduledRound = assignSchedule(roundMatches, currentStart, M, R);
                    playoffScheduled.push(...scheduledRound);
                    currentStart = Math.max(
                        currentStart,
                        ...scheduledRound.map((m) => m.end)
                    );
                });

                const combined = [...groupScheduled, ...playoffScheduled];

                planGroups = buildPlan(
                    cap,
                    "GROUP",
                    combined,
                    totalMatchesCount,
                    {
                        groupSize: gSize,
                        playoffRounds: playoff.rounds,
                    }
                );
                groupsInfo = groups;
            }
        } else {
            // no suitable groupSize found within capacity; fallback to spider
            planGroups = planSpider;
            groupsInfo = null;
        }

        setPlans({ fast: planSpider, group: planGroups });
        setGroupsMeta(groupsInfo);
        setSelectedVariant("fast");
    };

    const handleSaveSchedule = (variant) => {
        console.log('ulozit rozpis', variant);
    };

    const handlePrint = async () => {
        const bracketElement = document.querySelector('.rs-bracket-wrapper > div');
        if (!bracketElement) {
            alert('Bracket not found');
            return;
        }

        try {
            // Import html2canvas dynamically
            const html2canvas = (await import('html2canvas')).default;

            // Temporarily expand container to full width for capture
            const wrapper = document.querySelector('.rs-bracket-wrapper');
            const originalOverflow = wrapper.style.overflow;
            const originalMaxWidth = wrapper.style.maxWidth;
            wrapper.style.overflow = 'visible';
            wrapper.style.maxWidth = 'none';

            // Capture the bracket as an image with full scrollable width
            const canvas = await html2canvas(bracketElement, {
                backgroundColor: '#ffffff',
                scale: 1,
                logging: false,
                scrollX: -window.scrollX,
                scrollY: -window.scrollY,
                windowWidth: document.documentElement.scrollWidth,
                windowHeight: document.documentElement.scrollHeight,
                width: bracketElement.scrollWidth,
                height: bracketElement.scrollHeight,
                useCORS: true,
            });

            // Restore original styles
            wrapper.style.overflow = originalOverflow;
            wrapper.style.maxWidth = originalMaxWidth;

            // Create new window with image
            const printWindow = window.open('', '', 'width=1200,height=900');
            const imgData = canvas.toDataURL('image/png');

            printWindow.document.write(`
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Schedule Print</title>
                    <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        html, body {
                            width: 100%;
                            height: 100%;
                            overflow: hidden;
                        }
                        body { 
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: white;
                        }
                        img { 
                            max-width: 100%;
                            max-height: 100vh;
                            width: auto;
                            height: auto;
                            object-fit: contain;
                        }
                        @media print {
                            @page {
                                size: A4 landscape;
                                margin: 5mm;
                            }
                            html, body {
                                width: 100%;
                                height: 100%;
                            }
                            img {
                                max-width: 100%;
                                max-height: 100%;
                                width: auto;
                                height: auto;
                                object-fit: contain;
                                page-break-inside: avoid;
                            }
                        }
                    </style>
                </head>
                <body>
                    <img src="${imgData}" />
                </body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 500);
        } catch (error) {
            console.error('Error printing bracket:', error);
            alert('Error capturing bracket for print');
        }
    };

    const handleCheckBackend = async () => {
        try {
            // Now we only fetch all disciplines and find "Robosumo" ID
            console.log('Fetching all disciplines to find "Robosumo"...');
            const res = await fetch('http://localhost:8080/api/discipline/all');
            const status = res.status;
            const text = await res.text();
            console.log('Raw response status:', status);
            console.log('Raw response text:', text);
            let json;
            try {
                json = JSON.parse(text);
            } catch (e) {
                console.warn('Response is not valid JSON:', e);
                return;
            }
            const data = json.data || json;
            console.log('Disciplines response (parsed):', data);

            if (!Array.isArray(data)) {
                console.error('Unexpected disciplines payload');
                return;
            }

            const found = data.find((d) => (d.name || d.Name || d.nazev) === 'Robosumo');
            if (found) {
                const disciplineId = found.id ?? found.ID ?? found.iD ?? found.Id ?? null;
                console.log('Found Robosumo discipline object:', found);
                console.log('Robosumo discipline id (best-effort):', disciplineId);

                // Fetch playgrounds for this discipline and compute ring counts
                if (disciplineId) {
                    try {
                        const pgRes = await fetch(`http://localhost:8080/api/playground/get?id=${disciplineId}`);
                        const pgText = await pgRes.text();
                        console.log('Playgrounds raw status:', pgRes.status);
                        console.log('Playgrounds raw text:', pgText);
                        let pgJson;
                        try {
                            pgJson = JSON.parse(pgText);
                        } catch (e) {
                            console.warn('Playgrounds response is not valid JSON', e);
                            return;
                        }
                        const playgrounds = pgJson.data || pgJson;
                        if (Array.isArray(playgrounds)) {
                            const uniqueNumbers = [...new Set(playgrounds.map((p) => p.number))];
                            const ringCount = playgrounds.length;
                            console.log('Playgrounds array:', playgrounds);
                            console.log('Rings count (playgrounds length):', ringCount);
                            console.log('Unique ring numbers count:', uniqueNumbers.length, uniqueNumbers);
                            setMaxRings(ringCount);
                            setRings(ringCount);
                        } else {
                            console.log('Unexpected playgrounds payload:', playgrounds);
                        }
                    } catch (e) {
                        console.error('Error fetching playgrounds for discipline:', e);
                    }
                }
            } else {
                console.log('Robosumo not found in disciplines list. Available names:', data.map((d) => d.name || d.Name));
            }

            // Other checks (playgrounds / robots / allForYear) commented out for now
            /*
            // 1) Rings for discipline
            fetch(`/api/playground/get?id=${disciplineId}`)
                .then((r) => r.json())
                .then((resp) => {
                    const p = resp.data || resp;
                    console.log('Rings array:', p);
                })
                .catch((e) => console.error('Error fetching playgrounds:', e));

            // 2) Robots / players in discipline (order) via competitionEvaluation
            fetch(`/module/competitionEvaluation/getOrder?year=${year}&category=${encodeURIComponent(category)}&id=${disciplineId}`)
                .then((r) => r.json())
                .then((resp) => {
                    const list = resp.data || resp;
                    console.log(`Robots in discipline ${disciplineId} (${category}, ${year}):`, list);
                })
                .catch((e) => console.error('Error fetching discipline robots/order:', e));

            // 3) Registered robots count for year
            fetch(`/api/robot/allForYear?year=${year}`)
                .then((r) => r.json())
                .then((resp) => {
                    const arr = resp.data || resp;
                    console.log('Registered robots (allForYear):', arr);
                })
                .catch((e) => console.error('Error fetching robots for year:', e));
            */
        } catch (ex) {
            console.error('handleCheckBackend error', ex);
        }
    };

    const currentPlan =
        plans && (selectedVariant === "fast" ? plans.fast : plans.group);

    const fastRounds =
        plans && plans.fast && plans.fast.bracketRounds
            ? plans.fast.bracketRounds
            : [];

    return (
        <div id="rs-root">

            <div className="rs-layout">
                <div className="rs-card rs-card-left">
                    <h2 className="rs-card-title">Vstupní parametry</h2>

                    <label className="rs-label">
                        Počet ringů: <span style={{ fontWeight: 'bold', marginLeft: 8 }}>{rings}</span>
                        <input
                            type="range"
                            min={1}
                            max={maxRings}
                            value={rings}
                            onChange={(e) => setRings(e.target.value)}
                            className="rs-input"
                            style={{ 
                                width: '100%', 
                                cursor: 'pointer',
                                accentColor: '#ef6000'
                            }}
                        />
                    </label>

                    <label className="rs-label">
                        Počet soutěžících:
                        <input
                            type="number"
                            min={2}
                            value={competitors}
                            onChange={(e) => setCompetitors(e.target.value)}
                            className="rs-input"
                        />
                    </label>

                    <label className="rs-label">
                        Průměrná délka zápasu (minuty):
                        <input
                            type="number"
                            min={1}
                            value={matchMinutes}
                            onChange={(e) => setMatchMinutes(e.target.value)}
                            className="rs-input"
                        />
                    </label>

                    <label className="rs-label">
                        Začátek turnaje:
                        <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="rs-input"
                        />
                    </label>

                    <label className="rs-label">
                        Konec turnaje:
                        <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="rs-input"
                        />
                    </label>

                    <button className="rs-button" onClick={handleGenerate}>
                        Vygenerovat varianty
                    </button>

                    <GlobalStats info={globalInfo} />
                </div>

                <div className="rs-card rs-card-right">
                    <h2 className="rs-card-title">Varianty rozpisu</h2>

                    <div className="rs-tabs">
                        <button
                            className={
                                selectedVariant === "fast"
                                    ? "rs-tab rs-tab-active"
                                    : "rs-tab"
                            }
                            onClick={() => setSelectedVariant("fast")}
                        >
                            Nejrychlejší <span className="rs-tab-note">(pavouk)</span>
                        </button>
                        <button
                            className={
                                selectedVariant === "group"
                                    ? "rs-tab rs-tab-active"
                                    : "rs-tab"
                            }
                            onClick={() => setSelectedVariant("group")}
                        >
                            Co nejblíže limitu{" "}
                            <span className="rs-tab-note">
                                (skupinová fáze, bez play-off)
                            </span>
                        </button>
                    </div>

                    {!plans ? (
                        <p>
                            Zadejte vstupní údaje a klikněte na{" "}
                            <b>„Vygenerovat varianty“</b>.
                        </p>
                    ) : (
                        <>
                            <VariantStats plan={currentPlan} />
                            {selectedVariant === "group" && (
                                <GroupsMeta groups={groupsMeta} />
                            )}
                            <PlanTable plan={currentPlan} />

                            {selectedVariant === "group" && currentPlan && currentPlan.matches && groupsMeta && groupsMeta.length > 0 && (
                                <>
                                    <div style={{ marginTop: 12 }}>
                                        <h3 className="rs-bracket-title">Skupiny - rozpis (matica)</h3>
                                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {groupsMeta.map((group, idx) => {
                                                const label = String.fromCharCode(65 + idx);
                                                return (
                                                    <GroupMatrix key={`gm-${idx}`} group={group} label={label} matches={currentPlan.matches} />
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {currentPlan.playoffRounds && currentPlan.playoffRounds.length > 0 && (
                                        <div style={{ marginTop: 24 }} className="rs-bracket-wrapper">
                                            <h3 className="rs-bracket-title">Provizorní Play-off pavouk</h3>
                                            <Bracket
                                                rounds={currentPlan.playoffRounds.map((round) => ({
                                                    ...round,
                                                    seeds: round.seeds.map((seed) => {
                                                        const match = currentPlan.matches.find(
                                                            (m) =>
                                                                m.roundName === round.title &&
                                                                m.aLabel === seed.teams[0].name &&
                                                                m.bLabel === seed.teams[1].name
                                                        );
                                                        if (!match || match.start == null) return seed;
                                                        return {
                                                            ...seed,
                                                            time: `${formatMinutesToTime(
                                                                match.start
                                                            )} – ${formatMinutesToTime(match.end)}`,
                                                            ring: match.ring,
                                                        };
                                                    }),
                                                }))}
                                                renderSeedComponent={FastSeed}
                                                mobileBreakpoint={0}
                                            />
                                        </div>
                                    )}

                                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                                        <button
                                            className="rs-button"
                                            onClick={() => handleSaveSchedule('group')}
                                        >
                                            {t("saveSchedule")}
                                        </button>
                                        
                                        {currentPlan.playoffRounds && currentPlan.playoffRounds.length > 0 && (
                                            <button
                                                className="rs-button"
                                                onClick={handlePrint}
                                                title="Print playoff bracket to PDF or paper"
                                            >
                                                {t("printBracket")}
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}

                            {selectedVariant === "fast" && fastRounds.length > 0 && (
                                <>
                                    <div className="rs-bracket-wrapper">
                                        <h3 className="rs-bracket-title">
                                            Play-off pavouk (podle rozpisu)
                                        </h3>
                                        <Bracket
                                            rounds={fastRounds}
                                            renderSeedComponent={FastSeed}
                                            mobileBreakpoint={0}
                                        />
                                    </div>

                                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                                        <button
                                            className="rs-button"
                                            onClick={() => handleSaveSchedule('fast')}
                                        >
                                            {t("saveSchedule")}
                                        </button>

                                        <button
                                            className="rs-button"
                                            onClick={handlePrint}
                                            title="Print bracket to PDF or paper"
                                        >
                                            {t("printBracket")}
                                        </button>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Generate;