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
  CardFooter
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
            <CardHeader>
              <CardTitle tag="h2">{t("robotYearOverview", { year: year })}</CardTitle>
              <Button color="primary" onClick={() => {
                setEditMode(false);
                setCreationError('')
                toggleModal();
              }}> {t("robotAdd")} </Button>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <p>{t("loading")}</p>
              ) : errorMessage ? (
                <Alert color="warning">{errorMessage}</Alert>
              ) : robots.map((robot) => (
                <Card key={robot.id} className="mb-3" id='robotCard'>

                  <CardBody>
                    <Row>
                      <Col xs="10">
                        <CardTitle tag="h3" style={{ display: 'inline' }}>{robot.name}</CardTitle>

                        {!robot.confirmed && (
                          <Button className='m-0 pb-3' color="link"
                            onClick={() => {
                              setEditMode(true);
                              setRenameRobotId(robot.id);
                              setRobotName(robot.name);
                              setCreationError('')
                              toggleModal();
                            }}>
                            <i class="fa-solid fa-pencil ml-2"
                              style={{ cursor: 'pointer', fontSize: '0.9rem' }}
                              title={t("rename")}
                            />
                          </Button>
                        )}
                      </Col>
                      <Col xs="2" className="text-right">
                        <Button
                          color="info"
                          size="sm"
                          onClick={() => navigate(`/admin/robot-profile?id=${robot.id}`)}
                          title={t("showProfile")}
                        >
                          <i className="tim-icons icon-badge mb-1" /> {t("profile")}
                        </Button>
                      </Col>
                    </Row>

                    <CardText>
                      <hr></hr>
                      <p>{t("robotNum_colon", { id: robot.number })}</p>
                      {t("robotChecked")}
                      <span className={robot.confirmed ? 'green-text' : 'red-text'}>
                        {robot.confirmed ? t("yes") : t("no")}
                      </span><br />

                      {t("categoryData", { data: robot.category === "HIGH_AGE_CATEGORY" ? t("students") : t("pupils") })}<br />

                      {t("disc_colon")} {robot.disciplineID && robot.disciplineID > 0 ? (
                        <>
                          <span className='yellow-text'>{robot.diciplineName}</span>

                          {!robot.confirmed && (
                            <Alert color='warning' style={{ marginTop: '10px' }}>{t("robotRegistered")}</Alert>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {!robot.confirmed && (
                              <Button color="danger" onClick={() => handleUnregisterDiscipline(robot.id)}>
                                {t("regCancel")}
                              </Button>
                            )}

                            {!robot.confirmed && (
                              <Button color="danger" onClick={() => handleRemoveRobot(year, robot.id)} className="btn-icon btn-simple">
                                <i className="tim-icons icon-trash-simple"></i>
                              </Button>
                            )}
                          </div>
                        </>
                      ) : (
                        <Dropdown isOpen={robot.dropdownOpen} toggle={() => toggleDropdown(robot.id)}>
                          <DropdownToggle caret>
                            {robot.disciplineName || t("robotRegister")}
                          </DropdownToggle>
                          <DropdownMenu>
                            {disciplines.map(d => (
                              <DropdownItem key={d.id} onClick={() => handleSelectDiscipline(robot.id, d.id, d.name)}>
                                {d.name}
                              </DropdownItem>
                            ))}
                          </DropdownMenu>
                        </Dropdown>
                      )}
                    </CardText>
                  </CardBody>
                </Card>
              ))}
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