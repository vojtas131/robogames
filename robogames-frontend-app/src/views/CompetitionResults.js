import React, { useState, useEffect } from 'react';
import {
    Card, CardHeader, CardBody, CardTitle,
    Dropdown, DropdownToggle, DropdownMenu, DropdownItem,
    Row, Col, Table, Modal, ModalHeader, ModalBody, Button, Form, FormGroup, Label, Input, FormFeedback
} from 'reactstrap';

import { useUser } from "contexts/UserContext";
import { useToast } from "contexts/ToastContext";
import { t } from "translations/translate";
import { BlobProvider, pdf } from '@react-pdf/renderer';
import { PdfDocument } from 'components/Diploma/PdfDocument';
import { DiplomaButton } from 'components/Diploma/DiplomaButton';

function CompetitionResults() {
    const [years, setYears] = useState([]);
    const [disciplines, setDisciplines] = useState([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedDiscipline, setSelectedDiscipline] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [results, setResults] = useState([]);
    const [users, setUsers] = useState([]);
    const [dropdownOpenYear, setDropdownOpenYear] = useState(false);
    const [dropdownOpenDiscipline, setDropdownOpenDiscipline] = useState(false);
    const [dropdownOpenCategory, setDropdownOpenCategory] = useState(false);
    const toast = useToast();
    const { tokenExpired, token } = useUser();

    const [userEditName, setUserEditName] = useState(false);
    const [currentUsers, setCurrentUsers] = useState([]);

    useEffect(() => {
        fetchCompetitionYears();
        fetchDisciplines();
        fetchUsers();
    }, []);

    useEffect(() => {
        if (selectedYear && selectedDiscipline && selectedCategory) {
            fetchResults(selectedYear, selectedDiscipline, selectedCategory);
        }
    }, [selectedYear, selectedDiscipline, selectedCategory]);

    const fetchUsers = async () => {
        // Get all users
        const userUrl = `${process.env.REACT_APP_API_URL}api/user/all`;
        const userResponse = await fetch(userUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const userData = await userResponse.json();
        setUsers(userData.data);
    };

    const fetchCompetitionYears = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}api/competition/all`);
            if (tokenExpired(response.status)) { return; }

            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                setYears(data.data.filter(item => item.started).map(item => item.year));
            }
        } catch (error) {
            console.error('Failed to fetch competition years:', error);
        }
    };

        const rolesString = localStorage.getItem('roles');
    const rolesArray = rolesString ? rolesString.split(', ') : [];
    const isAdminOrLeader = rolesArray.some(role => ['ADMIN', 'LEADER'].includes(role));
  
    const isAdminOrLeaderOrAssistantOrReferee = rolesArray.some(role => ['ADMIN', 'LEADER', 'ASSISTANT', 'REFEREE'].includes(role));

    const handleUserEditSubmit = async (e) => {
        e.preventDefault();
    }

    const openEditModal = (userIds) => {
        setCurrentUsers(userIds);
        setUserEditName(true);
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

    const fetchResults = async (year, disciplineName, category) => {
        try {
            let categoryAPI;

            if (category === t("highAge")) {
                categoryAPI = 'HIGH_AGE_CATEGORY';
            } else if (category === t("lowAge")) {
                categoryAPI = 'LOW_AGE_CATEGORY';
            }

            if (!categoryAPI) {
                toast.warning(t("catInvalid"));
                return;
            }

            const url = `${process.env.REACT_APP_API_URL}module/competitionEvaluation/scoreOfAll?year=${year}&category=${encodeURIComponent(categoryAPI)}`;
            const response = await fetch(url);
            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                // get the discipline ID from the selected discipline name
                const discipline = disciplines.find(d => d.name === disciplineName);
                if (!discipline) {
                    toast.error(t("catNotFound"));
                    return;
                }
                // filter results to include only those that match the discipline ID
                const filteredResults = await Promise.all(data.data.filter(result => result.disciplindeID === discipline.id).map(async result => {
                    return {
                        ...result,
                        userIds: users?.filter(user => user.teamID === result.teamID).map(user => user.id),
                        userNames: users?.filter(user => user.teamID === result.teamID).map(user => user.name + ' ' + user.surname)?.join(', ')
                    };
                }));
                setResults(filteredResults);
            } else {
                console.error('Failed to fetch results:', data);
                toast.error(t("resFetchFail",{data: data.data || t("unknownError")}));
            }
        } catch (error) {
            console.error('Error fetching results:', error);
            toast.error(t("resFetchError",{message: error.message || t("communicationFail")}));
        }
    };


    const toggleDropdownYear = () => setDropdownOpenYear(!dropdownOpenYear);
    const toggleDropdownDiscipline = () => setDropdownOpenDiscipline(!dropdownOpenDiscipline);
    const toggleDropdownCategory = () => setDropdownOpenCategory(!dropdownOpenCategory);

    return (
        <div className="content">
            <Row>
                <Col xs="12">
                    <Card>
                        <CardHeader>
                            <CardTitle tag="h4">{t("compResults")}</CardTitle>
                            <div style={{ display: 'flex', alignItems: 'center' }}
                                className="d-flex flex-column flex-md-row align-items-start">
                                <Dropdown isOpen={dropdownOpenYear} toggle={toggleDropdownYear} style={{ marginRight: '10px' }}>
                                    <DropdownToggle caret>
                                        {selectedYear || t("selectYear")}
                                    </DropdownToggle>
                                    <DropdownMenu>
                                        {years.map(year => (
                                            <DropdownItem key={year} onClick={() => setSelectedYear(year)}>
                                                {year}
                                            </DropdownItem>
                                        ))}
                                    </DropdownMenu>
                                </Dropdown>
                                <Dropdown isOpen={dropdownOpenDiscipline} toggle={toggleDropdownDiscipline} style={{ marginRight: '10px' }}>
                                    <DropdownToggle caret>
                                        {selectedDiscipline || t("selectDisc")}
                                    </DropdownToggle>
                                    <DropdownMenu>
                                        {disciplines.map(discipline => (
                                            <DropdownItem key={discipline.id} onClick={() => setSelectedDiscipline(discipline.name)}>
                                                {discipline.name}
                                            </DropdownItem>
                                        ))}
                                    </DropdownMenu>
                                </Dropdown>
                                <Dropdown isOpen={dropdownOpenCategory} toggle={toggleDropdownCategory} style={{ marginRight: '10px' }}>
                                    <DropdownToggle caret>
                                        {selectedCategory || t("selectCat")}
                                    </DropdownToggle>
                                    <DropdownMenu>
                                        <DropdownItem onClick={() => setSelectedCategory(t("highAge"))}>{t("highAge")}</DropdownItem>
                                        <DropdownItem onClick={() => setSelectedCategory(t("lowAge"))}>{t("lowAge")}</DropdownItem>
                                    </DropdownMenu>
                                </Dropdown>
                                {results.length > 0 && isAdminOrLeaderOrAssistantOrReferee && (
                                    <DiplomaButton style={{ marginLeft: 'auto' }} data={results.map(result => ({ robot: result, place: results.indexOf(result) + 1 }))}>{t('generateDiplomas')}</DiplomaButton>
                                )}
                            </div>
                        </CardHeader>


                        <CardBody>
                            {results.length > 0 ? (
                                <Table responsive>
                                    <thead>
                                        <tr>
                                            <th>{t("place")}</th>
                                            <th>{t("robot")}</th>
                                            <th>{t("team")}</th>
                                            <th>{t("names")}</th>
                                            <th>{t("score")}</th>
                                            <th>{t("discipline")}</th>

                                            {isAdminOrLeaderOrAssistantOrReferee && (
                                            <th>{t("diploma")}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((result, index) => (

                                            <tr key={result.robotID}>
                                                <td>{index + 1}</td>
                                                <td>{result.robotName}</td>
                                                <td>{result.teamName}</td>
                                                {
                                                    // Mutate result object when saving changes from the modal
                                                }
                                                <td>{result.userNames} {isAdminOrLeader && (<i onClick={() => openEditModal(result.userIds)} role="button" className="tim-icons icon-caps-small" />)}</td>
                                                <td>{result.score}</td>
                                                <td>{result.disciplindeName}</td>

                                                {isAdminOrLeaderOrAssistantOrReferee && (
                                                <td>
                                                    <DiplomaButton data={[{robot: result, place: index + 1}]}>{t("diploma_caps")}</DiplomaButton>
                                                </td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            ) : (
                                <div>{t("noRobotsFound")}</div>
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>
            {
            /* Figure out how to have multiple names in one form?
            <Modal isOpen={userEditName} toggle={() => setUserEditName(false)}>
                <ModalHeader toggle={() => setUserEditName(false)}>{t("userEdit")}</ModalHeader>
                <ModalBody>
                    <Form onSubmit={handleUserEditSubmit}>
                        <FormGroup>
                            <Label>{t("name")}</Label>
                            <Input
                                name="name"
                                type="text"
                                value={currentUser?.name || ""}
                                onChange={handleChange}
                                invalid={!!errors.name}
                            />
                            {errors.name && <FormFeedback>{errors.name}</FormFeedback>}
                        </FormGroup>
                        <FormGroup>
                            <Label>{t("surname")}</Label>
                            <Input
                                name="surname"
                                type="text"
                                value={currentUser?.surname || ""}
                                onChange={handleChange}
                                invalid={!!errors.surname}
                            />
                            {errors.surname && <FormFeedback>{errors.surname}</FormFeedback>}
                        </FormGroup>

                        <Button color="primary" type="submit">{t("save")}</Button>
                        <Button color="secondary" onClick={() => setUserEditName(false)} style={{ margin: '10px' }}>{t("cancel")}</Button>
                    </Form>
                </ModalBody>
            </Modal>
            */
            }
        </div>
    );
}

export default CompetitionResults;