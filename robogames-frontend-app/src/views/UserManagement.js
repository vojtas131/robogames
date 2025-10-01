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
  Label,
  Input,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem
} from "reactstrap";
import { useUser } from "contexts/UserContext";
import { t } from "translations/translate";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [editModal, setEditModal] = useState(false);
  const [addModal, setAddModal] = useState(false);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchedUser, setSearchedUser] = useState(null);

  const { token, tokenExpired } = useUser();
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

  const handleAddUser = async () => {
    if (!Object.values(newUser).every(value => value)) {
      alert(t("fillAll"));
      return;
    }
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/user/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });
      if (tokenExpired(response.status)) { return; }

      if (response.ok) {
        alert(t("userCreated"));
        setAddModal(false);
        window.location.reload();
      } else {
        const result = await response.json();
        throw new Error(result.message || t("userCreateFail"));
      }
    } catch (error) {
      alert(error.message);
    }
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

        if (response.ok) {
          alert(t("roleAddedRemoved", { action: action === 'add' ? t("added_lower") : t("removed_lower") }));
          setEditModal(false);
          window.location.reload();
        } else {
          throw new Error(t("roleUpdateFail"));
        }
      } catch (error) {
        alert(error.message);
      }
    } else {
      alert(t("selectRoleFirst"));
    }
  };

  const handleRemoveUser = async (userId) => {
    if (window.confirm(t("userRemove"))) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/user/remove?id=${userId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tokenExpired(response.status)) { return; }

        if (response.ok) {
          alert(t("userRemoved"));
          //window.location.reload();
        } else {
          throw new Error(t("userRemoveFail"));
        }
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const handleSearch = async () => {
    const endpoint = searchTerm.includes('@') ? `getByEmail?email=${searchTerm}` : `getByID?id=${searchTerm}`;
    const response = await fetch(`${process.env.REACT_APP_API_URL}api/user/${endpoint}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (tokenExpired(response.status)) { return; }

    const result = await response.json();
    if (response.ok) {
      setSearchedUser(result.data); // Assuming the first result is what we need
    } else {
      alert(t("userNotFound"));
      setSearchedUser(null);
    }
  };

  return (
    <div className="content">
      <Row>
        <Col md="12">
          <Card>
            <CardHeader>
              <h4 className="card-title">{t("manageUser")}</h4>
              {isAdminOrLeader && (
                <Button color="success" onClick={() => setAddModal(true)}>{t("userAdd")}</Button>
              )}
              {isAdminOrLeader && (
                <div className="search-section">
                  <Input
                    type="text"
                    placeholder={t("userSearch")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: 'auto', display: 'inline-block', marginRight: '10px' }}
                  />
                  <Button color="info" onClick={handleSearch}>{t("search")}</Button>
                </div>
              )}
              {searchedUser && (
                <Table responsive>
                  <thead className="text-primary">
                    <tr>
                      <th>{t("id")}</th>
                      <th>{t("uuid")}</th>
                      <th>{t("name")}</th>
                      <th>{t("surname")}</th>
                      <th>{t("mail")}</th>
                      <th>{t("birthDate")}</th>
                      <th>{t("teamID")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{searchedUser.id}</td>
                      <td>{searchedUser.uuid}</td>
                      <td>{searchedUser.name}</td>
                      <td>{searchedUser.surname}</td>
                      <td>{searchedUser.email}</td>
                      <td>{searchedUser.birthDate}</td>
                      <td>{searchedUser.teamID}</td>
                    </tr>
                  </tbody>
                </Table>
              )}
            </CardHeader>

            <CardBody>
              <Table responsive>
                <thead className="text-primary">
                  <tr>
                    <th>{t("id")}</th>
                    <th>{t("uuid")}</th>
                    <th>{t("name")}</th>
                    <th>{t("surname")}</th>
                    <th>{t("mail")}</th>
                    <th>{t("birthDate")}</th>
                    <th>{t("role")}</th>
                    <th>{t("teamID")}</th>
                    <th>{t("action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={index}>
                      <td>{user.id}</td>
                      <td>{user.uuid}</td>
                      <td>{user.name}</td>
                      <td>{user.surname}</td>
                      <td>{user.email}</td>
                      <td>{user.birthDate}</td>
                      <td>
                        {user.roles.map(role => role.name).join(', ')}
                        {isAdminOrLeader && !user.roles.some(role => role.name === 'ADMIN') && (
                          <Button color="primary" size="sm" onClick={() => handleEdit(user)} style={{ marginLeft: '10px' }}>
                            {t("roleEdit")}
                          </Button>
                        )}
                      </td>
                      <td>{user.teamID}</td>
                      <td>
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
      <Modal isOpen={addModal} toggle={() => setAddModal(false)}>
        <ModalHeader toggle={() => setAddModal(false)}>{t("userAddNew")}</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="name">{t("name")}</Label>
              <Input style={{ color: 'black' }} type="text" name="name" id="name" placeholder={t("enterName")} value={newUser.name} onChange={handleInputChange} />
            </FormGroup>
            <FormGroup>
              <Label for="surname">{t("surname")}</Label>
              <Input style={{ color: 'black' }} type="text" name="surname" id="surname" placeholder={t("enterSurname")} value={newUser.surname} onChange={handleInputChange} />
            </FormGroup>
            <FormGroup>
              <Label for="email">{t("mail")}</Label>
              <Input style={{ color: 'black' }} type="email" name="email" id="email" placeholder={t("enterMail")} value={newUser.email} onChange={handleInputChange} />
            </FormGroup>
            <FormGroup>
              <Label for="password">{t("password")}</Label>
              <Input style={{ color: 'black' }} type="password" name="password" id="password" placeholder={t("passwordEnter")} value={newUser.password} onChange={handleInputChange} />
            </FormGroup>
            <FormGroup>
              <Label for="birthDate">{t("birthDate")}</Label>
              <Input style={{ color: 'black' }} type="date" name="birthDate" id="birthDate" value={newUser.birthDate} onChange={handleInputChange} />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button style={{ margin: '10px' }} color="primary" onClick={handleAddUser}>{t("add")}</Button>
          <Button style={{ margin: '10px' }} color="secondary" onClick={() => setAddModal(false)}>{t("cancel")}</Button>
        </ModalFooter>
      </Modal>

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
    </div>
  );
}

export default UserManagement;