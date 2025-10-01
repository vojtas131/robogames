/**
* The `MatchCreationPage` component is responsible for managing the creation and display of matches for a specific playground.
* It fetches the playground details, robots, and matches, and provides functionality to create new matches, remove matches, and submit scores.
*/
import React, { useState, useEffect } from 'react';
import {
    Button, Modal, ModalHeader, ModalBody, ModalFooter, FormGroup, Label, Input, Card, CardHeader, CardBody, Row, Col, CardTitle, CardText, Alert, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, CardFooter, Table
} from 'reactstrap';
import { useSearchParams } from 'react-router-dom';
import { useUser } from "contexts/UserContext";
import { t } from "translations/translate";

function MatchCreationPage() {
    const [searchParams] = useSearchParams();
    const playgroundId = searchParams.get('id');
    const year = searchParams.get('year');
    const [isSum, setIsSum] = useState(false);
    const [robots, setRobots] = useState([]);
    const [selectedRobots, setSelectedRobots] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [playground, setPlayground] = useState({});
    const [matches, setMatches] = useState([]);
    const [selectedMatchId, setSelectedMatchId] = useState(null);
    const [score, setScore] = useState('');
    const [scoreModal, setScoreModal] = useState(false);

    const { token, tokenExpired } = useUser();

    useEffect(() => {
        fetchMatchesForPlayground(playgroundId);
    }, [playgroundId]);

    useEffect(() => {
        fetchPlaygroundDetails();
        fetchRobots();
    }, [year, playgroundId]);

    const fetchPlaygroundDetails = async () => {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/playground/all`);
        if (tokenExpired(response.status)) { return; }

        const data = await response.json();
        if (response.ok && data.type === 'RESPONSE') {
            const foundPlayground = data.data.find(p => p.id.toString() === playgroundId);
            if (foundPlayground) {
                setPlayground(foundPlayground);
                checkIfSumDiscipline(foundPlayground.disciplineID);
            }
        }
    };

    const checkIfSumDiscipline = async (disciplineId) => {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/discipline/all`);
        if (tokenExpired(response.status)) { return; }

        const data = await response.json();
        if (response.ok && data.type === 'RESPONSE') {
            const discipline = data.data.find(d => d.id === disciplineId);
            const scoreValue = discipline?.scoreAggregation?.name || discipline?.scoreAggregation || '';
            setIsSum(scoreValue === 'SUM');
        }
    };

    const handleScoreSubmit = async () => {
        const scoreValue = parseFloat(score);
        const apiUrl = `${process.env.REACT_APP_API_URL}api/match/writeScore?id=${selectedMatchId}&score=${scoreValue}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            if (tokenExpired(response.status)) { return; }

            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                alert(t("scoreRecorded"));
                setScoreModal(false); // Close the modal

                window.location.reload();
            } else {
                throw new Error( data.data || t("unknownError"));
            }
        } catch (error) {
            alert(t("scoreSubmitError",{message: error.message || t("serverCommFail")}));
        }
    };


    const fetchRobots = async () => {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/robot/allConfirmed?year=${year}`);
        if (tokenExpired(response.status)) { return; }

        const data = await response.json();
        if (response.ok && data.type === 'RESPONSE') {
            setRobots(data.data);
        }
    };

    const toggleModal = () => setShowModal(!showModal);


    const handleRemoveAllGroupMatches = async (groupId) => {
        const apiUrl = `${process.env.REACT_APP_API_URL}api/match/removeAll?groupID=${groupId}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (tokenExpired(response.status)) { return; }

            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                alert(t("matchesRemoved"));

            } else {
                throw new Error(data.data || t("matchesRemoveFail"));
            }
        } catch (error) {
            alert(t("matchesRemoveError",{message: error.message || t("serverCommFail")}));
        }
    };

    const handleRemoveMatch = async (matchId) => {
        if (window.confirm(t("matchRemoveCheck"))) {
            const apiUrl = `${process.env.REACT_APP_API_URL}api/match/remove?id=${matchId}`;

            try {
                const response = await fetch(apiUrl, {
                    method: 'DELETE', 
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (tokenExpired(response.status)) { return; }

                const data = await response.json();
                if (response.ok && data.type === 'RESPONSE') {
                    alert(t("matchRemoved"));
                    window.location.reload();

                } else {
                    throw new Error(data.data || t("matchRemoveFail"));
                }
            } catch (error) {
                alert(t("matchRemoveError",{message: error.message || t("serverCommFail")}));
            }
        }
    };


    const fetchMatchesForPlayground = async (playgroundId) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}api/playground/getMatches?id=${playgroundId}`);
            if (tokenExpired(response.status)) { return; }
            
            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                setMatches(data.data);
            } else {
                console.error('Failed to fetch matches:', data);
                alert(t("matchFetchFail",{message: data.data || t("unknownError")}));
            }
        } catch (error) {
            console.error('Error fetching matches:', error);
            alert(t("matchFetchError",{message: error.message || t("serverCommFail")}));
        }
    };

    const handleMatchCreation = async () => {
        const apiUrl = isSum ? `${process.env.REACT_APP_API_URL}module/orderManagement/generateMatches` : `${process.env.REACT_APP_API_URL}api/match/create`;
        const method = isSum ? 'POST' : 'POST';
        const body = isSum ? { playgroundID: playgroundId, robots: selectedRobots, year } : { robotID: selectedRobots[0], playgroundID: playgroundId, groupID: -1 };

        try {
            const response = await fetch(apiUrl, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            if (tokenExpired(response.status)) { return; }

            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                alert(t("matchesCreated"));
                window.location.reload();
            } else {
                alert(t("dataError",{data: data.data}));
            }
        } catch (error) {
            alert(t("matchesCreateError",{message: error.message}));
        }
        toggleModal();
    };

    const filteredRobots = robots.filter(robot => robot.disciplineID === playground.disciplineID);


    const groupedMatches = matches.reduce((acc, match) => {
        acc[match.groupID] = acc[match.groupID] || [];
        acc[match.groupID].push(match);
        return acc;
    }, {});
    return (
        <div className="content">
            <Card>
                <CardHeader>
                    <Button style={{ marginBottom: '15px' }} color="primary" onClick={toggleModal}>
                        {isSum ? t("genMatches") : t("newTry")}
                    </Button>
                </CardHeader>
                <Modal isOpen={showModal} toggle={toggleModal}>
                    <ModalHeader toggle={toggleModal}>{isSum ? t("genMatches") : t("newTry")}</ModalHeader>
                    <ModalBody>
                        <h4 style={{ color: 'black' }}>{t("students")}</h4>

                        {filteredRobots.filter(robot => robot.category === 'HIGH_AGE_CATEGORY').map(robot => (
                            <FormGroup check key={robot.id}>
                                <Label check>
                                    <Input
                                        type="checkbox"
                                        value={robot.id}
                                        onChange={(e) => {
                                            const newSelection = parseInt(e.target.value);
                                            if (selectedRobots.includes(newSelection)) {
                                                setSelectedRobots(selectedRobots.filter(id => id !== newSelection));
                                            } else {
                                                setSelectedRobots([...selectedRobots, newSelection]);
                                            }
                                        }}
                                        checked={selectedRobots.includes(robot.id)}
                                    />
                                    <span className="form-check-sign">
                                        <span className="check" />
                                    </span>
                                    {robot.name} - {robot.teamName}
                                </Label>
                            </FormGroup>
                        ))}
                        <hr></hr>

                        <h4 style={{ color: 'black' }}>{t("pupils")}</h4>

                        {filteredRobots.filter(robot => robot.category === 'LOW_AGE_CATEGORY').map(robot => (
                            <FormGroup check key={robot.id}>
                                <Label check>
                                    <Input
                                        type="checkbox"
                                        value={robot.id}
                                        onChange={(e) => {
                                            const newSelection = parseInt(e.target.value);
                                            if (selectedRobots.includes(newSelection)) {
                                                setSelectedRobots(selectedRobots.filter(id => id !== newSelection));
                                            } else {
                                                setSelectedRobots([...selectedRobots, newSelection]);
                                            }
                                        }}
                                        checked={selectedRobots.includes(robot.id)}
                                    />
                                    <span className="form-check-sign">
                                        <span className="check" />
                                    </span>
                                    {robot.name} - {robot.teamName}
                                </Label>
                            </FormGroup>
                        ))}
                    </ModalBody>

                    <ModalFooter>
                        <Button color="primary" onClick={handleMatchCreation} style={{ margin: '10px' }}>{t("create")}</Button>
                        <Button color="secondary" onClick={toggleModal} style={{ margin: '10px' }}>{t("cancel")}</Button>

                    </ModalFooter>
                </Modal>
            </Card>

            <Row>
                <Col xs="12">
                    {isSum ? (
                        Object.entries(matches.reduce((acc, match) => {
                            acc[match.groupID] = acc[match.groupID] || [];
                            acc[match.groupID].push(match);
                            return acc;
                        }, {})).map(([group, groupMatches], index) => (
                            <Card key={index}>
                                <CardHeader>
                                    <CardTitle tag="h4">{t("matchGroup",{index: index + 1})}
                                    </CardTitle>
                                </CardHeader>
                                
                                <CardBody>
                                    <Table responsive>
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>{t("state")}</th>
                                                <th>{t("score")}</th>
                                                <th>{t("robotName")}</th>
                                                <th>{t("robotNum")}</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {groupMatches.map(match => (

                                                <tr key={match.id}>
                                                    <td >{match.id}</td>

                                                    <td>
                                                        <span style={{ fontWeight: 'bold', color: match.state.name === 'DONE' ? 'green' : (match.state.name === 'WAITING' ? 'gold' : 'black') }}>
                                                            {match.state.name === 'DONE' ? t("matchDone") : (match.state.name === 'WAITING' ? t("matchWaiting") : match.state.name)}
                                                        </span>
                                                    </td>

                                                    <td>{match.score}</td>
                                                    <td>{match.robotName}</td>
                                                    <td>{match.robotNumber}</td>
                                                    <Button color="info" onClick={() => { setSelectedMatchId(match.id); setScoreModal(true); }}>{t("eval")}</Button>
                                                    <Button style={{ margin: '20px' }} color="danger" onClick={() => handleRemoveAllGroupMatches(match.groupID)} className="btn-icon btn-simple p-2">
                                                        <i className="tim-icons icon-trash-simple"></i>
                                                    </Button>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </CardBody>

                                <CardFooter className="d-flex justify-content-end">
                                </CardFooter>
                            </Card>
                        ))
                    ) : (
                        matches.map((match, index) => (
                            <Card key={match.id}>
                                <CardHeader>
                                    <CardTitle tag="h4">{t("matchNum",{index: index + 1})}</CardTitle>
                                </CardHeader>
                                <CardBody>
                                    <Table responsive>
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>{t("state")}</th>
                                                <th>{t("score")}</th>
                                                <th>{t("robotName")}</th>
                                                <th>{t("robotNum")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>{match.id}</td>
                                                <td>
                                                    <span style={{ fontWeight: 'bold', color: match.state.name === 'DONE' ? 'green' : (match.state.name === 'WAITING' ? 'yellow' : 'black') }}>
                                                        {match.state.name === 'DONE' ? t("matchDone") : (match.state.name === 'WAITING' ? t("matchWaiting") : match.state.name)}
                                                    </span>
                                                </td>
                                                <td>{match.score}</td>
                                                <td>{match.robotName}</td>
                                                <td>{match.robotNumber}</td>
                                                <Button color="info" onClick={() => { setSelectedMatchId(match.id); setScoreModal(true); }}>{t("eval")}</Button>
                                            </tr>
                                        </tbody>
                                    </Table>
                                </CardBody>
                                <CardFooter className="d-flex justify-content-end">
                                    <Button color="danger" onClick={() => handleRemoveMatch(match.id)} className="btn-icon btn-simple">
                                        <i className="tim-icons icon-trash-simple"></i>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))
                    )}
                </Col>
            </Row>

            <Modal isOpen={scoreModal} toggle={() => setScoreModal(false)}>
                <ModalHeader toggle={() => setScoreModal(false)}>{t("enterScore")}</ModalHeader>
                <ModalBody>
                    <FormGroup>
                        <Label for="scoreInput">{t("score")}</Label>
                        <Input style={{ color: 'black' }} type="number" id="scoreInput" value={score} onChange={(e) => setScore(e.target.value)} placeholder={t("matchScorePH")}/>
                    </FormGroup>
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={handleScoreSubmit} style={{ margin: '10px' }}>{t("confirm")}</Button>
                    <Button color="secondary" onClick={() => setScoreModal(false)} style={{ margin: '10px' }}>{t("close")}</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}

export default MatchCreationPage;