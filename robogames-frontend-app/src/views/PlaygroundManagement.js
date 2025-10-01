/**
* Renders the PlaygroundManagement component, which provides functionality for managing playgrounds.
* 
* The component fetches a list of playgrounds and disciplines from the server, and allows the user to
* add new playgrounds. It also provides the ability to remove existing playgrounds.
* 
*/
import React, { useState, useEffect } from 'react';
import {
    Button,
    Card,
    CardHeader,
    CardBody,
    CardTitle,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Form,
    FormGroup,
    Label,
    Input,
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
    Row,
    Col,
    Table,
    CardFooter
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { t } from "translations/translate";

function PlaygroundManagement() {
    const [playgrounds, setPlaygrounds] = useState([]);
    const [disciplines, setDisciplines] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [modal, setModal] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [playground, setPlayground] = useState({
        name: '',
        number: '',
        disciplineID: ''
    });

    const { token, tokenExpired } = useUser();

    useEffect(() => {
        fetchPlaygrounds();
        fetchDisciplines();
    }, []);

    const toggleModal = () => setModal(!modal);

    const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

    const handleInputChange = (e) => {
        setPlayground({ ...playground, [e.target.name]: e.target.value });
    };

    const handleRemovePlayground = async (playgroundId) => {
        if (!playgroundId) {
            alert(t("pgIdRequired"));
            return;
        }

        if (!window.confirm(t("pgRemoveCheck"))) {
            return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}api/playground/remove?id=${playgroundId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (tokenExpired(response.status)) { return; }

            const data = await response.json();
            if (response.ok && data.type !== 'ERROR') {
                alert(t("pgRemoved"));
                fetchPlaygrounds();
            } else {
                alert(t("pgRemoveFail",{message: data.message || t("unknownError")}));
            }
        } catch (error) {
            console.error('Error removing playground:', error); //
            alert(t("pgRemoveError",{message: error.message || t("serverCommFail")}));
        }
    };

    const fetchPlaygrounds = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}api/playground/all`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (tokenExpired(response.status)) { return; }

            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                setPlaygrounds(data.data);
            } else {
                setError(t("pgFechFail",{message: data.message || t("unknownError")}));
            }
        } catch (error) {
            setError(t("pgFetchError",{message: error.message}));
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDisciplines = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}api/discipline/all`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (tokenExpired(response.status)) { return; }

            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                setDisciplines(data.data);
            } else {
                console.error('Failed to fetch disciplines:', data.message || 'Unknown error');
            }
        } catch (error) {
            console.error('Error fetching disciplines:', error.message);
        }
    };


    const handleSubmit = async () => {
        if (!playground.name || !playground.number || !playground.disciplineID) {
            alert(t("fieldsRequired"));
            return;
        }
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}api/playground/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(playground)
            });
            if (tokenExpired(response.status)) { return; }

            if (response.ok) {
                alert(t("pgAdded"));
                toggleModal();
                fetchPlaygrounds();
            } else {
                const data = await response.json();
                alert(t("pgAddFail",{message: data.message}));
            }
        } catch (error) {
            alert(t("pgAddError",{message: error.message}));
        }
    };

    const roles = localStorage.getItem('roles');
    const canAddPlayground = roles && (roles.includes('ADMIN') || roles.includes('LEADER') || roles.includes('ASSISTANT'));

    return (
        <>
            <div className="content">
                <Row>
                    <Col xs="12">
                        <Card>
                            <CardHeader>
                                <CardTitle tag="h4">{t("pgOverview")}</CardTitle>
                                {canAddPlayground && (
                                    <Button color="primary" onClick={toggleModal}>{t("pgAdd")}</Button>
                                )}
                            </CardHeader>
                            <CardBody>
                                <Card>
                                    <CardHeader>
                                        <h3 className="mb-0">{t("pg")}</h3>
                                    </CardHeader>
                                    <CardBody>
                                        <Row>
                                            {playgrounds.map((playground) => (
                                                <Col md="4" key={playground.id}>
                                                    <Card className="card-playground" style={{ border: '1px solid lightgray' }}>
                                                        <CardBody>
                                                            <h4>{playground.name}</h4>
                                                            <p>{t("numNum",{number: playground.number})}</p>
                                                            <p>{t("discNum",{number: playground.disciplineName})}</p>
                                                        </CardBody>
                                                        <CardFooter>
                                                            <Button color="danger" onClick={() => handleRemovePlayground(playground.id)} className="btn-icon btn-simple">
                                                                <i className="tim-icons icon-trash-simple"></i>
                                                            </Button>
                                                        </CardFooter>
                                                    </Card>
                                                </Col>
                                            ))}
                                        </Row>
                                    </CardBody>
                                </Card>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            </div>

            <Modal isOpen={modal} toggle={toggleModal}>
                <ModalHeader toggle={toggleModal}>{t("pgAddNew")}</ModalHeader>
                <ModalBody>
                    <Form>
                        <FormGroup>
                            <Label for="name">{t("title")}</Label>
                            <Input type="text" name="name" id="name" placeholder={t("enterPgTitle")} value={playground.name} onChange={handleInputChange} style={{ color: 'black' }} />
                        </FormGroup>
                        <FormGroup>
                            <Label for="number">{t("number")}</Label>
                            <Input type="number" name="number" id="number" placeholder={t("enterNum")} value={playground.number} onChange={handleInputChange} style={{ color: 'black' }} />
                        </FormGroup>
                        <FormGroup>
                            <Label for="disciplineID">{t("discipline")}</Label>
                            <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
                                <DropdownToggle caret>
                                    {playground.disciplineID || t("selectDisc")}
                                </DropdownToggle>
                                <DropdownMenu>
                                    {disciplines.map((d) => (
                                        <DropdownItem key={d.id} onClick={() => setPlayground({ ...playground, disciplineID: d.id })}>
                                            {d.name}
                                        </DropdownItem>
                                    ))}
                                </DropdownMenu>
                            </Dropdown>
                        </FormGroup>
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={handleSubmit} style={{ margin: '10px' }}>{t("send")}</Button>
                    <Button color="secondary" onClick={toggleModal} style={{ margin: '10px' }}>{t("cancel")}</Button>

                </ModalFooter>
            </Modal>
        </>
    );
}

export default PlaygroundManagement;