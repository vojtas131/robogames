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
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem
} from "reactstrap";
import { useUser } from "contexts/UserContext";
import { useToast } from "contexts/ToastContext";
import { useConfirm } from "components/ConfirmModal";
import { validateName, validateBirth } from "./Register";
import { t } from "translations/translate";
import UserSearchSelect from "components/UserSearchSelect/UserSearchSelect";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [editModal, setEditModal] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [userEditModal, setUserEditModal] = useState(false);
  const [emailExportModal, setEmailExportModal] = useState(false);
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
  const [selectedSearchUser, setSelectedSearchUser] = useState(null);
  const [errors, setErrors] = useState({});

  const { token, tokenExpired } = useUser();
  const toast = useToast();
  const { confirm } = useConfirm();
  const roles = ['ADMIN', 'COMPETITOR', 'REFEREE', 'ASSISTANT', 'LEADER'];

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

        const res = await fetch(`${process.env.REACT_APP_API_URL}api/user/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        if (res.ok) {
          setUsers(result.data);
        } else {
          console.error('Failed to fetch users:', result.message);
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

  // const handleAddUser = async () => {
  //   let newErrors = { ...errors };

  //   var nameCheck = validateName(newUser.name);
  //   if (!nameCheck) {
  //     newErrors.name = t("invalidName");
  //   } else if (nameCheck === "too short") {
  //     newErrors.name = t("shortName");
  //   } else if (nameCheck === "too long") {
  //     newErrors.name = t("longName");
  //   } else {
  //     delete newErrors.name;
  //   }

  //   var surnameCheck = validateName(newUser.surname);
  //   if (!surnameCheck) {
  //     newErrors.surname = t("invalidSurname");
  //   } else if (surnameCheck === "too short") {
  //     newErrors.surname = t("shortSurname");
  //   } else if (surnameCheck === "too long") {
  //     newErrors.surname = t("longSurname");
  //   } else {
  //     delete newErrors.surname;
  //   }

  //   var emailCheck = validateEmail(newUser.email);
  //   if (!emailCheck) {
  //     newErrors.email = t("mailInvalid");
  //   } else if (emailCheck === "too short") {
  //     newErrors.email = t("shortMail");
  //   } else if (emailCheck === "too long") {
  //     newErrors.email = t("longMail");
  //   } else {
  //     delete newErrors.email;
  //   }

  //   if (newUser.password.length < 8) {
  //     newErrors.password = t("shortPassword");
  //   } else if (newUser.password.length > 30) {
  //     newErrors.password = t("longPassword");
  //   } else {
  //     delete newErrors.password;
  //   }

  //   const birthCheck = validateBirth(newUser.birthDate);
  //   if (!birthCheck) {
  //     newErrors.birthDate = t("invalidAge");
  //   } else if (birthCheck === 'younger') {
  //     newErrors.birthDate = t("tooYoung", { age: minAge });
  //   } else if (birthCheck === 'older') {
  //     newErrors.birthDate = t("tooOld", { age: maxAge });
  //   } else {
  //     delete newErrors.birthDate;
  //   }

  //   setErrors(newErrors);

  //   if (!errors.name && !errors.surname && !errors.email && !errors.password && !errors.birthDate && newUser.email && newUser.password && newUser.name && newUser.surname && newUser.birthDate) {
  //     if (!Object.values(newUser).every(value => value)) {
  //       alert(t("fillAll"));
  //       return;
  //     }

  //     try {
  //       const response = await fetch(`${process.env.REACT_APP_API_URL}api/user/add`, {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //           'Authorization': `Bearer ${token}`
  //         },
  //         body: JSON.stringify(newUser)
  //       });
  //       if (tokenExpired(response.status)) { return; }

  //       if (response.ok) {
  //         alert(t("userCreated"));
  //         setAddModal(false);
  //         window.location.reload();
  //       } else {
  //         const result = await response.json();
  //         throw new Error(result.message || t("userCreateFail"));
  //       }
  //     } catch (error) {
  //       alert(error.message);
  //     }
  //   } else {
  //     alert(t("regMistakes"));
  //   }
  // };

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

        if (response.ok) {
          toast.success(t("roleAddedRemoved", { action: action === 'add' ? t("added_lower") : t("removed_lower") }));
          setEditModal(false);
          window.location.reload();
        } else {
          throw new Error(t("roleUpdateFail"));
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

        if (response.ok) {
          toast.success(t("userRemoved"));
          window.location.reload();
        } else {
          throw new Error(t("userRemoveFail"));
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

  // Get all emails from users
  const getAllEmails = () => {
    return users.map(user => user.email).filter(email => email);
  };

  // Export emails to CSV
  const exportEmailsToCSV = () => {
    const emails = getAllEmails();
    const csvContent = "email\n" + emails.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `emails_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy emails to clipboard
  const copyEmailsToClipboard = () => {
    const emails = getAllEmails();
    navigator.clipboard.writeText(emails.join('\n')).then(() => {
      toast.success(t("emailsCopied") || "Emaily byly zkopírovány do schránky");
    }).catch(() => {
      toast.error(t("emailsCopyFail") || "Nepodařilo se zkopírovat emaily");
    });
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
            name: currentUser.name,
            surname: currentUser.surname,
            birthDate: currentUser.birthDate,
          }),
        }
      );

      if (tokenExpired(response.status)) return;

      if (!response.ok) throw new Error(t("userUpdateFail"));

      const result = await response.json();
      if (result.data === "success") {
        toast.success(t("dataSaved"));
        setEditModal(false);
        window.location.reload();
      } else {
        toast.error(t("userUpdateFail"));
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h4 className="card-title" style={{ margin: 0 }}>{t("manageUser")}</h4>
                {isAdminOrLeader && (
                  <Button color="info" size="sm" onClick={() => setEmailExportModal(true)}>
                    <i className="tim-icons icon-email-85" style={{ marginRight: '6px' }} />
                    {t("exportEmails") || "Export emailů"}
                  </Button>
                )}
              </div>
              {isAdminOrLeader && (
                <div className="search-section" style={{ marginBottom: '20px' }}>
                  <Label>{t("userSearch")}</Label>
                  <UserSearchSelect
                    onSelect={setSelectedSearchUser}
                    selectedUser={selectedSearchUser}
                    placeholder={t("searchUserPlaceholder")}
                    showTeamInfo={true}
                  />
                </div>
              )}
              {selectedSearchUser && (
                <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                  <h5>{t("selectedUser")}</h5>
                  <Table responsive>
                    <thead className="text-primary">
                      <tr>
                        <th>{t("name")}</th>
                        <th>{t("surname")}</th>
                        <th>{t("mail")}</th>
                        <th>{t("birthDate")}</th>
                        <th>{t("teamID")}</th>
                        <th>{t("action")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{selectedSearchUser.name}</td>
                        <td>{selectedSearchUser.surname}</td>
                        <td>{selectedSearchUser.email}</td>
                        <td>{selectedSearchUser.birthDate}</td>
                        <td>{selectedSearchUser.teamID}</td>
                        <td>
                          <Button color="primary" size="sm" onClick={() => handleEdit(selectedSearchUser)} style={{ marginRight: '5px' }}>
                            {t("roleEdit")}
                          </Button>
                          <Button color="secondary" size="sm" onClick={() => handleUserEdit(selectedSearchUser)} style={{ marginRight: '5px' }}>
                            <i className="fa-solid fa-pencil"></i>
                          </Button>
                          <Button color="danger" size="sm" onClick={() => handleRemoveUser(selectedSearchUser.id)}>
                            <i className="tim-icons icon-trash-simple"></i>
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                  <Button color="link" size="sm" onClick={() => setSelectedSearchUser(null)}>{t("clearSelection")}</Button>
                </div>
              )}
            </CardHeader>

            <CardBody>
              <Table responsive>
                <thead className="text-primary">
                  <tr>
                    {/* <th>{t("id")}</th>
                    <th>{t("uuid")}</th> */}
                    <th>{t("name")}</th>
                    <th>{t("surname")}</th>
                    <th>{t("mail")}</th>
                    <th>{t("birthDate")}</th>
                    <th>{t("role")}</th>
                    <th>{t("teamID")}</th>
                    <th style={{ textAlign: 'center' }}>{t("action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={index}>
                      {/* <td>{user.id}</td>
                      <td>{user.uuid}</td> */}
                      <td>{user.name}</td>
                      <td>{user.surname}</td>
                      <td>{user.email}</td>
                      <td>{user.birthDate}</td>
                      <td>
                        {user.roles.map(role => role.name).join(', ')}
                        {isAdminOrLeader && (
                          <Button color="primary" size="sm" onClick={() => handleEdit(user)} style={{ marginLeft: '10px' }}>
                            {t("roleEdit")}
                          </Button>
                        )}
                      </td>
                      <td>{user.teamID}</td>
                      <td>
                        {isAdminOrLeader && (
                          <Button color="secondary" size="sm" onClick={() => handleUserEdit(user)} style={{ marginLeft: '10px' }}>
                            <i className="fa-solid fa-pencil"></i>
                          </Button>
                        )}
                        {isAdminOrLeader && (
                          <Button color="danger" size="sm" onClick={() => handleRemoveUser(user.id)} style={{ marginLeft: '10px' }}>
                            <i className="tim-icons icon-trash-simple"></i>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
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
                  {role}
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

      {/* Email Export Modal */}
      <Modal isOpen={emailExportModal} toggle={() => setEmailExportModal(false)} size="lg">
        <ModalHeader toggle={() => setEmailExportModal(false)}>
          <i className="tim-icons icon-email-85" style={{ marginRight: '8px' }} />
          {t("exportEmails") || "Export emailů"}
        </ModalHeader>
        <ModalBody style={{ padding: '20px 25px' }}>
          <div style={{ marginBottom: '15px' }}>
            <strong>{t("totalEmails") || "Celkem emailů"}:</strong> {getAllEmails().length}
          </div>
          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto', 
            backgroundColor: 'rgba(0,0,0,0.1)', 
            padding: '15px', 
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '13px'
          }}>
            {getAllEmails().map((email, index) => (
              <div key={index} style={{ padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                {email}
              </div>
            ))}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="success" onClick={exportEmailsToCSV} style={{ margin: '5px' }}>
            <i className="tim-icons icon-cloud-download-93" style={{ marginRight: '6px' }} />
            {t("downloadCSV") || "Stáhnout CSV"}
          </Button>
          <Button color="info" onClick={copyEmailsToClipboard} style={{ margin: '5px' }}>
            <i className="tim-icons icon-single-copy-04" style={{ marginRight: '6px' }} />
            {t("copyToClipboard") || "Kopírovat do schránky"}
          </Button>
          <Button color="secondary" onClick={() => setEmailExportModal(false)} style={{ margin: '5px' }}>
            {t("close")}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default UserManagement;