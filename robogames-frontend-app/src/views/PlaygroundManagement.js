/**
* Renders the PlaygroundManagement component, which provides functionality for managing playgrounds.
* 
* The component fetches a list of playgrounds and disciplines from the server, and allows the user to
* add new playgrounds. It also provides the ability to remove existing playgrounds.
* 
*/
import React, { useState, useEffect, useContext } from 'react';
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
    Col
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { useToast } from "contexts/ToastContext";
import { useConfirm } from "components/ConfirmModal";
import { ThemeContext, themes } from "contexts/ThemeContext";
import { t } from "translations/translate";

function PlaygroundManagement() {
    const [playgrounds, setPlaygrounds] = useState([]);
    const [disciplines, setDisciplines] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [modal, setModal] = useState(false);
    const [modalEdit, setModalEdit] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownEditOpen, setDropdownEditOpen] = useState(false);
    const [playground, setPlayground] = useState({
        name: '',
        number: '',
        disciplineID: ''
    });
    const [editPlayground, setEditPlayground] = useState({
        id: null,
        name: '',
        number: '',
        disciplineID: ''
    });

    const { token, tokenExpired } = useUser();
    const toast = useToast();
    const { confirm } = useConfirm();
    const { theme } = useContext(ThemeContext);
    const isDark = theme === themes.dark;

    useEffect(() => {
        fetchPlaygrounds();
        fetchDisciplines();
    }, []);

    const toggleModal = () => {
        setModal(!modal);
        if (modal) {
            setPlayground({ name: '', number: '', disciplineID: '' });
        }
    };

    const toggleModalEdit = (pg = null) => {
        if (pg) {
            setEditPlayground({
                id: pg.id,
                name: pg.name,
                number: pg.number,
                disciplineID: disciplines.find(d => d.name === pg.disciplineName)?.id || ''
            });
        }
        setModalEdit(!modalEdit);
    };

    const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
    const toggleDropdownEdit = () => setDropdownEditOpen(!dropdownEditOpen);

    const handleInputChange = (e) => {
        setPlayground({ ...playground, [e.target.name]: e.target.value });
    };

    const handleEditInputChange = (e) => {
        setEditPlayground({ ...editPlayground, [e.target.name]: e.target.value });
    };

    const handleRemovePlayground = async (playgroundId) => {
        if (!playgroundId) {
            toast.error(t("pgIdRequired"));
            return;
        }

        if (!await confirm({ message: t("pgRemoveCheck") })) {
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
                toast.success(t("pgRemoved"));
                fetchPlaygrounds();
            } else {
                toast.error(t("pgRemoveFail",{message: data.message || t("unknownError")}));
            }
        } catch (error) {
            console.error('Error removing playground:', error); //
            toast.error(t("pgRemoveError",{message: error.message || t("serverCommFail")}));
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
            toast.warning(t("fieldsRequired"));
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
                toast.success(t("pgAdded"));
                toggleModal();
                fetchPlaygrounds();
            } else {
                const data = await response.json();
                toast.error(t("pgAddFail",{message: data.message}));
            }
        } catch (error) {
            toast.error(t("pgAddError",{message: error.message}));
        }
    };

    const handleEditSubmit = async () => {
        if (!editPlayground.name || !editPlayground.number || !editPlayground.disciplineID) {
            toast.warning(t("fieldsRequired"));
            return;
        }
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}api/playground/edit?id=${editPlayground.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: editPlayground.name,
                    number: editPlayground.number,
                    disciplineID: editPlayground.disciplineID
                })
            });
            if (tokenExpired(response.status)) { return; }

            const data = await response.json();
            if (response.ok && data.type !== 'ERROR') {
                toast.success(t("pgEdited") || "Hřiště bylo upraveno");
                setModalEdit(false);
                fetchPlaygrounds();
            } else {
                toast.error(t("pgEditFail", {message: data.message}) || `Nepodařilo se upravit hřiště: ${data.message}`);
            }
        } catch (error) {
            toast.error(t("pgEditError", {message: error.message}) || `Chyba při úpravě hřiště: ${error.message}`);
        }
    };

    const roles = localStorage.getItem('roles');
    const canAddPlayground = roles && (roles.includes('ADMIN') || roles.includes('LEADER') || roles.includes('ASSISTANT'));

    // Seskupit hřiště podle disciplíny
    const playgroundsByDiscipline = playgrounds.reduce((acc, pg) => {
        const disciplineName = pg.disciplineName || 'Ostatní';
        if (!acc[disciplineName]) {
            acc[disciplineName] = [];
        }
        acc[disciplineName].push(pg);
        return acc;
    }, {});

    // Barvy pro různé disciplíny
    const disciplineColors = ['primary', 'info', 'success', 'warning', 'danger'];
    const getDisciplineColor = (index) => disciplineColors[index % disciplineColors.length];

    // Theme-aware colors
    const cardBg = isDark ? '#27293d' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#1d253b';
    const mutedColor = isDark ? '#9a9a9a' : '#8898aa';
    const badgeBg = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
    const badgeText = isDark ? '#ffffff' : '#32325d';

    return (
        <div className="content">
            {canAddPlayground && (
                <Button color="success" style={{ marginBottom: '10px' }} onClick={toggleModal}>
                    <i className="tim-icons icon-simple-add" style={{ marginRight: '8px' }} />
                    {t("pgAdd")}
                </Button>
            )}

            {/* Add Playground Modal */}
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
                                    {disciplines.find(d => d.id === playground.disciplineID)?.name || t("selectDisc")}
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

            {/* Edit Playground Modal */}
            <Modal isOpen={modalEdit} toggle={() => toggleModalEdit()}>
                <ModalHeader toggle={() => toggleModalEdit()}>{t("pgEdit") || "Upravit hřiště"}</ModalHeader>
                <ModalBody>
                    <Form>
                        <FormGroup>
                            <Label for="editName">{t("title")}</Label>
                            <Input type="text" name="name" id="editName" placeholder={t("enterPgTitle")} value={editPlayground.name} onChange={handleEditInputChange} style={{ color: 'black' }} />
                        </FormGroup>
                        <FormGroup>
                            <Label for="editNumber">{t("number")}</Label>
                            <Input type="number" name="number" id="editNumber" placeholder={t("enterNum")} value={editPlayground.number} onChange={handleEditInputChange} style={{ color: 'black' }} />
                        </FormGroup>
                        <FormGroup>
                            <Label for="editDisciplineID">{t("discipline")}</Label>
                            <Dropdown isOpen={dropdownEditOpen} toggle={toggleDropdownEdit}>
                                <DropdownToggle caret>
                                    {disciplines.find(d => d.id === editPlayground.disciplineID)?.name || t("selectDisc")}
                                </DropdownToggle>
                                <DropdownMenu>
                                    {disciplines.map((d) => (
                                        <DropdownItem key={d.id} onClick={() => setEditPlayground({ ...editPlayground, disciplineID: d.id })}>
                                            {d.name}
                                        </DropdownItem>
                                    ))}
                                </DropdownMenu>
                            </Dropdown>
                        </FormGroup>
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={handleEditSubmit} style={{ margin: '10px' }}>{t("confirm")}</Button>
                    <Button color="secondary" onClick={() => toggleModalEdit()} style={{ margin: '10px' }}>{t("cancel")}</Button>
                </ModalFooter>
            </Modal>

            {isLoading ? (
                <Row>
                    <Col>
                        <Card style={{ backgroundColor: cardBg }}>
                            <CardBody className="text-center py-5">
                                <i className="tim-icons icon-refresh-02 spin" style={{ fontSize: '2rem', color: textColor }} />
                                <p className="mt-3" style={{ color: textColor }}>{t("loading") || "Načítání..."}</p>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            ) : error ? (
                <Row>
                    <Col>
                        <Card style={{ backgroundColor: cardBg }}>
                            <CardBody className="text-center py-5">
                                <i className="tim-icons icon-alert-circle-exc text-danger" style={{ fontSize: '2rem' }} />
                                <p className="mt-3 text-danger">{error}</p>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            ) : playgrounds.length > 0 ? (
                <Row>
                    {Object.entries(playgroundsByDiscipline).map(([disciplineName, disciplinePlaygrounds], disciplineIndex) => (
                        disciplinePlaygrounds.map(pg => (
                            <Col key={pg.id} lg="4" md="6" sm="12">
                                <Card style={{ backgroundColor: cardBg }}>
                                    <CardHeader 
                                        className={`bg-${getDisciplineColor(disciplineIndex)} text-white d-flex justify-content-between align-items-center`}
                                        style={{ padding: '15px 20px' }}
                                    >
                                        <CardTitle tag="h4" className="mb-0" style={{ fontSize: '1.1rem' }}>{pg.name}</CardTitle>
                                        {canAddPlayground && (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <Button 
                                                    color="link" 
                                                    size="sm" 
                                                    className="text-white p-0"
                                                    onClick={() => toggleModalEdit(pg)}
                                                    title={t("edit") || "Upravit"}
                                                >
                                                    <i className="tim-icons icon-pencil" />
                                                </Button>
                                                <Button 
                                                    color="link" 
                                                    size="sm" 
                                                    className="text-white p-0"
                                                    onClick={() => handleRemovePlayground(pg.id)}
                                                    title={t("remove") || "Odstranit"}
                                                >
                                                    <i className="tim-icons icon-simple-remove" />
                                                </Button>
                                            </div>
                                        )}
                                    </CardHeader>
                                    <CardBody style={{ padding: '20px 25px' }}>
                                        <dl className="row mb-0" style={{ color: textColor }}>
                                            <dt className="col-sm-4" style={{ color: mutedColor }}>{t("number")}:</dt>
                                            <dd className="col-sm-8">
                                                <span style={{ 
                                                    fontSize: '1rem', 
                                                    padding: '6px 12px',
                                                    backgroundColor: badgeBg,
                                                    color: badgeText,
                                                    borderRadius: '4px',
                                                    fontWeight: 600
                                                }}>
                                                    {pg.number}
                                                </span>
                                            </dd>
                                            <dt className="col-sm-4 mt-2" style={{ color: mutedColor }}>{t("discipline")}:</dt>
                                            <dd className="col-sm-8 mt-2">
                                                <span className={`badge badge-${getDisciplineColor(disciplineIndex)}`} style={{ fontSize: '0.85rem', padding: '6px 10px' }}>
                                                    {pg.disciplineName}
                                                </span>
                                            </dd>
                                        </dl>
                                    </CardBody>
                                </Card>
                            </Col>
                        ))
                    ))}
                </Row>
            ) : (
                <Row>
                    <Col>
                        <Card style={{ backgroundColor: cardBg }}>
                            <CardBody className="text-center py-5">
                                <i className="tim-icons icon-square-pin" style={{ fontSize: '3rem', color: mutedColor }} />
                                <h4 className="mt-3" style={{ color: textColor }}>{t("noPg") || "Žádná hřiště"}</h4>
                                <p style={{ color: mutedColor }}>{t("noPgDesc") || "Zatím nebyla přidána žádná hřiště."}</p>
                                {canAddPlayground && (
                                    <Button color="primary" onClick={toggleModal}>
                                        <i className="tim-icons icon-simple-add" style={{ marginRight: '8px' }} />
                                        {t("pgAdd")}
                                    </Button>
                                )}
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            )}
        </div>
    );
}

export default PlaygroundManagement;