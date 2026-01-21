/**
 * PlaygroundManagement - Admin view for managing playgrounds
 * Design unified with MatchManagement pattern
 */
import React, { useState, useEffect, useContext, useCallback } from 'react';
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
    Row,
    Col,
    Table,
    Badge,
    Spinner,
    Alert,
    InputGroup,
    InputGroupText
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { useToast } from "contexts/ToastContext";
import { useConfirm } from "components/ConfirmModal";
import { ThemeContext, themes } from "contexts/ThemeContext";
import { t } from "translations/translate";
import TablePagination from "components/TablePagination";

function PlaygroundManagement() {
    const [playgrounds, setPlaygrounds] = useState([]);
    const [disciplines, setDisciplines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    // Form data
    const [newPlayground, setNewPlayground] = useState({
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

    // Filters & Pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('all'); // 'all', 'id', 'name', 'number', 'discipline'
    const [filterDiscipline, setFilterDiscipline] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    const { token, tokenExpired } = useUser();
    const toast = useToast();
    const { confirm } = useConfirm();
    const { theme } = useContext(ThemeContext);
    const isDark = theme === themes.dark;

    // Fetch playgrounds
    const fetchPlaygrounds = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}api/playground/all`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (tokenExpired(response.status)) return;

            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                setPlaygrounds(data.data || []);
            } else {
                setError(data.message || t("pgFetchFail"));
            }
        } catch (error) {
            setError(error.message || t("pgFetchError"));
        } finally {
            setLoading(false);
        }
    }, [token, tokenExpired]);

    // Fetch disciplines
    const fetchDisciplines = useCallback(async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}api/discipline/all`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (tokenExpired(response.status)) return;

            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                setDisciplines(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch disciplines:', error);
        }
    }, [token, tokenExpired]);

    useEffect(() => {
        fetchPlaygrounds();
        fetchDisciplines();
    }, [fetchPlaygrounds, fetchDisciplines]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, searchType, filterDiscipline]);

    // Filter playgrounds
    const filteredPlaygrounds = playgrounds.filter(pg => {
        const searchLower = searchQuery.toLowerCase();

        let matchesSearch = !searchQuery;
        if (searchQuery) {
            switch (searchType) {
                case 'id':
                    matchesSearch = pg.id?.toString().includes(searchQuery);
                    break;
                case 'name':
                    matchesSearch = pg.name?.toLowerCase().includes(searchLower);
                    break;
                case 'number':
                    matchesSearch = pg.number?.toString().includes(searchQuery);
                    break;
                case 'discipline':
                    matchesSearch = pg.disciplineName?.toLowerCase().includes(searchLower);
                    break;
                case 'all':
                default:
                    matchesSearch =
                        pg.id?.toString().includes(searchQuery) ||
                        pg.name?.toLowerCase().includes(searchLower) ||
                        pg.number?.toString().includes(searchQuery) ||
                        pg.disciplineName?.toLowerCase().includes(searchLower);
                    break;
            }
        }

        const matchesDiscipline = !filterDiscipline ||
            pg.disciplineName === filterDiscipline;

        return matchesSearch && matchesDiscipline;
    });

    // Get unique disciplines from playgrounds
    const uniqueDisciplines = [...new Set(playgrounds.map(pg => pg.disciplineName).filter(Boolean))];

    // Create playground
    const handleCreatePlayground = async () => {
        if (!newPlayground.name || !newPlayground.number || !newPlayground.disciplineID) {
            toast.error(t("fillAllFields") || 'Vyplňte všechna pole');
            return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}api/playground/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: newPlayground.name,
                    number: parseInt(newPlayground.number),
                    disciplineID: newPlayground.disciplineID
                })
            });
            if (tokenExpired(response.status)) return;

            const data = await response.json();
            if (response.ok && data.type !== 'ERROR') {
                toast.success(t("pgAdded") || "Hřiště bylo vytvořeno");
                setShowCreateModal(false);
                setNewPlayground({ name: '', number: '', disciplineID: '' });
                fetchPlaygrounds();
            } else {
                toast.error(data.message || t("pgAddFail"));
            }
        } catch (error) {
            toast.error(error.message || t("pgAddError"));
            
        }
    };

    // Open edit modal
    const handleOpenEditModal = (pg) => {
        setEditPlayground({
            id: pg.id,
            name: pg.name,
            number: pg.number,
            disciplineID: disciplines.find(d => d.name === pg.disciplineName)?.id || ''
        });
        setShowEditModal(true);
    };

    // Update playground
    const handleUpdatePlayground = async () => {
        if (!editPlayground.name || !editPlayground.number || !editPlayground.disciplineID) {
            toast.error(t("fillAllFields") || 'Vyplňte všechna pole');
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
                    number: parseInt(editPlayground.number),
                    disciplineID: editPlayground.disciplineID
                })
            });
            if (tokenExpired(response.status)) return;

            const data = await response.json();
            if (response.ok && data.type !== 'ERROR') {
                toast.success(t("pgEdited") || "Hřiště bylo upraveno");
                setShowEditModal(false);
                fetchPlaygrounds();
            } else {
                toast.error(data.message || t("pgEditFail"));
            }
        } catch (error) {
            toast.error(error.message || t("pgEditError"));
        }
    };

    // Delete playground
    const handleDeletePlayground = async (playgroundId) => {
        if (!await confirm({ message: t("pgRemoveCheck") || "Opravdu chcete odstranit toto hřiště?" })) {
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
            if (tokenExpired(response.status)) return;

            const data = await response.json();
            if (response.ok && data.type !== 'ERROR') {
                toast.success(t("pgRemoved") || "Hřiště bylo odstraněno");
                fetchPlaygrounds();
            } else {
                toast.error(data.message || t("pgRemoveFail"));
            }
        } catch (error) {
            toast.error(error.message || t("pgRemoveError"));
        }
    };

    const roles = localStorage.getItem('roles');
    const canManage = roles && (roles.includes('ADMIN') || roles.includes('LEADER') || roles.includes('ASSISTANT'));

    // Discipline colors
    const getDisciplineColor = (disciplineName) => {
        const colors = ['primary', 'info', 'success', 'warning', 'danger'];
        const index = disciplines.findIndex(d => d.name === disciplineName);
        return colors[index % colors.length] || 'secondary';
    };

    return (
        <div className="content">
            <Row>
                <Col xs="12">
                    <Card>
                        <CardHeader>
                            <Row className="align-items-center">
                                <Col>
                                    <CardTitle tag="h4">
                                        <i className="tim-icons icon-square-pin mr-2" />
                                        {t('playgroundManagement') || 'Správa hřišť'}
                                    </CardTitle>
                                </Col>
                                {canManage && (
                                    <Col xs="auto">
                                        <Button color="success" onClick={() => setShowCreateModal(true)}>
                                            <i className="tim-icons icon-simple-add mr-2" />
                                            {t('pgAdd') || 'Přidat hřiště'}
                                        </Button>
                                    </Col>
                                )}
                            </Row>
                        </CardHeader>
                        <CardBody>
                            {/* Statistics */}
                            <Row className="mb-4">
                                <Col md="4">
                                    <div className="text-center p-3" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                        <h3 className="mb-0">{playgrounds.length}</h3>
                                        <small className="text-muted">{t('totalPlaygrounds') || 'Celkem hřišť'}</small>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div className="text-center p-3" style={{ background: 'rgba(29, 140, 248, 0.1)', borderRadius: '8px' }}>
                                        <h3 className="mb-0 text-info">{uniqueDisciplines.length}</h3>
                                        <small className="text-muted">{t('disciplines') || 'Disciplín'}</small>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div className="text-center p-3" style={{ background: 'rgba(0, 242, 195, 0.1)', borderRadius: '8px' }}>
                                        <h3 className="mb-0 text-success">{filteredPlaygrounds.length}</h3>
                                        <small className="text-muted">{t('filtered') || 'Filtrováno'}</small>
                                    </div>
                                </Col>
                            </Row>

                            {/* Filters */}
                            <Row className="mb-4">
                                <Col md="2">
                                    <Input
                                        type="select"
                                        value={searchType}
                                        onChange={(e) => setSearchType(e.target.value)}
                                    >
                                        <option value="all">{t('searchAll') || 'Vše'}</option>
                                        <option value="id">{t('searchPgById') || 'ID'}</option>
                                        <option value="name">{t('searchByName') || 'Název'}</option>
                                        <option value="number">{t('searchByNumber') || 'Číslo'}</option>
                                        <option value="discipline">{t('searchByDiscipline') || 'Disciplína'}</option>
                                    </Input>
                                </Col>
                                <Col md="5">
                                    <InputGroup>
                                        <InputGroupText>
                                            <i className="tim-icons icon-zoom-split" />
                                        </InputGroupText>
                                        <Input
                                            placeholder={
                                                searchType === 'id' ? (t('enterId') || 'Zadejte ID...') :
                                                    searchType === 'name' ? (t('enterName') || 'Zadejte název...') :
                                                        searchType === 'number' ? (t('enterNumber') || 'Zadejte číslo...') :
                                                            searchType === 'discipline' ? (t('enterDiscipline') || 'Zadejte disciplínu...') :
                                                                (t('searchPlayground') || 'Hledat hřiště...')
                                            }
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                        {searchQuery && (
                                            <InputGroupText
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setSearchQuery('')}
                                                title={t('clearSearch') || 'Vymazat'}
                                            >
                                                <i className="tim-icons icon-simple-remove" />
                                            </InputGroupText>
                                        )}
                                    </InputGroup>
                                </Col>
                                <Col md="5">
                                    <Input
                                        type="select"
                                        value={filterDiscipline}
                                        onChange={(e) => setFilterDiscipline(e.target.value)}
                                    >
                                        <option value="">{t('allDisciplines') || 'Všechny disciplíny'}</option>
                                        {uniqueDisciplines.map(disc => (
                                            <option key={disc} value={disc}>{disc}</option>
                                        ))}
                                    </Input>
                                </Col>
                            </Row>

                            {/* Playgrounds Table */}
                            {loading ? (
                                <div className="text-center py-5">
                                    <Spinner color="primary" />
                                </div>
                            ) : error ? (
                                <Alert color="danger">
                                    <i className="tim-icons icon-alert-circle-exc mr-2" />
                                    {error}
                                </Alert>
                            ) : filteredPlaygrounds.length === 0 ? (
                                <Alert color="info">
                                    <i className="tim-icons icon-alert-circle-exc mr-2" />
                                    {t('noPlaygroundsFound') || 'Žádná hřiště nenalezena'}
                                </Alert>
                            ) : (
                                <>
                                    <Table responsive hover className="table-management">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>{t('title') || 'Název'}</th>
                                                <th>{t('number') || 'Číslo'}</th>
                                                <th>{t('discipline') || 'Disciplína'}</th>
                                                {canManage && <th style={{ textAlign: 'center' }}>{t('actions') || 'Akce'}</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredPlaygrounds
                                                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                                .map(pg => (
                                                    <tr key={pg.id}>
                                                        <td>
                                                            #{pg.id}
                                                        </td>
                                                        <td>
                                                            <strong>{pg.name}</strong>
                                                        </td>
                                                        <td>
                                                            {pg.number}
                                                        </td>
                                                        <td>
                                                            <Badge color={getDisciplineColor(pg.disciplineName)}>
                                                                {pg.disciplineName || '-'}
                                                            </Badge>
                                                        </td>
                                                        {canManage && (
                                                            <td style={{ textAlign: 'center' }}>
                                                                <Button
                                                                    color="primary"
                                                                    size="sm"
                                                                    className="btn-icon"
                                                                    onClick={() => handleOpenEditModal(pg)}
                                                                    title={t('edit') || 'Upravit'}
                                                                >
                                                                    <i className="tim-icons icon-pencil" />
                                                                </Button>
                                                                <Button
                                                                    color="danger"
                                                                    size="sm"
                                                                    className="btn-icon ml-1"
                                                                    onClick={() => handleDeletePlayground(pg.id)}
                                                                    title={t('delete') || 'Smazat'}
                                                                >
                                                                    <i className="tim-icons icon-trash-simple" />
                                                                </Button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </Table>

                                    <TablePagination
                                        currentPage={currentPage}
                                        totalItems={filteredPlaygrounds.length}
                                        itemsPerPage={itemsPerPage}
                                        onPageChange={(page) => setCurrentPage(page)}
                                        onItemsPerPageChange={(items) => { setItemsPerPage(items); setCurrentPage(1); }}
                                    />
                                </>
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Create Modal */}
            <Modal isOpen={showCreateModal} toggle={() => setShowCreateModal(false)}>
                <ModalHeader toggle={() => setShowCreateModal(false)}>
                    {t('pgAddNew') || 'Přidat nové hřiště'}
                </ModalHeader>
                <ModalBody>
                    <Form>
                        <FormGroup>
                            <Label>{t('title') || 'Název'}</Label>
                            <Input
                                type="text"
                                placeholder={t('enterPgTitle') || 'Zadejte název hřiště'}
                                value={newPlayground.name}
                                onChange={(e) => setNewPlayground({ ...newPlayground, name: e.target.value })}
                                style={{ color: isDark ? 'white' : 'black' }}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label>{t('number') || 'Číslo'}</Label>
                            <Input
                                type="number"
                                placeholder={t('enterNum') || 'Zadejte číslo'}
                                value={newPlayground.number}
                                onChange={(e) => setNewPlayground({ ...newPlayground, number: e.target.value })}
                                style={{ color: isDark ? 'white' : 'black' }}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label>{t('discipline') || 'Disciplína'}</Label>
                            <Input
                                type="select"
                                value={newPlayground.disciplineID}
                                onChange={(e) => setNewPlayground({ ...newPlayground, disciplineID: e.target.value })}
                                style={{ color: isDark ? 'white' : 'black' }}
                            >
                                <option value="">{t('selectDisc') || 'Vyberte disciplínu'}</option>
                                {disciplines.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </Input>
                        </FormGroup>
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setShowCreateModal(false)}>
                        {t('cancel') || 'Zrušit'}
                    </Button>
                    <Button color="primary" onClick={handleCreatePlayground}>
                        {t('create') || 'Vytvořit'}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={showEditModal} toggle={() => setShowEditModal(false)}>
                <ModalHeader toggle={() => setShowEditModal(false)}>
                    {t('pgEdit') || 'Upravit hřiště'}
                </ModalHeader>
                <ModalBody>
                    <Form>
                        <FormGroup>
                            <Label>{t('title') || 'Název'}</Label>
                            <Input
                                type="text"
                                value={editPlayground.name}
                                onChange={(e) => setEditPlayground({ ...editPlayground, name: e.target.value })}
                                style={{ color: isDark ? 'white' : 'black' }}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label>{t('number') || 'Číslo'}</Label>
                            <Input
                                type="number"
                                value={editPlayground.number}
                                onChange={(e) => setEditPlayground({ ...editPlayground, number: e.target.value })}
                                style={{ color: isDark ? 'white' : 'black' }}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label>{t('discipline') || 'Disciplína'}</Label>
                            <Input
                                type="select"
                                value={editPlayground.disciplineID}
                                onChange={(e) => setEditPlayground({ ...editPlayground, disciplineID: e.target.value })}
                                style={{ color: isDark ? 'white' : 'black' }}
                            >
                                <option value="">{t('selectDisc') || 'Vyberte disciplínu'}</option>
                                {disciplines.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </Input>
                        </FormGroup>
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setShowEditModal(false)}>
                        {t('cancel') || 'Zrušit'}
                    </Button>
                    <Button color="primary" onClick={handleUpdatePlayground}>
                        {t('confirm') || 'Uložit'}
                    </Button>
                </ModalFooter>
            </Modal>

            <style>{`
                .table-management tbody tr:hover {
                    background: rgba(255,255,255,0.05);
                }
            `}</style>
        </div>
    );
}

export default PlaygroundManagement;
