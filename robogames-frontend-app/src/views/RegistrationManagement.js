import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Table,
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
  InputGroup,
  InputGroupText,
  FormFeedback,
} from "reactstrap";
import { useUser, validateName } from "contexts/UserContext";
import { useAdmin } from "contexts/AdminContext";
import { useToast } from "contexts/ToastContext";
import { useConfirm } from "components/ConfirmModal";
import { t } from "translations/translate";
import TeamSearchSelect from "components/TeamSearchSelect/TeamSearchSelect";
import SchoolSearchSelect from "components/SchoolSearchSelect/SchoolSearchSelect";
import TablePagination from "components/TablePagination";

/**
 * Admin component for managing team registrations to competitions
 */
function RegistrationManagement() {
  const { selectedYear, years } = useAdmin();
  const [registrations, setRegistrations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [editTeacherModal, setEditTeacherModal] = useState(false);
  const [changeCategoryModal, setChangeCategoryModal] = useState(false);

  // Form states
  const [newRegistration, setNewRegistration] = useState({
    teamId: '',
    year: selectedYear || '',
    teacherName: '',
    teacherSurname: '',
    teacherContact: '',
    schoolName: '',
    roboLeagueConsent: false
  });
  const [selectedTeamForCreate, setSelectedTeamForCreate] = useState(null);
  const [editTeacher, setEditTeacher] = useState({
    id: null,
    teacherName: '',
    teacherSurname: '',
    teacherContact: '',
    schoolName: '',
    roboLeagueConsent: false
  });
  const [categoryChange, setCategoryChange] = useState({
    id: null,
    category: ''
  });
  const [errors, setErrors] = useState({});
  
  // Search/Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('all'); // 'all', 'id', 'team', 'category', 'teacher'
  const [consentFilter, setConsentFilter] = useState('all'); // 'all', 'yes', 'no'
  const [schoolFilter, setSchoolFilter] = useState(''); // filter by school name

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const { token, tokenExpired } = useUser();
  const toast = useToast();
  const { confirm } = useConfirm();

  const categories = ['LOW_AGE_CATEGORY', 'HIGH_AGE_CATEGORY'];

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchRegistrations(selectedYear);
      // Pre-fill year in new registration form
      setNewRegistration(prev => ({ ...prev, year: selectedYear }));
    }
  }, [selectedYear]);

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/team/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tokenExpired(response.status)) return;

      const json = await response.json();
      if (response.ok && json.type === 'RESPONSE') {
        setTeams(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  const fetchRegistrations = async (year) => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/competition/allRegistrations?year=${year}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tokenExpired(response.status)) return;

      const json = await response.json();
      if (response.ok && json.type === 'RESPONSE') {
        setRegistrations(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Validate contact
  const validateContact = (contact) => {
    if (!contact || contact.trim().length === 0) return 'empty';
    if (contact.length < 5) return 'short';
    if (contact.length > 100) return 'long';
    return true;
  };

  // CREATE REGISTRATION
  const handleCreateRegistration = async () => {
    let newErrors = {};

    if (!selectedTeamForCreate) {
      newErrors.teamId = t("fieldsRequired");
    }
    if (!newRegistration.year) {
      newErrors.year = t("fieldsRequired");
    }

    const nameCheck = validateName(newRegistration.teacherName);
    if (!nameCheck || nameCheck === 'too short' || nameCheck === 'too long') {
      newErrors.teacherName = nameCheck === 'too short' ? t("shortName") : nameCheck === 'too long' ? t("longName") : t("invalidName");
    }

    const surnameCheck = validateName(newRegistration.teacherSurname);
    if (!surnameCheck || surnameCheck === 'too short' || surnameCheck === 'too long') {
      newErrors.teacherSurname = surnameCheck === 'too short' ? t("shortSurname") : surnameCheck === 'too long' ? t("longSurname") : t("invalidSurname");
    }

    const contactCheck = validateContact(newRegistration.teacherContact);
    if (contactCheck !== true) {
      newErrors.teacherContact = contactCheck === 'empty' ? t("fieldsRequired") : contactCheck === 'short' ? t("shortContact") : t("longContact");
    }

    // Validate school name if consent is checked
    if (newRegistration.roboLeagueConsent && (!newRegistration.schoolName || newRegistration.schoolName.trim().length === 0)) {
      newErrors.schoolName = t("schoolRequiredForConsent");
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/admin/registration/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          teamId: selectedTeamForCreate.id,
          year: parseInt(newRegistration.year),
          teacherName: newRegistration.teacherName,
          teacherSurname: newRegistration.teacherSurname,
          teacherContact: newRegistration.teacherContact,
          schoolName: newRegistration.schoolName || null,
          roboLeagueConsent: newRegistration.roboLeagueConsent
        })
      });
      if (tokenExpired(response.status)) return;

      const result = await response.json();
      if (response.ok) {
        toast.success(t("registrationCreated"));
        setCreateModal(false);
        setNewRegistration({ teamId: '', year: '', teacherName: '', teacherSurname: '', teacherContact: '', schoolName: '', roboLeagueConsent: false });
        setSelectedTeamForCreate(null);
        setErrors({});
        fetchRegistrations(selectedYear);
      } else {
        toast.error(result.data || t("registrationCreateFail"));
      }
    } catch (error) {
      toast.error(t("registrationCreateFail"));
    }
  };

  // EDIT TEACHER
  const handleEditTeacher = async () => {
    let newErrors = {};

    const nameCheck = validateName(editTeacher.teacherName);
    if (!nameCheck || nameCheck === 'too short' || nameCheck === 'too long') {
      newErrors.teacherName = nameCheck === 'too short' ? t("shortName") : nameCheck === 'too long' ? t("longName") : t("invalidName");
    }

    const surnameCheck = validateName(editTeacher.teacherSurname);
    if (!surnameCheck || surnameCheck === 'too short' || surnameCheck === 'too long') {
      newErrors.teacherSurname = surnameCheck === 'too short' ? t("shortSurname") : surnameCheck === 'too long' ? t("longSurname") : t("invalidSurname");
    }

    const contactCheck = validateContact(editTeacher.teacherContact);
    if (contactCheck !== true) {
      newErrors.teacherContact = contactCheck === 'empty' ? t("fieldsRequired") : contactCheck === 'short' ? t("shortContact") : t("longContact");
    }

    // Validate school name if consent is checked
    if (editTeacher.roboLeagueConsent && (!editTeacher.schoolName || editTeacher.schoolName.trim().length === 0)) {
      newErrors.schoolName = t("schoolRequiredForConsent");
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/admin/registration/editTeacher?id=${editTeacher.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          teacherName: editTeacher.teacherName,
          teacherSurname: editTeacher.teacherSurname,
          teacherContact: editTeacher.teacherContact,
          schoolName: editTeacher.schoolName || null,
          roboLeagueConsent: editTeacher.roboLeagueConsent
        })
      });
      if (tokenExpired(response.status)) return;

      const result = await response.json();
      if (response.ok) {
        toast.success(t("teacherEdited"));
        setEditTeacherModal(false);
        setErrors({});
        fetchRegistrations(selectedYear);
      } else {
        toast.error(result.data || t("teacherEditFail"));
      }
    } catch (error) {
      toast.error(t("teacherEditFail"));
    }
  };

  // CHANGE CATEGORY
  const handleChangeCategory = async () => {
    if (!categoryChange.category) {
      toast.warning(t("selectCategory"));
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}api/admin/registration/forceChangeCategory?id=${categoryChange.id}&category=${categoryChange.category}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (tokenExpired(response.status)) return;

      if (response.ok) {
        toast.success(t("categoryChanged"));
        setChangeCategoryModal(false);
        fetchRegistrations(selectedYear);
      } else {
        const result = await response.json();
        toast.error(result.data || t("categoryChangeFail"));
      }
    } catch (error) {
      toast.error(t("categoryChangeFail"));
    }
  };

  // DELETE REGISTRATION
  const handleDeleteRegistration = async (regId) => {
    if (!await confirm({ message: t("registrationRemoveCheck") })) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/admin/registration/remove?id=${regId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tokenExpired(response.status)) return;

      if (response.ok) {
        toast.success(t("registrationRemoved"));
        fetchRegistrations(selectedYear);
      } else {
        const result = await response.json();
        toast.error(result.data || t("registrationRemoveFail"));
      }
    } catch (error) {
      toast.error(t("registrationRemoveFail"));
    }
  };

  const openEditTeacherModal = (reg) => {
    setEditTeacher({
      id: reg.id,
      teacherName: reg.teacherName || '',
      teacherSurname: reg.teacherSurname || '',
      teacherContact: reg.teacherContact || '',
      schoolName: reg.schoolName || '',
      roboLeagueConsent: reg.roboLeagueConsent || false
    });
    setEditTeacherModal(true);
  };

  const openChangeCategoryModal = (reg) => {
    setCategoryChange({
      id: reg.id,
      category: reg.category || ''
    });
    setChangeCategoryModal(true);
  };

  const getCategoryDisplay = (category) => {
    if (category === 'LOW_AGE_CATEGORY') return t("pupils");
    if (category === 'HIGH_AGE_CATEGORY') return t("students");
    return category;
  };

  const filteredRegistrations = registrations.filter(reg => {
    // First apply consent filter
    if (consentFilter === 'yes' && !reg.roboLeagueConsent) return false;
    if (consentFilter === 'no' && reg.roboLeagueConsent) return false;
    
    // Apply school filter
    if (schoolFilter && schoolFilter.trim().length > 0) {
      if (!reg.schoolName || !reg.schoolName.toLowerCase().includes(schoolFilter.toLowerCase())) {
        return false;
      }
    }
    
    const searchLower = searchTerm.toLowerCase();
    if (!searchTerm) return true;
    
    switch (searchType) {
      case 'id':
        return reg.id?.toString().includes(searchTerm);
      case 'team':
        return reg.teamName?.toLowerCase().includes(searchLower) ||
               reg.teamID?.toString().includes(searchTerm);
      case 'category':
        return reg.category?.toLowerCase().includes(searchLower) ||
               getCategoryDisplay(reg.category).toLowerCase().includes(searchLower);
      case 'teacher':
        return reg.teacherName?.toLowerCase().includes(searchLower) ||
               reg.teacherSurname?.toLowerCase().includes(searchLower) ||
               `${reg.teacherName} ${reg.teacherSurname}`.toLowerCase().includes(searchLower);
      case 'all':
      default:
        return reg.id?.toString().includes(searchTerm) ||
               reg.teamName?.toLowerCase().includes(searchLower) ||
               reg.teacherName?.toLowerCase().includes(searchLower) ||
               reg.teacherSurname?.toLowerCase().includes(searchLower) ||
               getCategoryDisplay(reg.category).toLowerCase().includes(searchLower);
    }
  });

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, searchType, consentFilter, schoolFilter]);

  // Calculate summary statistics
  const totalRegistrations = registrations.length;
  const lowAgeCategory = registrations.filter(reg => reg.category === 'LOW_AGE_CATEGORY').length;
  const highAgeCategory = registrations.filter(reg => reg.category === 'HIGH_AGE_CATEGORY').length;
  const roboLeagueConsentCount = registrations.filter(reg => reg.roboLeagueConsent).length;


  return (
    <div className="content">
      {/* Summary Statistics */}
      <Row className="mb-3">
        <Col md="3">
          <Card className="card-stats mb-3 mb-md-0">
            <CardBody className="py-3">
              <div className="d-flex align-items-center">
                <div 
                  className="d-flex align-items-center justify-content-center mr-3"
                  style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #5e72e4 0%, #825ee4 100%)'
                  }}
                >
                  <i className="tim-icons icon-paper" style={{ fontSize: '20px', color: '#fff' }} />
                </div>
                <div>
                  <p className="card-category mb-0" style={{ fontSize: '12px' }}>{t("totalRegistrations") || "Celkem registrací"}</p>
                  <CardTitle tag="h3" className="mb-0">{totalRegistrations}</CardTitle>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md="3">
          <Card className="card-stats mb-3 mb-md-0">
            <CardBody className="py-3">
              <div className="d-flex align-items-center">
                <div 
                  className="d-flex align-items-center justify-content-center mr-3"
                  style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #2dce89 0%, #2dcecc 100%)'
                  }}
                >
                  <i className="tim-icons icon-single-02" style={{ fontSize: '20px', color: '#fff' }} />
                </div>
                <div>
                  <p className="card-category mb-0" style={{ fontSize: '12px' }}>{t("pupils") || "Žáci"}</p>
                  <CardTitle tag="h3" className="mb-0">{lowAgeCategory}</CardTitle>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md="3">
          <Card className="card-stats mb-3 mb-md-0">
            <CardBody className="py-3">
              <div className="d-flex align-items-center">
                <div 
                  className="d-flex align-items-center justify-content-center mr-3"
                  style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #fb6340 0%, #fbb140 100%)'
                  }}
                >
                  <i className="tim-icons icon-single-02" style={{ fontSize: '20px', color: '#fff' }} />
                </div>
                <div>
                  <p className="card-category mb-0" style={{ fontSize: '12px' }}>{t("students") || "Studenti"}</p>
                  <CardTitle tag="h3" className="mb-0">{highAgeCategory}</CardTitle>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md="3">
          <Card className="card-stats mb-3 mb-md-0">
            <CardBody className="py-3">
              <div className="d-flex align-items-center">
                <div 
                  className="d-flex align-items-center justify-content-center mr-3"
                  style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #11cdef 0%, #1171ef 100%)'
                  }}
                >
                  <i className="tim-icons icon-check-2" style={{ fontSize: '20px', color: '#fff' }} />
                </div>
                <div>
                  <p className="card-category mb-0" style={{ fontSize: '12px' }}>{t("roboLeagueConsentShort") || "Robo Lego Liga"}</p>
                  <CardTitle tag="h3" className="mb-0">{roboLeagueConsentCount}</CardTitle>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xs="12">
          <Card>
            <CardHeader>
              <Row className="align-items-center mb-3">
                <Col>
                  <CardTitle tag="h4">{t("registrationManagement")} {selectedYear && `(${selectedYear})`}</CardTitle>
                </Col>
                <Col className="text-right">
                  <Button color="success" onClick={() => setCreateModal(true)}>
                    <i className="tim-icons icon-simple-add mr-1" />
                    {t("registrationCreate")}
                  </Button>
                </Col>
              </Row>
              <Row className="mb-2">
                <Col md="2">
                  <Input
                    type="select"
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                  >
                    <option value="all">{t('searchAll') || 'Vše'}</option>
                    <option value="id">{t('searchRegById') || 'ID'}</option>
                    <option value="team">{t('searchByTeamName') || 'Tým'}</option>
                    <option value="category">{t('searchByCategory') || 'Kategorie'}</option>
                    <option value="teacher">{t('searchByTeacher') || 'Učitel'}</option>
                  </Input>
                </Col>
                <Col md="4">
                  <InputGroup>
                    <InputGroupText>
                      <i className="tim-icons icon-zoom-split" />
                    </InputGroupText>
                    <Input
                      type="text"
                      placeholder={
                        searchType === 'id' ? (t('enterId') || 'Zadejte ID...') :
                        searchType === 'team' ? (t('enterTeamName') || 'Zadejte název týmu...') :
                        searchType === 'category' ? (t('enterCategory') || 'Zadejte kategorii...') :
                        searchType === 'teacher' ? (t('enterTeacher') || 'Zadejte jméno učitele...') :
                        (t('searchRegistration') || 'Hledat registraci...')
                      }
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <InputGroupText 
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSearchTerm('')}
                        title={t('clearSearch') || 'Vymazat'}
                      >
                        <i className="tim-icons icon-simple-remove" />
                      </InputGroupText>
                    )}
                  </InputGroup>
                </Col>
                <Col md="2">
                  <Input
                    type="select"
                    value={consentFilter}
                    onChange={(e) => setConsentFilter(e.target.value)}
                  >
                    <option value="all">{t('roboLeagueAll') || 'RLL: Vše'}</option>
                    <option value="yes">{t('roboLeagueConsentYes') || 'Se souhlasem'}</option>
                    <option value="no">{t('roboLeagueConsentNo') || 'Bez souhlasu'}</option>
                  </Input>
                </Col>
                <Col md="4">
                  <SchoolSearchSelect
                    value={schoolFilter}
                    onChange={(value) => setSchoolFilter(value)}
                    placeholder={t("filterBySchool")}
                    clearable={true}
                  />
                </Col>
              </Row>
            </CardHeader>
            <CardBody>
              {loading ? (
                <p>{t("loading")}</p>
              ) : (
                <>
                <Table responsive>
                  <thead className="text-primary">
                    <tr>
                      <th>{t("id")}</th>
                      <th>{t("team")}</th>
                      <th>{t("category")}</th>
                      <th>{t("teacherName")}</th>
                      <th>{t("teacherSurname")}</th>
                      <th>{t("teacherContact")}</th>
                      <th>{t("schoolName")}</th>
                      <th style={{ textAlign: 'center' }}>{t("roboLeagueConsentShort")}</th>
                      <th style={{ textAlign: 'center' }}>{t("action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((reg) => (
                      <tr key={reg.id}>
                        <td>#{reg.id}</td>
                        <td>{reg.teamName}</td>
                        <td>{getCategoryDisplay(reg.category)}</td>
                        <td>{reg.teacherName || t("notProvided")}</td>
                        <td>{reg.teacherSurname || t("notProvided")}</td>
                        <td>{reg.teacherContact || t("notProvided")}</td>
                        <td 
                          title={reg.schoolName ? `${reg.schoolName} - ${t("clickToCopy") || "Klikněte pro zkopírování"}` : ''}
                          style={{ 
                            maxWidth: '150px', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            cursor: reg.schoolName ? 'pointer' : 'default'
                          }}
                          onClick={() => {
                            if (reg.schoolName) {
                              navigator.clipboard.writeText(reg.schoolName).then(() => {
                                toast.success(t("copiedToClipboard") || "Zkopírováno do schránky");
                              }).catch(() => {
                                toast.error(t("copyFailed") || "Kopírování selhalo");
                              });
                            }
                          }}
                        >
                          {reg.schoolName || t("notProvided")}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {reg.roboLeagueConsent ? (
                            <i className="tim-icons icon-check-2 text-success" title={t("roboLeagueConsentYes")} />
                          ) : (
                            <i className="tim-icons icon-simple-remove text-muted" title={t("roboLeagueConsentNo")} />
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Button
                            color="info"
                            size="sm"
                            className="btn-icon"
                            onClick={() => openEditTeacherModal(reg)}
                            title={t("editTeacherInfo")}
                          >
                            <i className="tim-icons icon-pencil" />
                          </Button>
                          <Button
                            color="warning"
                            size="sm"
                            className="btn-icon ml-1"
                            onClick={() => openChangeCategoryModal(reg)}
                            title={t("changeCategory")}
                          >
                            <i className="tim-icons icon-tag" />
                          </Button>
                          <Button
                            color="danger"
                            size="sm"
                            className="btn-icon ml-1"
                            onClick={() => handleDeleteRegistration(reg.id)}
                            title={t("remove")}
                          >
                            <i className="tim-icons icon-trash-simple" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <TablePagination
                  currentPage={currentPage}
                  totalItems={filteredRegistrations.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={(page) => setCurrentPage(page)}
                  onItemsPerPageChange={(items) => {
                    setItemsPerPage(items);
                    setCurrentPage(1);
                  }}
                />
                </>
              )}
              {!loading && filteredRegistrations.length === 0 && (
                <p className="text-center">{t("noRegsFound")}</p>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Create Registration Modal */}
      <Modal isOpen={createModal} toggle={() => setCreateModal(false)} size="lg">
        <ModalHeader toggle={() => setCreateModal(false)}>{t("registrationCreate")}</ModalHeader>
        <ModalBody style={{ padding: '20px 25px' }}>
          <Form>
            <Row>
              <Col md="8">
                <FormGroup style={{ marginBottom: '12px' }}>
                  <Label style={{ marginBottom: '4px', fontSize: '0.9rem' }}>{t("team")} *</Label>
                  <TeamSearchSelect
                    teams={teams}
                    onSelect={setSelectedTeamForCreate}
                    selectedTeam={selectedTeamForCreate}
                    placeholder={t("searchTeamPlaceholder")}
                    showLeaderInfo={true}
                  />
                  {errors.teamId && <div className="text-danger" style={{ fontSize: '11px', marginTop: '3px' }}>{errors.teamId}</div>}
                </FormGroup>
              </Col>
              <Col md="4">
                <FormGroup style={{ marginBottom: '12px' }}>
                  <Label style={{ marginBottom: '4px', fontSize: '0.9rem' }}>{t("year")}</Label>
                  <Input
                    type="select"
                    value={newRegistration.year}
                    onChange={e => setNewRegistration({ ...newRegistration, year: e.target.value })}
                    invalid={!!errors.year}
                    bsSize="sm"
                  >
                    <option value="">{t("chooseYear")}</option>
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </Input>
                  {errors.year && <FormFeedback>{errors.year}</FormFeedback>}
                </FormGroup>
              </Col>
            </Row>
            <Row>
              <Col md="6">
                <FormGroup style={{ marginBottom: '12px' }}>
                  <Label style={{ marginBottom: '4px', fontSize: '0.9rem' }}>{t("teacherName")}</Label>
                  <Input
                    type="text"
                    value={newRegistration.teacherName}
                    onChange={e => setNewRegistration({ ...newRegistration, teacherName: e.target.value })}
                    invalid={!!errors.teacherName}
                    placeholder={t("enterTeacherName")}
                    bsSize="sm"
                  />
                  {errors.teacherName && <FormFeedback>{errors.teacherName}</FormFeedback>}
                </FormGroup>
              </Col>
              <Col md="6">
                <FormGroup style={{ marginBottom: '12px' }}>
                  <Label style={{ marginBottom: '4px', fontSize: '0.9rem' }}>{t("teacherSurname")}</Label>
                  <Input
                    type="text"
                    value={newRegistration.teacherSurname}
                    onChange={e => setNewRegistration({ ...newRegistration, teacherSurname: e.target.value })}
                    invalid={!!errors.teacherSurname}
                    placeholder={t("enterTeacherSurname")}
                    bsSize="sm"
                  />
                  {errors.teacherSurname && <FormFeedback>{errors.teacherSurname}</FormFeedback>}
                </FormGroup>
              </Col>
            </Row>
            <FormGroup style={{ marginBottom: '12px' }}>
              <Label style={{ marginBottom: '4px', fontSize: '0.9rem' }}>{t("teacherContact")}</Label>
              <Input
                type="text"
                value={newRegistration.teacherContact}
                onChange={e => setNewRegistration({ ...newRegistration, teacherContact: e.target.value })}
                invalid={!!errors.teacherContact}
                placeholder={t("enterTeacherContact")}
                bsSize="sm"
              />
              {errors.teacherContact && <FormFeedback>{errors.teacherContact}</FormFeedback>}
            </FormGroup>
            <Row>
              <Col md="8">
                <FormGroup style={{ marginBottom: '12px' }}>
                  <Label style={{ marginBottom: '4px', fontSize: '0.9rem' }}>{t("schoolName")} {newRegistration.roboLeagueConsent && '*'}</Label>
                  <SchoolSearchSelect
                    value={newRegistration.schoolName}
                    onChange={(value) => setNewRegistration({ ...newRegistration, schoolName: value })}
                    placeholder={t("enterSchoolName")}
                    invalid={!!errors.schoolName}
                  />
                  {errors.schoolName && (
                    <div className="text-danger" style={{ fontSize: '11px', marginTop: '3px' }}>{errors.schoolName}</div>
                  )}
                </FormGroup>
              </Col>
              <Col md="4" className="d-flex align-items-end">
                <FormGroup style={{ marginBottom: '12px' }}>
                  <Label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: 0, fontSize: '0.85rem' }}>
                    <span
                      onClick={() => setNewRegistration({ ...newRegistration, roboLeagueConsent: !newRegistration.roboLeagueConsent })}
                      style={{ 
                        width: '18px', 
                        height: '18px', 
                        marginRight: '8px',
                        cursor: 'pointer',
                        border: '2px solid #ff8d72',
                        borderRadius: '4px',
                        backgroundColor: newRegistration.roboLeagueConsent ? '#ff8d72' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {newRegistration.roboLeagueConsent && (
                        <i className="tim-icons icon-check-2" style={{ color: 'white', fontSize: '10px' }} />
                      )}
                    </span>
                    {t("roboLeagueConsentShort") || "Robo Lego Liga"}
                  </Label>
                </FormGroup>
              </Col>
            </Row>
          </Form>
        </ModalBody>
        <ModalFooter style={{ padding: '12px 25px' }}>
          <Button color="success" onClick={handleCreateRegistration} style={{ marginRight: '10px' }}>{t("create")}</Button>
          <Button color="secondary" onClick={() => setCreateModal(false)}>{t("cancel")}</Button>
        </ModalFooter>
      </Modal>

      {/* Edit Teacher Modal */}
      <Modal isOpen={editTeacherModal} toggle={() => setEditTeacherModal(false)} size="lg">
        <ModalHeader toggle={() => setEditTeacherModal(false)}>{t("editTeacherInfo")}</ModalHeader>
        <ModalBody style={{ padding: '20px 25px' }}>
          <Form>
            <Row>
              <Col md="6">
                <FormGroup style={{ marginBottom: '12px' }}>
                  <Label style={{ marginBottom: '4px', fontSize: '0.9rem' }}>{t("teacherName")}</Label>
                  <Input
                    type="text"
                    value={editTeacher.teacherName}
                    onChange={e => setEditTeacher({ ...editTeacher, teacherName: e.target.value })}
                    invalid={!!errors.teacherName}
                    bsSize="sm"
                  />
                  {errors.teacherName && <FormFeedback>{errors.teacherName}</FormFeedback>}
                </FormGroup>
              </Col>
              <Col md="6">
                <FormGroup style={{ marginBottom: '12px' }}>
                  <Label style={{ marginBottom: '4px', fontSize: '0.9rem' }}>{t("teacherSurname")}</Label>
                  <Input
                    type="text"
                    value={editTeacher.teacherSurname}
                    onChange={e => setEditTeacher({ ...editTeacher, teacherSurname: e.target.value })}
                    invalid={!!errors.teacherSurname}
                    bsSize="sm"
                  />
                  {errors.teacherSurname && <FormFeedback>{errors.teacherSurname}</FormFeedback>}
                </FormGroup>
              </Col>
            </Row>
            <FormGroup style={{ marginBottom: '12px' }}>
              <Label style={{ marginBottom: '4px', fontSize: '0.9rem' }}>{t("teacherContact")}</Label>
              <Input
                type="text"
                value={editTeacher.teacherContact}
                onChange={e => setEditTeacher({ ...editTeacher, teacherContact: e.target.value })}
                invalid={!!errors.teacherContact}
                bsSize="sm"
              />
              {errors.teacherContact && <FormFeedback>{errors.teacherContact}</FormFeedback>}
            </FormGroup>
            <Row>
              <Col md="8">
                <FormGroup style={{ marginBottom: '12px' }}>
                  <Label style={{ marginBottom: '4px', fontSize: '0.9rem' }}>{t("schoolName")} {editTeacher.roboLeagueConsent && '*'}</Label>
                  <SchoolSearchSelect
                    value={editTeacher.schoolName}
                    onChange={(value) => setEditTeacher({ ...editTeacher, schoolName: value })}
                    placeholder={t("enterSchoolName")}
                    invalid={!!errors.schoolName}
                  />
                  {errors.schoolName && (
                    <div className="text-danger" style={{ fontSize: '11px', marginTop: '3px' }}>{errors.schoolName}</div>
                  )}
                </FormGroup>
              </Col>
              <Col md="4" className="d-flex align-items-end">
                <FormGroup style={{ marginBottom: '12px' }}>
                  <Label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: 0, fontSize: '0.85rem' }}>
                    <span
                      onClick={() => setEditTeacher({ ...editTeacher, roboLeagueConsent: !editTeacher.roboLeagueConsent })}
                      style={{ 
                        width: '18px', 
                        height: '18px', 
                        marginRight: '8px',
                        cursor: 'pointer',
                        border: '2px solid #ff8d72',
                        borderRadius: '4px',
                        backgroundColor: editTeacher.roboLeagueConsent ? '#ff8d72' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {editTeacher.roboLeagueConsent && (
                        <i className="tim-icons icon-check-2" style={{ color: 'white', fontSize: '10px' }} />
                      )}
                    </span>
                    {t("roboLeagueConsentShort") || "Robo Lego Liga"}
                  </Label>
                </FormGroup>
              </Col>
            </Row>
          </Form>
        </ModalBody>
        <ModalFooter style={{ padding: '12px 25px' }}>
          <Button color="primary" onClick={handleEditTeacher} style={{ marginRight: '10px' }}>{t("save")}</Button>
          <Button color="secondary" onClick={() => setEditTeacherModal(false)}>{t("cancel")}</Button>
        </ModalFooter>
      </Modal>

      {/* Change Category Modal */}
      <Modal isOpen={changeCategoryModal} toggle={() => setChangeCategoryModal(false)} size="lg">
        <ModalHeader toggle={() => setChangeCategoryModal(false)}>{t("changeCategory")}</ModalHeader>
        <ModalBody style={{ padding: '20px 25px' }}>
          <Form>
            <FormGroup>
              <Label>{t("category")}</Label>
              <Input
                type="select"
                value={categoryChange.category}
                onChange={e => setCategoryChange({ ...categoryChange, category: e.target.value })}
              >
                <option value="">{t("selectCategory")}</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {getCategoryDisplay(cat)}
                  </option>
                ))}
              </Input>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter style={{ padding: '15px 25px' }}>
          <Button color="primary" onClick={handleChangeCategory} style={{ marginRight: '10px' }}>{t("save")}</Button>
          <Button color="secondary" onClick={() => setChangeCategoryModal(false)}>{t("cancel")}</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default RegistrationManagement;
