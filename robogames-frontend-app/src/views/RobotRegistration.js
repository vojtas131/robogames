import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  CardText,
  Row,
  Col,
  Alert,
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
  DropdownItem,
  CardFooter,
  Badge
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { useToast } from "contexts/ToastContext";
import { t } from "translations/translate";
import { validateTitle } from "./MyTeam";

function RobotRegistration() {
  const navigate = useNavigate();
  const location = useLocation();
  const [robots, setRobots] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [modal, setModal] = useState(false);
  const [robotName, setRobotName] = useState('');
  const [creationError, setCreationError] = useState('');

  const [editMode, setEditMode] = useState(false);
  const [renameRobotId, setRenameRobotId] = useState(null);


  const searchParams = new URLSearchParams(location.search);
  const year = searchParams.get('year');

  const { token, tokenExpired } = useUser();
  const toast = useToast();

  useEffect(() => {
    fetchRobots();
    fetchDisciplines();
  }, [year]);  // Ensure year is captured from the URL to filter robots accordingly

  async function fetchRobots() {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/robot/all?year=${year}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });
      if (tokenExpired(response.status)) { return; }

      const data = await response.json();
      if (response.ok) {
        setRobots(data.data.map(robot => ({ ...robot, dropdownOpen: false })));
      } else {
        setErrorMessage(t("robotFetchFail", { message: data.message || t("unknownError") }));
      }
    } catch (error) {
      setErrorMessage(t("serverCommError"));
    }
    setIsLoading(false);
  }

  async function fetchDisciplines() {
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
      if (response.ok) {
        setDisciplines(data.data);
      } else {
        console.error('Failed to fetch disciplines');
      }
    } catch (error) {
      console.error('Error fetching disciplines:', error);
    }
  }

  function toggleDropdown(id) {
    setRobots(robots.map(robot => robot.id === id ? { ...robot, dropdownOpen: !robot.dropdownOpen } : robot));
  }

  async function handleSelectDiscipline(robotId, disciplineId, disciplineName) {
    const response = await fetch(`${process.env.REACT_APP_API_URL}api/robot/register?robotID=${robotId}&disciplineID=${disciplineId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }
    });
    if (tokenExpired(response.status)) { return; }

    const data = await response.json(); // Always parse the JSON to access the response data
    if (response.ok) {
      if (data.type === "RESPONSE" && data.data === "success") {
        setRobots(robots.map(robot => {
          if (robot.id === robotId) {
            return { ...robot, disciplineName, disciplineId, dropdownOpen: false };
          }
          return robot;
        }));
        toast.success(t("robotRegSuccess"));
        window.location.reload();
      } else if (data.type === "ERROR") {
        if (data.data === "failure, you have exceeded the maximum limit of registered robots per discipline") {
          toast.error(t("robotRegMax"));
        } else {
          toast.error(t("dataError", { data: data.data })); // Handle other error messages
        }
      }
    } else {
      toast.error(t("robotRegFail", { message: data.message || t("unknownError") }));
    }
  }

  async function handleRemoveRobot(year, robotId) {
    if (!robotId || !year) {
      toast.error(t("robotMissing"));
      return;
    }

    // Use window.confirm to prompt the user for confirmation
    if (window.confirm(t("robotRemoveCheck"))) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/robot/remove?year=${year}&id=${robotId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (tokenExpired(response.status)) { return; }

        const data = await response.json();  // Parse the JSON response from the server
        if (response.ok) {
          toast.success(t("robotRemoved"));
          fetchRobots();  // Refresh the robot list after successful deletion
        } else {
          // Handle specific error messages from the server
          if (data.type === "ERROR") {
            toast.error(t("robotRemoveError", { data: data.data }));  // Show server error message
          } else {
            toast.error(t("robotRemoveFail", { text: response.statusText }));  // Generic error if no specific error is provided
          }
        }
      } catch (error) {
        console.error('Error while removing robot:', error);
        toast.error(t("robotRemoveError", { data: error.message || t("serverCommFail") }));
      }
    }
  }

  async function handleUnregisterDiscipline(robotId) {
    const response = await fetch(`${process.env.REACT_APP_API_URL}api/robot/unregister?id=${robotId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }
    });
    if (tokenExpired(response.status)) { return; }

    if (response.ok) {
      setRobots(robots.map(robot => robot.id === robotId ? { ...robot, disciplineName: '', disciplineID: -1 } : robot));
    } else {
      toast.error(t("robotUnregisterFail"));
    }
  }

  function toggleModal() {
    setModal(!modal);
  }

  async function handleAddRobot() {
    if (!robotName) {
      toast.warning(t("robotFillName"));
      return;
    }

    var titleCheck = validateTitle(robotName);
    if (!titleCheck) {
      setCreationError(t("invalidTitle"));
      return;
    } else if (titleCheck === "too short") {
      setCreationError(t("shortTitle"));
      return;
    } else if (titleCheck === "too long") {
      setCreationError(t("longTitle"));
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/robot/create?year=${year}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: robotName })
      });
      if (tokenExpired(response.status)) { return; }

      const data = await response.json();  // Parse the JSON response from the server
      if (response.ok && data.type !== "ERROR") {
        toggleModal();
        setRobotName('');
        setCreationError('')
        fetchRobots();  // Refresh the list
      } else {
        // Check for specific error message regarding robot name duplication
        if (data.type === "ERROR" && data.data.includes("already exists")) {
          setCreationError(t("robotExists"));  // Show specific error message
        } else {
          toast.error(t("robotAddFail", { data: data.data || response.statusText }));  // Fallback error message
        }
      }
    } catch (error) {
      toast.error(t("dataError", { data: error.message || t("serverCommFail") }));
    }
  }

  const handleRenameRobot = async (year, robotId, newName) => {
    var titleCheck = validateTitle(newName);
    if (!titleCheck) {
      setCreationError(t("invalidTitle"));
      return;
    } else if (titleCheck === "too short") {
      setCreationError(t("shortTitle"));
      return;
    } else if (titleCheck === "too long") {
      setCreationError(t("longTitle"));
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/robot/rename?year=${year}&id=${robotId}&name=${newName}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (tokenExpired(response.status)) { return; }

      if (!response.ok) throw new Error(t("robotRenameFail"));

      const data = await response.json();
      if (data.type !== "ERROR") {
        console.log('Uložení se podařilo:', data);
        toggleModal();
        setRobotName('');
        setCreationError('')
        window.location.reload();
      } else if (data.type === "ERROR" && data.data.includes("already exists")) {
        setCreationError(t("robotExists"));  // Robot name is already in database
      } else {
        console.log('Chyba při ukládání dat:', data);
        toast.error(t("dataError", { data: data.data }));
      }
    } catch (error) {
      console.error('Update selhal:', error);
      toast.error(t("dataSaveFail"));
    }
  }

  return (
    <div className="content">
      <Row>
        <Col xs="12">
          <Card>
            <CardHeader className="pb-2">
              <Row className="align-items-center">
                <Col>
                  <Button 
                    color="link" 
                    className="p-0 mr-3" 
                    onClick={() => navigate('/admin/competition-registration')}
                    style={{ fontSize: '1.2rem' }}
                  >
                    <i className="tim-icons icon-minimal-left" />
                  </Button>
                  <CardTitle tag="h2" className="d-inline mb-0">
                    <i className="tim-icons icon-spaceship mr-2" style={{ color: '#5e72e4' }} />
                    {t("robotYearOverview", { year: year })}
                  </CardTitle>
                  <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.9rem' }}>
                    {t("robotManageDesc") || "Spravujte roboty vašeho týmu pro tuto soutěž"}
                  </p>
                </Col>
                <Col xs="auto">
                  <Button 
                    color="primary" 
                    onClick={() => {
                      setEditMode(false);
                      setCreationError('');
                      toggleModal();
                    }}
                  >
                    <i className="tim-icons icon-simple-add mr-2" />
                    {t("robotAdd")}
                  </Button>
                </Col>
              </Row>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <div className="text-center py-5">
                  <i className="tim-icons icon-refresh-02 fa-spin" style={{ fontSize: '2rem' }} />
                  <p className="mt-3 text-muted">{t("loading")}</p>
                </div>
              ) : errorMessage ? (
                <Alert color="warning" className="d-flex align-items-center">
                  <i className="tim-icons icon-alert-circle-exc mr-2" />
                  {errorMessage}
                </Alert>
              ) : robots.length === 0 ? (
                <div className="text-center py-5">
                  <i className="tim-icons icon-spaceship" style={{ fontSize: '3rem', opacity: 0.5 }} />
                  <p className="mt-3 text-muted">{t("noRobots") || "Zatím nemáte žádné roboty"}</p>
                  <Button 
                    color="primary" 
                    onClick={() => {
                      setEditMode(false);
                      setCreationError('');
                      toggleModal();
                    }}
                  >
                    <i className="tim-icons icon-simple-add mr-2" />
                    {t("robotAdd")}
                  </Button>
                </div>
              ) : (
                <Row>
                  {robots.map((robot) => (
                    <Col lg="6" xl="4" key={robot.id}>
                      <Card 
                        className="mb-4" 
                        style={{ 
                          border: robot.confirmed 
                            ? '2px solid #28a745' 
                            : robot.disciplineID && robot.disciplineID > 0 
                              ? '2px solid #ffc107' 
                              : '1px solid rgba(255,255,255,0.1)',
                          transition: 'transform 0.2s'
                        }}
                      >
                        <CardHeader style={{ 
                          background: robot.confirmed 
                            ? 'linear-gradient(135deg, rgba(40,167,69,0.15) 0%, transparent 100%)'
                            : robot.disciplineID && robot.disciplineID > 0
                              ? 'linear-gradient(135deg, rgba(255,193,7,0.15) 0%, transparent 100%)'
                              : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          padding: '15px'
                        }}>
                          <Row className="align-items-center">
                            <Col>
                              <div className="d-flex align-items-center">
                                <div style={{ 
                                  width: '45px', 
                                  height: '45px', 
                                  borderRadius: '10px', 
                                  background: 'rgba(94,114,228,0.2)', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  marginRight: '12px'
                                }}>
                                  <i className="tim-icons icon-spaceship" style={{ color: '#5e72e4', fontSize: '1.2rem' }} />
                                </div>
                                <div>
                                  <h4 className="mb-0" style={{ fontSize: '1.1rem' }}>
                                    {robot.name}
                                    {!robot.confirmed && (
                                      <Button 
                                        color="link" 
                                        className="p-0 ml-2"
                                        onClick={() => {
                                          setEditMode(true);
                                          setRenameRobotId(robot.id);
                                          setRobotName(robot.name);
                                          setCreationError('');
                                          toggleModal();
                                        }}
                                      >
                                        <i className="fa-solid fa-pencil" style={{ fontSize: '0.8rem' }} title={t("rename")} />
                                      </Button>
                                    )}
                                  </h4>
                                  <small className="text-muted">#{robot.number}</small>
                                </div>
                              </div>
                            </Col>
                            <Col xs="auto">
                              {robot.confirmed ? (
                                <Badge color="success" style={{ fontSize: '0.75rem', padding: '6px 10px' }}>
                                  <i className="tim-icons icon-check-2 mr-1" />
                                  {t("confirmed") || "Potvrzeno"}
                                </Badge>
                              ) : robot.disciplineID && robot.disciplineID > 0 ? (
                                <Badge color="warning" style={{ fontSize: '0.75rem', padding: '6px 10px' }}>
                                  <i className="tim-icons icon-time-alarm mr-1" />
                                  {t("pending") || "Čeká"}
                                </Badge>
                              ) : (
                                <Badge color="secondary" style={{ fontSize: '0.75rem', padding: '6px 10px' }}>
                                  <i className="tim-icons icon-settings mr-1" />
                                  {t("setup") || "Nastavit"}
                                </Badge>
                              )}
                            </Col>
                          </Row>
                        </CardHeader>
                        
                        <CardBody style={{ padding: '15px', minHeight: '200px', display: 'flex', flexDirection: 'column' }}>
                          {/* Robot info */}
                          <div className="mb-3" style={{ 
                            background: 'rgba(255,255,255,0.03)', 
                            borderRadius: '8px', 
                            padding: '12px' 
                          }}>
                            <Row>
                              <Col xs="6">
                                <small className="text-muted d-block">{t("category") || "Kategorie"}</small>
                                <strong style={{ fontSize: '0.9rem' }}>
                                  {robot.category === "HIGH_AGE_CATEGORY" ? t("students") : t("pupils")}
                                </strong>
                              </Col>
                              <Col xs="6">
                                <small className="text-muted d-block">{t("verification") || "Ověření"}</small>
                                <strong style={{ fontSize: '0.9rem' }} className={robot.confirmed ? 'text-success' : 'text-warning'}>
                                  {robot.confirmed ? t("yes") : t("no")}
                                </strong>
                              </Col>
                            </Row>
                          </div>

                          {/* Discipline section */}
                          <div className="mb-3" style={{ flexGrow: 1 }}>
                            <small className="text-muted d-block mb-2">{t("discipline") || "Disciplína"}</small>
                            {robot.disciplineID && robot.disciplineID > 0 ? (
                              <div style={{ 
                                background: 'rgba(255,193,7,0.1)', 
                                border: '1px solid rgba(255,193,7,0.3)',
                                borderRadius: '8px', 
                                padding: '10px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}>
                                <span style={{ color: '#ffc107', fontWeight: 'bold' }}>
                                  <i className="tim-icons icon-trophy mr-2" />
                                  {robot.diciplineName}
                                </span>
                                {!robot.confirmed && (
                                  <Button 
                                    color="link" 
                                    size="sm" 
                                    className="p-0 text-danger"
                                    onClick={() => handleUnregisterDiscipline(robot.id)}
                                    title={t("regCancel")}
                                  >
                                    <i className="tim-icons icon-simple-remove" />
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <Dropdown isOpen={robot.dropdownOpen} toggle={() => toggleDropdown(robot.id)}>
                                <DropdownToggle 
                                  caret 
                                  color="info" 
                                  className="w-100"
                                  style={{ textAlign: 'left' }}
                                >
                                  <i className="tim-icons icon-bullet-list-67 mr-2" />
                                  {t("robotRegister") || "Vybrat disciplínu"}
                                </DropdownToggle>
                                <DropdownMenu style={{ width: '100%' }}>
                                  {disciplines.map(d => (
                                    <DropdownItem 
                                      key={d.id} 
                                      onClick={() => handleSelectDiscipline(robot.id, d.id, d.name)}
                                    >
                                      {d.name}
                                    </DropdownItem>
                                  ))}
                                </DropdownMenu>
                              </Dropdown>
                            )}
                          </div>

                          {/* Warning for registered but not confirmed */}
                          {robot.disciplineID && robot.disciplineID > 0 && !robot.confirmed && (
                            <Alert color="warning" className="mb-3 py-2 px-3" style={{ fontSize: '0.85rem' }}>
                              <i className="tim-icons icon-alert-circle-exc mr-2" />
                              {t("robotRegistered")}
                            </Alert>
                          )}
                        </CardBody>

                        <CardFooter style={{ 
                          borderTop: '1px solid rgba(255,255,255,0.1)', 
                          padding: '12px 15px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <Button
                            color="info"
                            size="sm"
                            onClick={() => navigate(`/admin/robot-profile?id=${robot.id}`)}
                          >
                            <i className="tim-icons icon-badge mr-1" />
                            {t("profile")}
                          </Button>
                          
                          {!robot.confirmed && (
                            <Button 
                              color="danger" 
                              size="sm"
                              className="btn-icon"
                              onClick={() => handleRemoveRobot(year, robot.id)}
                              title={t("delete") || "Smazat"}
                            >
                              <i className="tim-icons icon-trash-simple" />
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
      <Modal isOpen={modal} toggle={toggleModal}>
        <ModalHeader toggle={toggleModal}> {editMode ? t("robotRename") : t("robotAdd")} </ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="robotName"> {editMode ? t("newTitle") : t("robotName")} </Label>
              <Input type="text" name="name" id="robotName" placeholder={t("robotEnterName")}
                value={robotName} onChange={(e) => setRobotName(e.target.value)} style={{ color: 'black' }}
              />
            </FormGroup>
            {creationError && <p className="text-danger">{creationError}</p>}
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" style={{ margin: '10px' }}
            onClick={() => {
              if (editMode) {
                handleRenameRobot(year, renameRobotId, robotName);
              } else {
                handleAddRobot();
              }
            }}
          > {t("save")} </Button>
          <Button color="secondary" onClick={toggleModal} style={{ margin: '10px' }}> {t("cancel")} </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default RobotRegistration;