import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
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
  FormFeedback,
  Label,
  Input,
  InputGroup,
  InputGroupText,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem
} from "reactstrap";
import { useUser, validateName, validateBirth } from "contexts/UserContext";
import { useToast } from "contexts/ToastContext";
import { useConfirm } from "components/ConfirmModal";
import { t } from "translations/translate";
import TablePagination from "components/TablePagination";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [editModal, setEditModal] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [userEditModal, setUserEditModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [newUser, setNewUser] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    birthDate: ''
  });
  const [isAdminOrLeader, setIsAdminOrLeader] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [errors, setErrors] = useState({});

  // Super Admin IDs - list of user IDs that are super admins
  const [superAdminIds, setSuperAdminIds] = useState([]);

  // Search/Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all'); // 'all', 'id', 'name', 'surname', 'fullname', 'email'
  const [filterRole, setFilterRole] = useState(''); // '' = all roles

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Retrieve user roles
  const rolesString = localStorage.getItem('roles');
  const rolesArray = rolesString ? rolesString.split(', ') : [];
  const isAdmin = rolesArray.some(role => ['ADMIN'].includes(role));

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchType, filterRole]);

  const { token, tokenExpired } = useUser();
  const toast = useToast();
  const { confirm } = useConfirm();
  const roles = ['ADMIN', 'COMPETITOR', 'REFEREE', 'ASSISTANT', 'LEADER'];

  // Získání názvu týmu podle ID
  const getTeamName = (teamId) => {
    if (!teamId) return '-';
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : `#${teamId}`;
  };

  // Překlad role na základě jejího jména
  const getRoleTranslation = (roleName) => {
    switch (roleName) {
      case 'ADMIN': return t('adminRole');
      case 'LEADER': return t('leaderRole');
      case 'REFEREE': return t('refereeRole');
      case 'ASSISTANT': return t('assistantRole');
      case 'COMPETITOR': return t('competitorRole');
      default: return roleName;
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const userRes = await fetch(`${process.env.REACT_APP_API_URL}api/user/info`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tokenExpired(userRes.status)) { return; }

        const userData = await userRes.json();
        if (userRes.ok && userData.data.roles.some(role => ['ADMIN', 'LEADER'].includes(role.name))) {
          setIsAdminOrLeader(true);
        }
        if (userRes.ok && userData.data.id) {
          setCurrentUserId(userData.data.id);
        }

        const res = await fetch(`${process.env.REACT_APP_API_URL}api/user/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        if (res.ok) {
          setUsers(result.data);
        } else {
          console.error('Failed to fetch users:', result.message);
        }

        // Fetch all teams for displaying team names
        const teamsRes = await fetch(`${process.env.REACT_APP_API_URL}api/team/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          if (teamsData.data) {
            setTeams(teamsData.data);
          }
        }

        // Fetch super admin IDs
        const superAdminRes = await fetch(`${process.env.REACT_APP_API_URL}api/user/superAdmins`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (superAdminRes.ok) {
          const superAdminData = await superAdminRes.json();
          if (superAdminData.type === 'RESPONSE' && Array.isArray(superAdminData.data)) {
            setSuperAdminIds(superAdminData.data);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
    fetchData();
  }, []);

  const handleEdit = (user) => {
    setCurrentUser(user);
    setEditModal(true);
    setDropdownOpen(false);
    setNewRole('');
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const submitRoleChange = async (action) => {
    if (newRole && currentUser) {
      const apiPath = action === 'add' ? 'addRole' : 'removeRole';
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/user/${apiPath}?role=${newRole}&id=${currentUser.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (tokenExpired(response.status)) { return; }

        const result = await response.json();
        if (response.ok && result.type !== 'ERROR') {
          toast.success(t("roleAddedRemoved", { action: action === 'add' ? t("added_lower") : t("removed_lower") }));
          setEditModal(false);
          window.location.reload();
        } else {
          throw new Error(result.data || t("roleUpdateFail"));
        }
      } catch (error) {
        toast.error(error.message);
      }
    } else {
      toast.warning(t("selectRoleFirst"));
    }
  };

  const handleRemoveUser = async (userId) => {
    if (await confirm({ message: t("userRemove") })) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/user/remove?id=${userId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tokenExpired(response.status)) { return; }

        const result = await response.json();
        if (response.ok && result.type !== 'ERROR') {
          toast.success(t("userRemoved"));
          window.location.reload();
        } else {
          throw new Error(result.data || t("userRemoveFail"));
        }
      } catch (error) {
        toast.error(error.message);
      }
    }
  };

  // Ban user
  const handleBanUser = async (userId) => {
    // Prevent self-ban
    if (userId === currentUserId) {
      toast.warning(t("cannotBanSelf"));
      return;
    }
    if (await confirm({ message: t("banUserConfirm") })) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/admin/user/ban?id=${userId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (tokenExpired(response.status)) { return; }

        const result = await response.json();
        if (response.ok && result.type !== 'ERROR') {
          toast.success(t("userBannedSuccess"));
          window.location.reload();
        } else {
          throw new Error(result.data || t("banUserFail"));
        }
      } catch (error) {
        toast.error(error.message);
      }
    }
  };

  // Unban user
  const handleUnbanUser = async (userId) => {
    if (await confirm({ message: t("unbanUserConfirm") })) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/admin/user/unban?id=${userId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (tokenExpired(response.status)) { return; }

        const result = await response.json();
        if (response.ok && result.type !== 'ERROR') {
          toast.success(t("userUnbannedSuccess"));
          window.location.reload();
        } else {
          throw new Error(result.data || t("unbanUserFail"));
        }
      } catch (error) {
        toast.error(error.message);
      }
    }
  };

  // validate new data
  const handleChange = (e) => {
    const { name, value } = e.target;
    let newErrors = { ...errors };
    let updatedUser = { ...currentUser, [name]: value };

    if (name === 'name') {
      const nameCheck = validateName(value);
      if (!nameCheck) newErrors.name = t("invalidName");
      else if (nameCheck === "too short") newErrors.name = t("shortName");
      else if (nameCheck === "too long") newErrors.name = t("longName");
      else delete newErrors.name;
    }

    if (name === 'surname') {
      const surnameCheck = validateName(value);
      if (!surnameCheck) newErrors.surname = t("invalidSurname");
      else if (surnameCheck === "too short") newErrors.surname = t("shortSurname");
      else if (surnameCheck === "too long") newErrors.surname = t("longSurname");
      else delete newErrors.surname;
    }

    if (name === 'birthDate') {
      const val = validateBirth(value);
      if (!val) newErrors.birthDate = t("invalidAge");
      else if (val === "younger") newErrors.birthDate = t("tooYoung", { age: process.env.REACT_APP_MIN_AGE });
      else if (val === "older") newErrors.birthDate = t("tooOld", { age: process.env.REACT_APP_MAX_AGE });
      else delete newErrors.birthDate;
    }

    setErrors(newErrors);
    setCurrentUser(updatedUser);
  };

  const handleUserEdit = (user) => {
    setCurrentUser(user);
    setUserEditModal(true);
    setDropdownOpen(false);
  };

  // edit user info by admin
  const handleUserEditSubmit = async (e) => {
    e.preventDefault();

    if (errors.name || errors.surname || errors.birthDate) {
      toast.warning(t("regMistakes"));
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}api/user/editById?id=${currentUser.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: currentUser.name.trim(),
            surname: currentUser.surname.trim(),
            birthDate: currentUser.birthDate,
          }),
        }
      );

      if (tokenExpired(response.status)) return;

      const result = await response.json();
      if (response.ok && result.type !== 'ERROR') {
        toast.success(t("dataSaved"));
        setEditModal(false);
        window.location.reload();
      } else {
        toast.error(result.data || t("userUpdateFail"));
      }
    } catch (error) {
      console.error('Update selhal:', error);
      toast.error(t("dataSaveFail"));
    }
  };

  return (
    <div className="content">
      <Row>
        <Col md="12">
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
                <h4 className="card-title" style={{ margin: 0 }}>{t("manageUser")}</h4>
              </div>
              {isAdminOrLeader && (
                <Row className="mb-2">
                  <Col md="2">
                    <Input
                      type="select"
                      value={searchType}
                      onChange={(e) => setSearchType(e.target.value)}
                    >
                      <option value="all">{t('searchAll') || 'Vše'}</option>
                      <option value="id">{t('searchUserById') || 'ID'}</option>
                      <option value="name">{t('searchByName') || 'Jméno'}</option>
                      <option value="surname">{t('searchBySurname') || 'Příjmení'}</option>
                      <option value="fullname">{t('searchByFullname') || 'Jméno + Příjmení'}</option>
                      <option value="email">{t('searchByEmail') || 'Email'}</option>
                    </Input>
                  </Col>
                  <Col md="7">
                    <InputGroup>
                      <InputGroupText>
                        <i className="tim-icons icon-zoom-split" />
                      </InputGroupText>
                      <Input
                        placeholder={
                          searchType === 'id' ? (t('enterId') || 'Zadejte ID...') :
                            searchType === 'name' ? (t('enterName') || 'Zadejte jméno...') :
                              searchType === 'surname' ? (t('enterSurname') || 'Zadejte příjmení...') :
                                searchType === 'fullname' ? (t('enterFullname') || 'Zadejte jméno a příjmení...') :
                                  searchType === 'email' ? (t('enterEmail') || 'Zadejte email...') :
                                    (t('searchUserPlaceholder') || 'Hledat uživatele...')
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
                  <Col md="3">
                    <Input
                      type="select"
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      title={t('filterByRole') || 'Filtrovat podle role'}
                    >
                      <option value="">{t('allRoles') || 'Všechny role'}</option>
                      {roles.map(role => (
                        <option key={role} value={role}>{getRoleTranslation(role)}</option>
                      ))}
                    </Input>
                  </Col>
                </Row>
              )}
            </CardHeader>

            <CardBody>
              <Table responsive>
                <thead className="text-primary">
                  <tr>
                    <th>{t("id")}</th>
                    <th>{t("name")}</th>
                    <th>{t("surname")}</th>
                    <th>{t("mail")}</th>
                    <th>{t("birthDate")}</th>
                    <th>{t("role")}</th>
                    <th>{t("team")}</th>
                    <th>{t("status")}</th>
                    {isAdmin && (
                      <th style={{ textAlign: 'center' }}>{t("action")}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(user => {
                      // Filter by role first
                      if (filterRole && !user.roles?.some(role => role.name === filterRole)) {
                        return false;
                      }

                      const searchLower = searchQuery.toLowerCase();
                      if (!searchQuery) return true;

                      switch (searchType) {
                        case 'id':
                          return user.id.toString().includes(searchQuery);
                        case 'name':
                          return user.name?.toLowerCase().includes(searchLower);
                        case 'surname':
                          return user.surname?.toLowerCase().includes(searchLower);
                        case 'fullname':
                          return `${user.name} ${user.surname}`.toLowerCase().includes(searchLower);
                        case 'email':
                          return user.email?.toLowerCase().includes(searchLower);
                        case 'all':
                        default:
                          return (
                            user.id.toString().includes(searchQuery) ||
                            user.name?.toLowerCase().includes(searchLower) ||
                            user.surname?.toLowerCase().includes(searchLower) ||
                            `${user.name} ${user.surname}`.toLowerCase().includes(searchLower) ||
                            user.email?.toLowerCase().includes(searchLower)
                          );
                      }
                    })
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((user, index) => {
                      const isSuperAdmin = superAdminIds.includes(user.id);
                      return (
                        <tr key={index} style={{
                          ...(user.banned ? { opacity: 0.6, backgroundColor: 'rgba(255,0,0,0.1)' } : {}),
                          ...(isSuperAdmin ? { backgroundColor: 'rgba(255, 215, 0, 0.15)', borderLeft: '4px solid #ffd700' } : {})
                        }}>
                          <td>
                            <div>#{user.id}</div>
                            {isSuperAdmin && (
                              <span
                                style={{
                                  display: 'inline-block',
                                  marginTop: '4px',
                                  backgroundColor: '#ffd700',
                                  color: '#000',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: 'bold'
                                }}
                                title={t("superAdminProtected") || "Tento uživatel je chráněný super admin"}
                              >
                                SUPER ADMIN
                              </span>
                            )}
                          </td>
                          <td>{user.name}</td>
                          <td>{user.surname}</td>
                          <td>{user.email}</td>
                          <td>{user.birthDate}</td>
                          <td>
                            {user.roles.map(role => getRoleTranslation(role.name)).join(', ')}
                          </td>
                          <td>{getTeamName(user.teamID)}</td>
                          <td>
                            {user.banned ? (
                              <span style={{ color: '#f5365c', fontWeight: 'bold' }}>
                                <i className="fa-solid fa-ban" style={{ marginRight: '5px' }}></i>
                                {t("banned")}
                              </span>
                            ) : (
                              <span style={{ color: '#2dce89' }}>
                                <i className="fa-solid fa-check" style={{ marginRight: '5px' }}></i>
                                {t("active")}
                              </span>
                            )}
                          </td>
                          {isAdmin && (
                            <td style={{ textAlign: 'center' }}>
                              {/* Role edit - super admin může editovat sám sebe, ostatní super adminy ne */}
                              {isAdmin && (!isSuperAdmin || (isSuperAdmin && user.id === currentUserId)) && (
                                <Button
                                  color="info"
                                  size="sm"
                                  className="btn-icon"
                                  onClick={() => handleEdit(user)}
                                  title={t("roleEdit")}
                                >
                                  <i className="tim-icons icon-badge" />
                                </Button>
                              )}
                              {/* User data edit - super admin může editovat sám sebe, ostatní super adminy ne */}
                              {isAdmin && (!isSuperAdmin || (isSuperAdmin && user.id === currentUserId)) && (
                                <Button
                                  color="primary"
                                  size="sm"
                                  className="btn-icon ml-1"
                                  onClick={() => handleUserEdit(user)}
                                  title={t("edit")}
                                >
                                  <i className="tim-icons icon-pencil" />
                                </Button>
                              )}
                              {/* Ban - nikdo nemůže zabanovat super admina */}
                              {isAdmin && !isSuperAdmin && !user.banned && (
                                <Button
                                  color="warning"
                                  size="sm"
                                  className="btn-icon ml-1"
                                  onClick={() => handleBanUser(user.id)}
                                  title={t("banUser")}
                                >
                                  <i className="tim-icons icon-lock-circle" />
                                </Button>
                              )}
                              {/* Unban - nikdo nemůže odbanovat super admina (protože nemůže být zabanován) */}
                              {isAdmin && !isSuperAdmin && user.banned && (
                                <Button
                                  color="success"
                                  size="sm"
                                  className="btn-icon ml-1"
                                  onClick={() => handleUnbanUser(user.id)}
                                  title={t("unbanUser")}
                                >
                                  <i className="tim-icons icon-key-25" />
                                </Button>
                              )}
                              {/* Remove - nikdo nemůže smazat super admina */}
                              {isAdmin && !isSuperAdmin && (
                                <Button
                                  color="danger"
                                  size="sm"
                                  className="btn-icon ml-1"
                                  onClick={() => handleRemoveUser(user.id)}
                                  title={t("remove")}
                                >
                                  <i className="tim-icons icon-trash-simple" />
                                </Button>
                              )}
                              {/* Zobrazit "Chráněný" jen pro cizí super adminy, ne pro sebe */}
                              {isSuperAdmin && user.id !== currentUserId && (
                                <span
                                  style={{
                                    color: '#685800',
                                    fontSize: '12px',
                                    fontStyle: 'italic'
                                  }}
                                >
                                  <i className="tim-icons icon-lock-circle" style={{ marginRight: '4px' }} />
                                  {t("protectedUser") || "Chráněný"}
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                </tbody>
              </Table>

              <TablePagination
                currentPage={currentPage}
                totalItems={users.filter(user => {
                  const searchLower = searchQuery.toLowerCase();
                  if (!searchQuery) return true;
                  switch (searchType) {
                    case 'id': return user.id.toString().includes(searchQuery);
                    case 'name': return user.name?.toLowerCase().includes(searchLower);
                    case 'surname': return user.surname?.toLowerCase().includes(searchLower);
                    case 'fullname': return `${user.name} ${user.surname}`.toLowerCase().includes(searchLower);
                    case 'email': return user.email?.toLowerCase().includes(searchLower);
                    case 'role': return user.roles?.some(role => role.name?.toLowerCase().includes(searchLower));
                    default: return (
                      user.id.toString().includes(searchQuery) ||
                      user.name?.toLowerCase().includes(searchLower) ||
                      user.surname?.toLowerCase().includes(searchLower) ||
                      `${user.name} ${user.surname}`.toLowerCase().includes(searchLower) ||
                      user.email?.toLowerCase().includes(searchLower) ||
                      user.roles?.some(role => role.name?.toLowerCase().includes(searchLower))
                    );
                  }
                }).length}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
                onItemsPerPageChange={(items) => { setItemsPerPage(items); setCurrentPage(1); }}
              />
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Modal for adding a new user */}
      {/* <Modal isOpen={addModal} toggle={() => setAddModal(false)}>
        <ModalHeader toggle={() => setAddModal(false)}>{t("userAddNew")}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="name">{t("name")}</Label>
              <Input invalid={!!errors.name} style={{ color: 'black' }} type="text" name="name" id="name" placeholder={t("enterName")} value={newUser.name} onChange={handleInputChange} />
              {errors.name && <FormFeedback>{errors.name}</FormFeedback>}
            </FormGroup>
            <FormGroup>
              <Label for="surname">{t("surname")}</Label>
              <Input invalid={!!errors.surname} style={{ color: 'black' }} type="text" name="surname" id="surname" placeholder={t("enterSurname")} value={newUser.surname} onChange={handleInputChange} />
              {errors.surname && <FormFeedback>{errors.surname}</FormFeedback>}
            </FormGroup>
            <FormGroup>
              <Label for="email">{t("mail")}</Label>
              <Input invalid={!!errors.email} style={{ color: 'black' }} type="email" name="email" id="email" placeholder={t("enterMail")} value={newUser.email} onChange={handleInputChange} />
              {errors.email && <FormFeedback>{errors.email}</FormFeedback>}
            </FormGroup>
            <FormGroup>
              <Label for="password">{t("password")}</Label>
              <Input invalid={!!errors.password} style={{ color: 'black' }} type="password" name="password" id="password" placeholder={t("passwordEnter")} value={newUser.password} onChange={handleInputChange} />
              {errors.password && <FormFeedback>{errors.password}</FormFeedback>}
            </FormGroup>
            <FormGroup>
              <Label for="birthDate">{t("birthDate")}</Label>
              <Input invalid={!!errors.birthDate} style={{ color: 'black' }} type="date" name="birthDate" id="birthDate" value={newUser.birthDate} onChange={handleInputChange} />
              {errors.birthDate && <FormFeedback>{errors.birthDate}</FormFeedback>}
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button style={{ margin: '10px' }} color="primary" onClick={handleAddUser}>{t("add")}</Button>
          <Button style={{ margin: '10px' }} color="secondary" onClick={() => setAddModal(false)}>{t("cancel")}</Button>
        </ModalFooter>
      </Modal> */}

      {/* Modal for editing roles */}
      <Modal isOpen={editModal} toggle={() => setEditModal(false)}>
        <ModalHeader toggle={() => setEditModal(false)}>{t("roleEdit")}</ModalHeader>
        <ModalBody>
          <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
            <DropdownToggle caret>
              {newRole || t("selectRole")}
            </DropdownToggle>
            <DropdownMenu>
              {roles.map(role => (
                <DropdownItem key={role} onClick={() => setNewRole(role)}>
                  {getRoleTranslation(role)}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        </ModalBody>
        <ModalFooter>
          <Button color="success" onClick={() => submitRoleChange('add')} style={{ margin: '10px' }}>{t("roleAdd")}</Button>
          <Button color="danger" onClick={() => submitRoleChange('remove')} style={{ margin: '10px' }}>{t("roleRemove")}</Button>
          <Button color="secondary" onClick={() => setEditModal(false)} style={{ margin: '10px' }}>{t("cancel")}</Button>
        </ModalFooter>
      </Modal>

      {/* modal for editing user info */}
      <Modal isOpen={userEditModal} toggle={() => setUserEditModal(false)}>
        <ModalHeader toggle={() => setUserEditModal(false)}>{t("userEdit")}</ModalHeader>
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

            <FormGroup>
              <Label>{t("birthDate")}</Label>
              <Input
                name="birthDate"
                type="date"
                value={currentUser?.birthDate || ""}
                onChange={handleChange}
                invalid={!!errors.birthDate}
              />
              {errors.birthDate && <FormFeedback>{errors.birthDate}</FormFeedback>}
            </FormGroup>

            <Button color="primary" type="submit">{t("save")}</Button>
            <Button color="secondary" onClick={() => setUserEditModal(false)} style={{ margin: '10px' }}>{t("cancel")}</Button>
          </Form>
        </ModalBody>
      </Modal>
    </div>
  );
}

export default UserManagement;