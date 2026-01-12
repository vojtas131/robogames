/**
 * CompetitionManagement - Admin view for managing competitions/years
 * Design unified with MatchManagement pattern
 */
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card,
    CardHeader,
    CardBody,
    CardTitle,
    Row,
    Col,
    Button,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Form,
    FormGroup,
    Label,
    Input,
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

function CompetitionManagement() {
    const [competitions, setCompetitions] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    
    // Form data
    const [newCompetition, setNewCompetition] = useState({
        year: '',
        date: '',
        startTime: '',
        endTime: ''
    });
    const [editCompetition, setEditCompetition] = useState({
        id: '',
        year: '',
        date: '',
        startTime: '',
        endTime: ''
    });

    // Filters & Pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    const { token, tokenExpired } = useUser();
    const toast = useToast();
    const { confirm } = useConfirm();
    const navigate = useNavigate();
    const { theme } = useContext(ThemeContext);
    const isDark = theme === themes.dark;

    // Fetch competitions
    const fetchCompetitions = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}api/competition/all`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (tokenExpired(response.status)) return;

            const data = await response.json();
            if (response.ok && data.type === 'RESPONSE') {
                setCompetitions(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch competitions:', error);
        } finally {
            setLoading(false);
        }
    }, [token, tokenExpired]);

    useEffect(() => {
        fetchCompetitions();
    }, [fetchCompetitions]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterStatus]);

    // Filter competitions
    const filteredCompetitions = competitions.filter(comp => {
        const matchesSearch = !searchQuery ||
            comp.year?.toString().includes(searchQuery) ||
            comp.date?.includes(searchQuery);

        const matchesStatus = !filterStatus ||
            (filterStatus === 'started' && comp.started) ||
            (filterStatus === 'notStarted' && !comp.started);

        return matchesSearch && matchesStatus;
    });

    // Create competition
    const handleCreateCompetition = async () => {
        if (!newCompetition.year || !newCompetition.date || !newCompetition.startTime || !newCompetition.endTime) {
            toast.warning(t("compWrongFill") || 'Vyplňte všechna pole');
            return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}api/competition/create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    year: parseInt(newCompetition.year, 10),
                    date: newCompetition.date,
                    startTime: newCompetition.startTime + ':00',
                    endTime: newCompetition.endTime + ':00'
                })
            });
            if (tokenExpired(response.status)) return;

            const data = await response.json();
            if (response.ok) {
                toast.success(t("compCreated") || "Ročník byl vytvořen");
                setShowCreateModal(false);
                setNewCompetition({ year: '', date: '', startTime: '', endTime: '' });
                fetchCompetitions();
            } else {
                toast.error(data.message || t("compCreateFail"));
            }
        } catch (error) {
            toast.error(error.message || t("compCreateError"));
        }
    };

    // Open edit modal
    const handleOpenEditModal = (comp) => {
        setEditCompetition({
            id: comp.id,
            year: comp.year?.toString() || '',
            date: comp.date ? comp.date.split('T')[0] : '',
            startTime: comp.startTime ? comp.startTime.substring(0, 5) : '',
            endTime: comp.endTime ? comp.endTime.substring(0, 5) : ''
        });
        setShowEditModal(true);
    };

    // Update competition
    const handleUpdateCompetition = async () => {
        if (!editCompetition.year || !editCompetition.date || !editCompetition.startTime || !editCompetition.endTime) {
            toast.warning(t("compWrongFill") || 'Vyplňte všechna pole');
            return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}api/competition/edit?id=${editCompetition.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    year: parseInt(editCompetition.year, 10),
                    date: editCompetition.date,
                    startTime: editCompetition.startTime + ':00',
                    endTime: editCompetition.endTime + ':00'
                })
            });
            if (tokenExpired(response.status)) return;

            const data = await response.json();
            if (response.ok) {
                toast.success(t("compUpdated") || "Ročník byl aktualizován");
                setShowEditModal(false);
                fetchCompetitions();
            } else {
                toast.error(data.message || t("compUpdateFail"));
            }
        } catch (error) {
            toast.error(error.message || t("compUpdateError"));
        }
    };

    // Delete competition
    const handleDeleteCompetition = async (id) => {
        if (!await confirm({ message: t("compRemoveConfirm") || "Opravdu chcete odstranit tento ročník?" })) {
            return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}api/competition/remove?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (tokenExpired(response.status)) return;

            if (response.ok) {
                toast.success(t("compRemoved") || "Ročník byl odstraněn");
                fetchCompetitions();
            } else {
                toast.error(t("compRemoveFail"));
            }
        } catch (error) {
            toast.error(error.message || t("compRemoveError"));
        }
    };

    // Start competition
    const handleStartCompetition = async (id) => {
        if (!await confirm({ message: t("compStartConfirm") || "Opravdu chcete zahájit tento ročník?" })) {
            return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}api/competition/start?id=${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (tokenExpired(response.status)) return;

            if (response.ok) {
                toast.success(t("compStarted") || "Ročník byl zahájen");
                fetchCompetitions();
            } else {
                toast.error(t("compStartFail"));
            }
        } catch (error) {
            toast.error(error.message || t("compStartError"));
        }
    };

    // View participants
    const viewParticipants = (year) => {
        navigate(`/admin/competition-detail/?year=${year}`);
    };

    const rolesString = localStorage.getItem('roles');
    const rolesArray = rolesString ? rolesString.split(', ') : [];
    const isAdminOrLeader = rolesArray.some(role => ['ADMIN', 'LEADER'].includes(role));

    // Statistics
    const startedCount = competitions.filter(c => c.started).length;
    const notStartedCount = competitions.filter(c => !c.started).length;

    return (
        <div className="content">
            <Row>
                <Col xs="12">
                    <Card>
                        <CardHeader>
                            <Row className="align-items-center">
                                <Col>
                                    <CardTitle tag="h4">
                                        <i className="tim-icons icon-calendar-60 mr-2" />
                                        {t('competitionManagement') || 'Správa ročníků'}
                                    </CardTitle>
                                </Col>
                                {isAdminOrLeader && (
                                    <Col xs="auto">
                                        <Button color="success" onClick={() => setShowCreateModal(true)}>
                                            <i className="tim-icons icon-simple-add mr-2" />
                                            {t('compAdd') || 'Přidat ročník'}
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
                                        <h3 className="mb-0">{competitions.length}</h3>
                                        <small className="text-muted">{t('totalCompetitions') || 'Celkem ročníků'}</small>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div className="text-center p-3" style={{ background: 'rgba(0, 242, 195, 0.1)', borderRadius: '8px' }}>
                                        <h3 className="mb-0 text-success">{startedCount}</h3>
                                        <small className="text-muted">{t('started') || 'Zahájené'}</small>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div className="text-center p-3" style={{ background: 'rgba(255, 178, 43, 0.1)', borderRadius: '8px' }}>
                                        <h3 className="mb-0 text-warning">{notStartedCount}</h3>
                                        <small className="text-muted">{t('notStarted') || 'Nezahájené'}</small>
                                    </div>
                                </Col>
                            </Row>

                            {/* Filters */}
                            <Row className="mb-4">
                                <Col md="6">
                                    <InputGroup>
                                        <InputGroupText>
                                            <i className="tim-icons icon-zoom-split" />
                                        </InputGroupText>
                                        <Input
                                            placeholder={t('searchCompetition') || 'Hledat ročník...'}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </InputGroup>
                                </Col>
                                <Col md="6">
                                    <Input
                                        type="select"
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                    >
                                        <option value="">{t('allStatuses') || 'Všechny stavy'}</option>
                                        <option value="started">{t('started') || 'Zahájené'}</option>
                                        <option value="notStarted">{t('notStarted') || 'Nezahájené'}</option>
                                    </Input>
                                </Col>
                            </Row>

                            {/* Competitions Table */}
                            {loading ? (
                                <div className="text-center py-5">
                                    <Spinner color="primary" />
                                </div>
                            ) : filteredCompetitions.length === 0 ? (
                                <Alert color="info">
                                    <i className="tim-icons icon-alert-circle-exc mr-2" />
                                    {t('noComps') || 'Žádné ročníky nenalezeny'}
                                </Alert>
                            ) : (
                                <>
                                    <Table responsive hover className="table-management">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>{t('year') || 'Rok'}</th>
                                                <th>{t('date') || 'Datum'}</th>
                                                <th>{t('start') || 'Začátek'}</th>
                                                <th>{t('end') || 'Konec'}</th>
                                                <th>{t('status') || 'Stav'}</th>
                                                <th>{t('actions') || 'Akce'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCompetitions
                                                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                                .map(comp => (
                                                    <tr key={comp.id}>
                                                        <td>
                                                            <Badge color="secondary" style={{ fontSize: '12px' }}>
                                                                #{comp.id}
                                                            </Badge>
                                                        </td>
                                                        <td>
                                                            <strong style={{ fontSize: '1.1rem' }}>{comp.year}</strong>
                                                        </td>
                                                        <td>
                                                            {comp.date ? new Date(comp.date).toLocaleDateString('cs-CZ') : '-'}
                                                        </td>
                                                        <td>
                                                            <Badge color="info">{comp.startTime || '-'}</Badge>
                                                        </td>
                                                        <td>
                                                            <Badge color="info">{comp.endTime || '-'}</Badge>
                                                        </td>
                                                        <td>
                                                            <Badge color={comp.started ? 'success' : 'warning'}>
                                                                {comp.started ? (t('started') || 'Zahájeno') : (t('notStarted') || 'Nezahájeno')}
                                                            </Badge>
                                                        </td>
                                                        <td>
                                                            <Button
                                                                color="secondary"
                                                                size="sm"
                                                                className="mr-1"
                                                                onClick={() => viewParticipants(comp.year)}
                                                                title={t('showParticipants') || 'Zobrazit účastníky'}
                                                            >
                                                                <i className="tim-icons icon-single-02" />
                                                            </Button>
                                                            {isAdminOrLeader && !comp.started && (
                                                                <>
                                                                    <Button
                                                                        color="success"
                                                                        size="sm"
                                                                        className="mr-1"
                                                                        onClick={() => handleStartCompetition(comp.id)}
                                                                        title={t('begin') || 'Zahájit'}
                                                                    >
                                                                        <i className="tim-icons icon-triangle-right-17" />
                                                                    </Button>
                                                                    <Button
                                                                        color="primary"
                                                                        size="sm"
                                                                        className="mr-1"
                                                                        onClick={() => handleOpenEditModal(comp)}
                                                                        title={t('edit') || 'Upravit'}
                                                                    >
                                                                        <i className="tim-icons icon-settings" />
                                                                    </Button>
                                                                    <Button
                                                                        color="danger"
                                                                        size="sm"
                                                                        onClick={() => handleDeleteCompetition(comp.id)}
                                                                        title={t('delete') || 'Smazat'}
                                                                    >
                                                                        <i className="tim-icons icon-trash-simple" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </Table>

                                    <TablePagination
                                        currentPage={currentPage}
                                        totalItems={filteredCompetitions.length}
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
                    {t('compAddNew') || 'Přidat nový ročník'}
                </ModalHeader>
                <ModalBody>
                    <Form>
                        <FormGroup>
                            <Label>{t('year') || 'Rok'}</Label>
                            <Input
                                type="number"
                                placeholder="2026"
                                value={newCompetition.year}
                                onChange={(e) => setNewCompetition({ ...newCompetition, year: e.target.value })}
                                style={{ color: isDark ? 'white' : 'black' }}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label>{t('date') || 'Datum'}</Label>
                            <Input
                                type="date"
                                value={newCompetition.date}
                                onChange={(e) => setNewCompetition({ ...newCompetition, date: e.target.value })}
                                style={{ color: isDark ? 'white' : 'black' }}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label>{t('start') || 'Začátek'}</Label>
                            <Input
                                type="time"
                                value={newCompetition.startTime}
                                onChange={(e) => setNewCompetition({ ...newCompetition, startTime: e.target.value })}
                                style={{ color: isDark ? 'white' : 'black' }}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label>{t('end') || 'Konec'}</Label>
                            <Input
                                type="time"
                                value={newCompetition.endTime}
                                onChange={(e) => setNewCompetition({ ...newCompetition, endTime: e.target.value })}
                                style={{ color: isDark ? 'white' : 'black' }}
                            />
                        </FormGroup>
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setShowCreateModal(false)}>
                        {t('cancel') || 'Zrušit'}
                    </Button>
                    <Button color="primary" onClick={handleCreateCompetition}>
                        {t('create') || 'Vytvořit'}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={showEditModal} toggle={() => setShowEditModal(false)}>
                <ModalHeader toggle={() => setShowEditModal(false)}>
                    {t('compEdit') || 'Upravit ročník'}
                </ModalHeader>
                <ModalBody>
                    <Form>
                        <FormGroup>
                            <Label>{t('year') || 'Rok'}</Label>
                            <Input
                                type="number"
                                value={editCompetition.year}
                                onChange={(e) => setEditCompetition({ ...editCompetition, year: e.target.value })}
                                style={{ color: isDark ? 'white' : 'black' }}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label>{t('date') || 'Datum'}</Label>
                            <Input
                                type="date"
                                value={editCompetition.date}
                                onChange={(e) => setEditCompetition({ ...editCompetition, date: e.target.value })}
                                style={{ color: isDark ? 'white' : 'black' }}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label>{t('start') || 'Začátek'}</Label>
                            <Input
                                type="time"
                                value={editCompetition.startTime}
                                onChange={(e) => setEditCompetition({ ...editCompetition, startTime: e.target.value })}
                                style={{ color: isDark ? 'white' : 'black' }}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label>{t('end') || 'Konec'}</Label>
                            <Input
                                type="time"
                                value={editCompetition.endTime}
                                onChange={(e) => setEditCompetition({ ...editCompetition, endTime: e.target.value })}
                                style={{ color: isDark ? 'white' : 'black' }}
                            />
                        </FormGroup>
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setShowEditModal(false)}>
                        {t('cancel') || 'Zrušit'}
                    </Button>
                    <Button color="primary" onClick={handleUpdateCompetition}>
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

export default CompetitionManagement;
