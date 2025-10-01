import React, { useEffect, useState } from "react";
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
  FormGroup,
  Label,
  Input
} from "reactstrap";
import { useUser } from "contexts/UserContext";
import { t } from "translations/translate";

/**
* Renders the Competition Management component, which allows administrators and leaders to manage competitions.
* This component fetches the list of competitions, provides functionality to create, edit, start, and remove competitions,
* and displays the competition details in a card layout.
*/
function CompetitionManagement() {
  const [competitions, setCompetitions] = useState([]);
  const [modal, setModal] = useState(false);
  const [modalEdit, setModalEdit] = useState(false);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);
  const [formData, setFormData] = useState({
    year: '',
    date: '',
    startTime: '',
    endTime: ''
  });

  const { token, tokenExpired } = useUser();

  const navigate = useNavigate();

  const viewParticipants = (year) => {
    navigate(`/admin/competition-detail/?year=${year}`);
  };


  const [formDataEdit, setFormDataEdit] = useState({
    id: '',
    year: '',
    date: '',
    startTime: '',
    endTime: ''
  });

  const toggleModal = () => setModal(!modal);
  const toggleModalEdit = () => setModalEdit(!modalEdit);



  const handleEditSubmit = async () => {
    if (token && validateFormEdit()) {
      try {
        const parsedData = {
          year: parseInt(formDataEdit.year, 10),
          date: formDataEdit.date,
          startTime: formDataEdit.startTime + ":00",
          endTime: formDataEdit.endTime + ":00"
        };

        const response = await fetch(`${process.env.REACT_APP_API_URL}api/competition/edit?id=${formDataEdit.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(parsedData)
        });
        if (tokenExpired(response.status)) { return; }

        if (response.ok) {
          const result = await response.json();
          setCompetitions(competitions.map(comp => comp.id === formDataEdit.id ? { ...comp, ...parsedData } : comp));
          toggleModalEdit();
          window.location.reload();
        } else {
          const error = await response.json();
          alert(t("error", { error: error.error, message: error.message || t("somethingWrong") }));
        }
      } catch (error) {
        alert(t("compUpdateError", { message: error.message }));
      }
    } else {
      alert(t("compWrongFill"));
    }
  };




  useEffect(() => {
    const fetchCompetitions = async () => {
      if (token) {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}api/competition/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (tokenExpired(response.status)) { return; }

          const result = await response.json();
          if (response.ok) {
            setCompetitions(result.data);
          } else {
            console.error(t("compFetchFail"));
          }
        } catch (error) {
          console.error(t("compFetchError"), error);
        }
      }
    };
    fetchCompetitions();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleInputChangeEdit = (e) => {
    setFormDataEdit({ ...formDataEdit, [e.target.name]: e.target.value });
  };

  const startCompetition = async (id) => {
    const confirmStart = window.confirm(t("compStartConfirm"));

    if (confirmStart && token) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}api/competition/start?id=${id}`, {
          method: 'PUT', // Check the API specification to confirm the HTTP method
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tokenExpired(response.status)) { return; }

        if (response.ok) {
          const updatedCompetitions = competitions.map(comp =>
            comp.id === id ? { ...comp, started: true } : comp
          );
          setCompetitions(updatedCompetitions);
          alert(t("compStarted"));
        } else {
          const error = await response.json();
          alert(t("error", { error: error.error, message: error.message || t("serverError") }));
        }
      } catch (error) {
        console.error('Error starting competition:', error);
        alert(t("compStartError", { message: error.message }));
      }
    } else if (!token) {
      alert(t("mustLogin"));
    }
  };



  const handleSubmit = async () => {
    if (validateForm()) {
      if (token) {
        try {
          const parsedData = {
            ...formData,
            year: parseInt(formData.year, 10),
            startTime: formData.startTime + ":00",
            endTime: formData.endTime + ":00"
          };

          const response = await fetch(`${process.env.REACT_APP_API_URL}api/competition/create`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(parsedData)
          });
          if (tokenExpired(response.status)) { return; }

          if (response.ok) {
            const result = await response.json();
            setCompetitions([...competitions, result.data]);
            toggleModal();
            // window.location.reload();
          } else {
            const error = await response.json();
            console.error('Failed to create competition:', error);
            alert(t("error", { error: error.error, message: error.message }));
          }
        } catch (error) {
          console.error('Error creating competition:', error);
          alert(t("compCreateError", { message: error.message }));
        }
      }
    } else {
      alert(t("compWrongFill"));
    }
  };

  const validateForm = () => {
    return formData.year.trim() && formData.date.trim() && formData.startTime.trim() && formData.endTime.trim();
  };
  const validateFormEdit = () => {
    return formDataEdit.year.trim() && formDataEdit.date.trim() && formDataEdit.startTime.trim() && formDataEdit.endTime.trim();
  };
  const handleRemoveCompetition = async (id) => {
    if (token) {

      const confirmDelete = window.confirm(t("compRemoveConfirm"));
      if (confirmDelete) {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}api/competition/remove?id=${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (tokenExpired(response.status)) { return; }

          if (response.ok) {
            setCompetitions(competitions.filter(comp => comp.id !== id));
          } else {
            console.error('Chyba při mazání soutěže');
            alert(t("compRemoveFail"));
          }
        } catch (error) {
          console.error('Chyba při mazání soutěže:', error);
          alert(t("compRemoveError", { message: error.message }));
        }
      } else {

        console.log("Odstranění zrušeno uživatelem.");
      }
    } else {
      alert(t("mustLogin"));
    }
  };


  const rolesString = localStorage.getItem('roles');
  const rolesArray = rolesString ? rolesString.split(', ') : [];
  const isAdminOrLeader = rolesArray.some(role => ['ADMIN', 'LEADER'].includes(role));

  return (
    <div className="content">
      <Button color="success" style={{ marginBottom: '10px' }} onClick={() => toggleModal()}>{t("compAdd")}</Button>
      <Modal isOpen={modal} toggle={toggleModal}>
        <ModalHeader toggle={toggleModal}>{t("compAddNew")}</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label for="year">{t("year")}</Label>
            <Input style={{ color: 'black' }} type="number" name="year" id="year" value={formData.year} onChange={handleInputChange} />
          </FormGroup>
          <FormGroup>
            <Label for="date">{t("date")}</Label>
            <Input style={{ color: 'black' }} type="date" name="date" id="date" value={formData.date} onChange={handleInputChange} />
          </FormGroup>
          <FormGroup>
            <Label for="startTime">{t("start")}</Label>
            <Input style={{ color: 'black' }} type="time" name="startTime" id="startTime" value={formData.startTime} onChange={handleInputChange} />
          </FormGroup>
          <FormGroup>
            <Label for="endTime">{t("end")}</Label>
            <Input style={{ color: 'black' }} type="time" name="endTime" id="endTime" value={formData.endTime} onChange={handleInputChange} />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button style={{ margin: '10px' }} color="primary" onClick={handleSubmit}>{t("save")}</Button>
          <Button style={{ margin: '10px' }} color="secondary" onClick={() => toggleModal()}>{t("cancel")}</Button>
        </ModalFooter>
      </Modal>

      {competitions.length > 0 ? (
        <Row>
          {competitions.map(competition => (
            <Col key={competition.id} lg="6" md="12">
              <Card>
                <CardHeader className="bg-primary text-white d-flex justify-content-between align-items-center">
                  <CardTitle tag="h4">{t("robogamesYear", { year: competition.year })}</CardTitle>
                  {isAdminOrLeader && !competition.started && (
                    <Button style={{ marginBottom: '15px' }} color="danger" size="sm" onClick={() => handleRemoveCompetition(competition.id)}>
                      <i className="tim-icons icon-simple-remove" />
                    </Button>
                  )}
                </CardHeader>
                <CardBody>
                  <dl className="row">
                    <dt className="col-sm-3">{t("id_colon")}</dt>
                    <dd className="col-sm-9">{competition.id}</dd>
                    <dt className="col-sm-3">{t("date_colon")}</dt>
                    <dd className="col-sm-9">{competition.date ? competition.date.split('T')[0] : 'N/A'}</dd>
                    <dt className="col-sm-3">{t("start_colon")}</dt>
                    <dd className="col-sm-9">{competition.startTime}</dd>
                    <dt className="col-sm-3">{t("end_colon")}</dt>
                    <dd className="col-sm-9">{competition.endTime}</dd>
                    <dt className="col-sm-3">{t("started_colon")}</dt>
                    <dd className="col-sm-9">{competition.started ? t("yes") : t("no")}</dd>
                  </dl>

                  <hr />



                  <div className="text-left">
                    {isAdminOrLeader && !competition.started && (
                      <Button color="success" size="sm" onClick={() => startCompetition(competition.id)}>{t("begin")}</Button>
                    )}

                    {isAdminOrLeader && !competition.started && (
                      <Button color="info" size="sm" className="mr-2" onClick={() => toggleModalEdit()} >{t("edit")}</Button>

                    )}
                    <Modal isOpen={modalEdit} toggle={toggleModalEdit}>
                      <ModalHeader toggle={toggleModalEdit}>{t("compEdit")}</ModalHeader>
                      <ModalBody>
                        <FormGroup>
                          <Label for="id">{t("id")}</Label>
                          <Input style={{ color: 'black' }} type="number" name="id" id="id" value={formDataEdit.id} onChange={handleInputChangeEdit} />
                        </FormGroup>
                        <FormGroup>
                          <Label for="year">{t("year")}</Label>
                          <Input style={{ color: 'black' }} type="number" name="year" id="year" value={formDataEdit.year} onChange={handleInputChangeEdit} />
                        </FormGroup>
                        <FormGroup>
                          <Label for="date">{t("date")}</Label>
                          <Input style={{ color: 'black' }} type="date" name="date" id="date" value={formDataEdit.date} onChange={handleInputChangeEdit} />
                        </FormGroup>
                        <FormGroup>
                          <Label for="startTime">{t("start")}</Label>
                          <Input style={{ color: 'black' }} type="time" name="startTime" id="startTime" value={formDataEdit.startTime} onChange={handleInputChangeEdit} />
                        </FormGroup>
                        <FormGroup>
                          <Label for="endTime">{t("end")}</Label>
                          <Input style={{ color: 'black' }} type="time" name="endTime" id="endTime" value={formDataEdit.endTime} onChange={handleInputChangeEdit} />
                        </FormGroup>
                      </ModalBody>
                      <ModalFooter>
                        <Button style={{ margin: '10px' }} color="primary" onClick={handleEditSubmit}>{t("confirm")}</Button>
                        <Button style={{ margin: '10px' }} color="secondary" onClick={toggleModalEdit}>{t("close")}</Button>
                      </ModalFooter>
                    </Modal>

                    <Button color="secondary" size="sm" onClick={() => viewParticipants(competition.year)}>{t("showParticipants")}</Button>

                  </div>
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Row>
          <Col>
            <h4>{t("noComps")}</h4>
          </Col>
        </Row>
      )}
    </div>
  );
}

export default CompetitionManagement;
