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
  FormFeedback,
} from "reactstrap";
import { useUser } from "contexts/UserContext";
import { useAdmin } from "contexts/AdminContext";
import { useToast } from "contexts/ToastContext";
import { t } from "translations/translate";
import { validateName } from "./Register";
import TeamSearchSelect from "components/TeamSearchSelect/TeamSearchSelect";

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
    teacherContact: ''
  });
  const [selectedTeamForCreate, setSelectedTeamForCreate] = useState(null);
  const [editTeacher, setEditTeacher] = useState({
    id: null,
    teacherName: '',
    teacherSurname: '',
    teacherContact: ''
  });
  const [categoryChange, setCategoryChange] = useState({
    id: null,
    category: ''
  });
  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const { token, tokenExpired } = useUser();
  const toast = useToast();

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
          teacherContact: newRegistration.teacherContact
        })
      });
      if (tokenExpired(response.status)) return;

      const result = await response.json();
      if (response.ok) {
        toast.success(t("registrationCreated"));
        setCreateModal(false);
        setNewRegistration({ teamId: '', year: '', teacherName: '', teacherSurname: '', teacherContact: '' });
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
          teacherContact: editTeacher.teacherContact
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
    if (!window.confirm(t("registrationRemoveCheck"))) return;

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
      teacherContact: reg.teacherContact || ''
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
    if (category === 'LOW_AGE_CATEGORY') return t("lowAge");
    if (category === 'HIGH_AGE_CATEGORY') return t("highAge");
    return category;
  };

  const filteredRegistrations = registrations.filter(reg =>
    reg.teamName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.teacherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.teacherSurname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="content">
      <Row>
        <Col xs="12">
          <Card>
            <CardHeader>
              <Row className="align-items-center">
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
              <Row className="mt-3">
                <Col md="4">
                  <Input
                    type="text"
                    placeholder={t("searchRegistration")}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </Col>
              </Row>
            </CardHeader>
            <CardBody>
              {loading ? (
                <p>{t("loading")}</p>
              ) : (
                <Table responsive>
                  <thead className="text-primary">
                    <tr>
                      <th>{t("id")}</th>
                      <th>{t("team")}</th>
                      <th>{t("category")}</th>
                      <th>{t("teacherName")}</th>
                      <th>{t("teacherSurname")}</th>
                      <th>{t("teacherContact")}</th>
                      <th style={{ textAlign: 'center' }}>{t("action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map((reg) => (
                      <tr key={reg.id}>
                        <td>{reg.id}</td>
                        <td>{reg.teamName} (ID: {reg.teamID})</td>
                        <td>{getCategoryDisplay(reg.category)}</td>
                        <td>{reg.teacherName || t("notProvided")}</td>
                        <td>{reg.teacherSurname || t("notProvided")}</td>
                        <td>{reg.teacherContact || t("notProvided")}</td>
                        <td style={{ textAlign: 'center' }}>
                          <Button
                            color="info"
                            size="sm"
                            className="btn-icon"
                            onClick={() => openEditTeacherModal(reg)}
                            title={t("editTeacherInfo")}
                          >
                            <i className="tim-icons icon-single-02" />
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
            <FormGroup style={{ marginBottom: '15px' }}>
              <Label>{t("team")} *</Label>
              <TeamSearchSelect
                teams={teams}
                onSelect={setSelectedTeamForCreate}
                selectedTeam={selectedTeamForCreate}
                placeholder={t("searchTeamPlaceholder")}
                showLeaderInfo={true}
              />
              {errors.teamId && <div className="text-danger" style={{ fontSize: '12px', marginTop: '5px' }}>{errors.teamId}</div>}
            </FormGroup>
            <FormGroup>
              <Label>{t("year")}</Label>
              <Input
                type="select"
                value={newRegistration.year}
                onChange={e => setNewRegistration({ ...newRegistration, year: e.target.value })}
                invalid={!!errors.year}
              >
                <option value="">{t("chooseYear")}</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </Input>
              {errors.year && <FormFeedback>{errors.year}</FormFeedback>}
            </FormGroup>
            <FormGroup>
              <Label>{t("teacherName")}</Label>
              <Input
                type="text"
                value={newRegistration.teacherName}
                onChange={e => setNewRegistration({ ...newRegistration, teacherName: e.target.value })}
                invalid={!!errors.teacherName}
                placeholder={t("enterTeacherName")}
              />
              {errors.teacherName && <FormFeedback>{errors.teacherName}</FormFeedback>}
            </FormGroup>
            <FormGroup>
              <Label>{t("teacherSurname")}</Label>
              <Input
                type="text"
                value={newRegistration.teacherSurname}
                onChange={e => setNewRegistration({ ...newRegistration, teacherSurname: e.target.value })}
                invalid={!!errors.teacherSurname}
                placeholder={t("enterTeacherSurname")}
              />
              {errors.teacherSurname && <FormFeedback>{errors.teacherSurname}</FormFeedback>}
            </FormGroup>
            <FormGroup>
              <Label>{t("teacherContact")}</Label>
              <Input
                type="text"
                value={newRegistration.teacherContact}
                onChange={e => setNewRegistration({ ...newRegistration, teacherContact: e.target.value })}
                invalid={!!errors.teacherContact}
                placeholder={t("enterTeacherContact")}
              />
              {errors.teacherContact && <FormFeedback>{errors.teacherContact}</FormFeedback>}
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter style={{ padding: '15px 25px' }}>
          <Button color="success" onClick={handleCreateRegistration} style={{ marginRight: '10px' }}>{t("create")}</Button>
          <Button color="secondary" onClick={() => setCreateModal(false)}>{t("cancel")}</Button>
        </ModalFooter>
      </Modal>

      {/* Edit Teacher Modal */}
      <Modal isOpen={editTeacherModal} toggle={() => setEditTeacherModal(false)} size="lg">
        <ModalHeader toggle={() => setEditTeacherModal(false)}>{t("editTeacherInfo")}</ModalHeader>
        <ModalBody style={{ padding: '20px 25px' }}>
          <Form>
            <FormGroup>
              <Label>{t("teacherName")}</Label>
              <Input
                type="text"
                value={editTeacher.teacherName}
                onChange={e => setEditTeacher({ ...editTeacher, teacherName: e.target.value })}
                invalid={!!errors.teacherName}
              />
              {errors.teacherName && <FormFeedback>{errors.teacherName}</FormFeedback>}
            </FormGroup>
            <FormGroup>
              <Label>{t("teacherSurname")}</Label>
              <Input
                type="text"
                value={editTeacher.teacherSurname}
                onChange={e => setEditTeacher({ ...editTeacher, teacherSurname: e.target.value })}
                invalid={!!errors.teacherSurname}
              />
              {errors.teacherSurname && <FormFeedback>{errors.teacherSurname}</FormFeedback>}
            </FormGroup>
            <FormGroup>
              <Label>{t("teacherContact")}</Label>
              <Input
                type="text"
                value={editTeacher.teacherContact}
                onChange={e => setEditTeacher({ ...editTeacher, teacherContact: e.target.value })}
                invalid={!!errors.teacherContact}
              />
              {errors.teacherContact && <FormFeedback>{errors.teacherContact}</FormFeedback>}
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter style={{ padding: '15px 25px' }}>
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
