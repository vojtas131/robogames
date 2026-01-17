import React, { useState, useEffect, useMemo } from 'react';
import {
    Card, CardHeader, CardBody, CardTitle,
    Dropdown, DropdownToggle, DropdownMenu, DropdownItem,
    Row, Col, Table, Modal, ModalHeader, ModalBody, Button, Form, FormGroup, Label, Input, FormFeedback
} from 'reactstrap';

import { useUser } from "contexts/UserContext";
import { useAdmin } from "contexts/AdminContext";
import { useToast } from "contexts/ToastContext";
import { t } from "translations/translate";
import { DiplomaButton } from 'components/Diploma/DiplomaButton';
import TablePagination from "components/TablePagination";

function CompetitionResults() {
    const { selectedYear: navbarSelectedYear } = useAdmin();
    const [years, setYears] = useState([]);
    const [disciplines, setDisciplines] = useState([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedDiscipline, setSelectedDiscipline] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [results, setResults] = useState([]);
    // Can't fetch users before fetching results
    // const [users, setUsers] = useState([]);
    const [dropdownOpenYear, setDropdownOpenYear] = useState(false);
    const [dropdownOpenDiscipline, setDropdownOpenDiscipline] = useState(false);
    const [dropdownOpenCategory, setDropdownOpenCategory] = useState(false);
    const toast = useToast();
    const { tokenExpired, token } = useUser();

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    useEffect(() => {
        fetchCompetitionYears();
        fetchDisciplines();
    }, []);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedYear, selectedDiscipline, selectedCategory, navbarSelectedYear]);

    const fetchUsers = async () => {
        // Get all users
        const userUrl = `${process.env.REACT_APP_API_URL}api/user/all`;
        const userResponse = await fetch(userUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const userData = await userResponse.json();
        return userData.data;
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
    // const isAdminOrLeaderOrAssistant = rolesArray.some(role => ['ADMIN', 'LEADER', 'ASSISTANT'].includes(role));
    const isAdminOrLeaderOrAssistantOrReferee = rolesArray.some(role => ['ADMIN', 'LEADER', 'ASSISTANT', 'REFEREE'].includes(role));

    // Auto-select last available year for non-admin users if no year selected
    useEffect(() => {
        if (!isAdminOrLeader && years.length > 0 && !selectedYear) {
            const maxYear = Math.max(...years);
            setSelectedYear(maxYear);
        }
    }, [years, selectedYear, isAdminOrLeader]);

    useEffect(() => {
        // Auto-select year from admin navbar for admins/leaders
        if (isAdminOrLeader && navbarSelectedYear) {
            setSelectedYear(navbarSelectedYear);
            fetchResults(navbarSelectedYear, selectedDiscipline, selectedCategory);
        } else {
            setSelectedYear(selectedYear);
            fetchResults(selectedYear, selectedDiscipline, selectedCategory);
        }
    }, [selectedYear, selectedDiscipline, selectedCategory, navbarSelectedYear, isAdminOrLeader]);

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
            // Determine year to use: passed year (e.g., selectedYear), otherwise navbar year (for admins), otherwise first available year
            const effectiveYear = year || navbarSelectedYear || (years && years.length ? years[0] : null);
            if (!effectiveYear) {
                toast.warning(t("selectYear"));
                return;
            }

            // Always fetch both categories from backend and filter on front-end
            const categories = ['HIGH_AGE_CATEGORY', 'LOW_AGE_CATEGORY'];

            const requests = categories.map(cat =>
                fetch(`${process.env.REACT_APP_API_URL}module/competitionEvaluation/scoreOfAll?year=${effectiveYear}&category=${encodeURIComponent(cat)}`)
                    .then(r => r.json().then(data => ({ ok: r.ok, data, status: r.status })))
            );

            const responses = await Promise.all(requests);
            const okResponse = responses.find(r => r.ok && r.data.type === 'RESPONSE');
            if (!okResponse) {
                toast.error(t("resFetchFail", { data: t("unknownError") }));
                return;
            }

            // Merge all results
            const allResults = responses.reduce((acc, r) => acc.concat((r.data && r.data.data) || []), []);

            // Apply front-end filters (category and discipline)
            let filtered = allResults;

            if (disciplineName) {
                const discipline = disciplines.find(d => d.name === disciplineName);
                if (discipline) {
                    filtered = filtered.filter(res => res.disciplindeID === discipline.id);
                } else {
                    // If discipline name not found, no results
                    filtered = [];
                }
            }

            if (category) {
                const categoryAPI = category === t("students") ? 'HIGH_AGE_CATEGORY' : 'LOW_AGE_CATEGORY';
                filtered = filtered.filter(res => res.category === categoryAPI);
            }

            const userData = await fetchUsers();

            const finalResults = filtered.map(result => ({
                ...result,
                userIds: userData?.filter(user => user.teamID === result.teamID).map(user => user.id),
                userNames: userData?.filter(user => user.teamID === result.teamID).map(user => user.name + '\u00A0' + user.surname),
                isChecked: true
            }));

            setResults(finalResults);
        } catch (error) {
            console.error('Error fetching results:', error);
            toast.error(t("resFetchError", { message: error.message || t("communicationFail") }));
        }
    };

    const toggleDropdownYear = () => setDropdownOpenYear(!dropdownOpenYear);
    const toggleDropdownDiscipline = () => setDropdownOpenDiscipline(!dropdownOpenDiscipline);
    const toggleDropdownCategory = () => setDropdownOpenCategory(!dropdownOpenCategory);

    // Prepare grouped structures for rendering
    const getCategoryLabel = (cat) => {
        if (cat === 'HIGH_AGE_CATEGORY') return t("students");
        if (cat === 'LOW_AGE_CATEGORY') return t("pupils");
        return cat;
    };

    const groupedByCategoryAndDiscipline = (() => {
        const map = {};
        (results || []).forEach(r => {
            const cat = r.category || 'UNKNOWN';
            const disc = r.disciplindeName || t("unknown");
            map[cat] = map[cat] || {};
            map[cat][disc] = map[cat][disc] || [];
            map[cat][disc].push(r);
        });
        return map;
    })();

    const dataForDiplom = (() => {
        if ((!selectedCategory || !selectedDiscipline)) {
            const data = Object.keys(groupedByCategoryAndDiscipline).flatMap(cat => {
                return Object.keys(groupedByCategoryAndDiscipline[cat]).flatMap(disc => {
                    return groupedByCategoryAndDiscipline[cat][disc].filter(result => result.isChecked).map((result, index) => ({ robot: result, place: index + 1 }));
                });
            });
            return data;
        }
        return results.filter(result => result.isChecked).map(result => ({ robot: result, place: results.indexOf(result) + 1 }));
    })();

    return (
        <div className="content">
            <Row>
                <Col xs="12">
                    <Card>
                        <CardHeader>
                            <CardTitle tag="h4">{t("compResults")}</CardTitle>
                            <div style={{ display: 'flex', alignItems: 'center' }}
                                className="d-flex flex-column flex-md-row align-items-start">
                                {!isAdminOrLeader ? (
                                    <Dropdown isOpen={dropdownOpenYear} toggle={toggleDropdownYear} style={{ marginRight: '10px' }}>
                                        <DropdownToggle caret>
                                            {selectedYear || t("selectYear")}
                                        </DropdownToggle>
                                        <DropdownMenu>
                                            {[...years].reverse().map(year => (
                                                <DropdownItem key={year} onClick={() => setSelectedYear(year)}>
                                                    {year}
                                                </DropdownItem>
                                            ))}
                                        </DropdownMenu>
                                    </Dropdown>
                                ) : (
                                    <div style={{ marginRight: '10px', display: 'flex', alignItems: 'center' }}>
                                        <p className="text-muted">{t('year') || 'Rok'}: {navbarSelectedYear || t('selectYear')}</p>
                                    </div>
                                )}
                                <Dropdown isOpen={dropdownOpenDiscipline} toggle={toggleDropdownDiscipline} style={{ marginRight: '10px' }}>
                                    <DropdownToggle caret>
                                        {selectedDiscipline || t("selectDisc")}
                                    </DropdownToggle>
                                    <DropdownMenu>
                                        <DropdownItem onClick={() => setSelectedDiscipline('')}>{t('clearSearch') || 'Vymazat'}</DropdownItem>
                                        <DropdownItem divider />
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
                                        <DropdownItem onClick={() => setSelectedCategory('')}>{t('clearSearch') || 'Vymazat'}</DropdownItem>
                                        <DropdownItem divider />
                                        <DropdownItem onClick={() => setSelectedCategory(t("students"))}>{t("students")}</DropdownItem>
                                        <DropdownItem onClick={() => setSelectedCategory(t("pupils"))}>{t("pupils")}</DropdownItem>
                                    </DropdownMenu>
                                </Dropdown>
                                {results.length > 0 && isAdminOrLeaderOrAssistantOrReferee && (
                                    <DiplomaButton disabled={!results.some(result => result.isChecked)} style={{ marginLeft: 'auto' }} data={dataForDiplom}>{t('generateDiplomas')}</DiplomaButton>
                                )}
                            </div>
                        </CardHeader>


                        <CardBody>
                            {results.length > 0 ? (
                                <>
                                    {/* Grouped rendering when NOT both filters selected - group by unselected dimension */}
                                    {(!selectedCategory || !selectedDiscipline) ? (
                                        Object.keys(groupedByCategoryAndDiscipline).map(cat => (
                                            <div key={cat} style={{ marginBottom: '1.5rem' }}>
                                                <h5>{getCategoryLabel(cat)}</h5>
                                                {Object.keys(groupedByCategoryAndDiscipline[cat]).map(disc => (
                                                    <div key={disc} style={{ marginBottom: '1rem' }}>
                                                        <h6 style={{ marginLeft: '0.5rem' }}>{disc}</h6>
                                                        <Table responsive>
                                                            <thead>
                                                                <tr>
                                                                    {isAdminOrLeaderOrAssistantOrReferee && <th>
                                                                        <Input type="checkbox" checked={groupedByCategoryAndDiscipline[cat][disc].every(result => result.isChecked)} onChange={(event) => {
                                                                            const newResults = [...results];
                                                                            newResults.forEach(result => {
                                                                                if (result.disciplindeName === disc && result.category === cat) {
                                                                                    result.isChecked = event.target.checked;
                                                                                }
                                                                            });
                                                                            setResults(newResults);
                                                                        }}/>
                                                                        </th>
                                                                    }
                                                                    <th>{t("place")}</th>
                                                                    <th>{t("robot")}</th>
                                                                    <th>{t("team")}</th>
                                                                    <th>{t("names")}</th>
                                                                    <th>{t("score")}</th>
                                                                    {isAdminOrLeaderOrAssistantOrReferee && <th>{t("diploma")}</th>}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {groupedByCategoryAndDiscipline[cat][disc].map((result, index) => (
                                                                    <tr key={result.robotID}>
                                                                        {isAdminOrLeaderOrAssistantOrReferee && <th>
                                                                            <Input type="checkbox" checked={result.isChecked} onChange={(event) => {
                                                                                const newResults = [...results];
                                                                                const newResult = newResults.find(r => r.disciplindeName === disc && r.category === cat && r.robotID === result.robotID);
                                                                                if (newResult) {
                                                                                    newResult.isChecked = event.target.checked;
                                                                                    setResults(newResults);
                                                                                }
                                                                            }}/>
                                                                            </th>
                                                                        }
                                                                        <td>{index + 1}</td>
                                                                        <td>{result.robotName}</td>
                                                                        <td>{result.teamName}</td>
                                                                        <td>{result.userNames.join(', ')}</td>
                                                                        <td>{result.score}</td>
                                                                        {isAdminOrLeaderOrAssistantOrReferee && (
                                                                            <td>
                                                                                <DiplomaButton data={[{robot: result, place: index + 1}]}>{t("diploma_caps")}</DiplomaButton>
                                                                            </td>)}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </Table>
                                                    </div>
                                                ))}
                                            </div>
                                        ))
                                    ) : (
                                        // If any filter selected, show flat table (with pagination)
                                        <>
                                            <Table responsive>
                                                <thead>
                                                    <tr>
                                                        {isAdminOrLeaderOrAssistantOrReferee && <th>
                                                            <Input type="checkbox" checked={results.every(result => result.isChecked)} onChange={(event) => {
                                                                const newResults = [...results];
                                                                newResults.forEach(result => result.isChecked = event.target.checked);
                                                                setResults(newResults);
                                                            }}/>
                                                            </th>
                                                        }
                                                        <th>{t("place")}</th>
                                                        <th>{t("robot")}</th>
                                                        <th>{t("team")}</th>¨
                                                        <th>{t("names")}</th>
                                                        <th>{t("score")}</th>
                                                        <th>{t("discipline")}</th>

                                                        {isAdminOrLeaderOrAssistantOrReferee && (
                                                            <th>{t("diploma")}</th>)}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {results
                                                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                                        .map((result, index) => (
                                                            <tr key={result.robotID}>
                                                                {isAdminOrLeaderOrAssistantOrReferee && <td><Input type="checkbox" checked={result.isChecked} onChange={(event) => {
                                                                    const newResults = [...results];
                                                                    newResults[index].isChecked = event.target.checked;
                                                                    setResults(newResults);
                                                                }}/></td>}
                                                                <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                                                <td>{result.robotName}</td>
                                                                <td>{result.teamName}</td>
                                                                <td>{result.userNames.join(', ')}</td>
                                                                <td>{result.score}</td>
                                                                <td>{result.disciplindeName}</td>
                                                                {isAdminOrLeaderOrAssistantOrReferee && (
                                                                <td>
                                                                    <DiplomaButton data={[{robot: result, place: index + 1}]}>{t("diploma_caps")}</DiplomaButton>
                                                                </td>)}
                                                            </tr>
                                                        ))
                                                    }
                                                </tbody>
                                            </Table>
                                            <TablePagination
                                                currentPage={currentPage}
                                                totalItems={results.length}
                                                itemsPerPage={itemsPerPage}
                                                onPageChange={(page) => setCurrentPage(page)}
                                                onItemsPerPageChange={(items) => {
                                                    setItemsPerPage(items);
                                                    setCurrentPage(1);
                                                }}
                                            />
                                        </>
                                    )}
                                </>
                            ) : (
                                <div>{t("noRobotsFound")}</div>
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

export default CompetitionResults;