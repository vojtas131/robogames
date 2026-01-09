import React, { useState, useEffect } from 'react';
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
  Input,
  CardFooter,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { useToast } from "contexts/ToastContext";
import { useConfirm } from "components/ConfirmModal";
import { t } from "translations/translate";

function Tables() {
  const [disciplines, setDisciplines] = useState([]);
  const [modal, setModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    scoreAggregation: 'MIN',
    time: '',
    maxRounds: ''
  });
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const rolesString = localStorage.getItem('roles');
  const rolesArray = rolesString ? rolesString.split(', ') : [];
  const isAdminOrLeader = rolesArray.some(role => ['ADMIN', 'LEADER'].includes(role));

  const { token, tokenExpired } = useUser();
  const toast = useToast();
  const { confirm } = useConfirm();

  const toggleDropdown = (id) => {
    if (openDropdownId === id) {
      setOpenDropdownId(null);
    } else {
      setOpenDropdownId(id);
    }
  };

  const toggleModal = () => {
    setModal(!modal);
    setEditMode(false);
    setFormData({
      id: '',
      name: '',
      description: '',
      scoreAggregation: 'MIN',
      time: '',
      maxRounds: ''
    });
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = (discipline) => {
    setEditMode(true);
    setFormData({
      id: discipline.id,
      name: discipline.name,
      description: discipline.description,
      scoreAggregation: discipline.scoreAggregation?.name || discipline.scoreAggregation || 'MIN',
      time: discipline.time,
      maxRounds: discipline.maxRounds
    });
    setModal(true);
  };

  const handleRemove = async (id) => {
    if (await confirm({ message: t("discRemoveCheck") })) {
      const apiUrl = `${process.env.REACT_APP_API_URL}api/discipline/remove?id=${id}`;
      try {
        const response = await fetch(apiUrl, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });
        if (tokenExpired(response.status)) { return; }

        if (response.ok) {
          setDisciplines(disciplines.filter(d => d.id !== id));
        } else {
          throw new Error(t("discRemoveFail"));
        }
      } catch (error) {
        console.error('Error removing discipline: ', error);
      }
    }
  };

  useEffect(() => {
    const apiUrl = `${process.env.REACT_APP_API_URL}api/discipline/all`;

    fetch(apiUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(t("networkFail"));
        }
        return response.json();
      })
      .then(data => {
        setDisciplines(data.data);
      })
      .catch(error => {
        console.error("Error fetching data: ", error);
      });
  }, []);

  const handleSubmitEdit = async () => {
    const apiUrl = `${process.env.REACT_APP_API_URL}api/discipline/edit?id=${formData.id}`;
    try {
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (tokenExpired(response.status)) { return; }

      if (response.ok) {
        setDisciplines(disciplines.map(d => d.id === formData.id));
        toggleModal();
        window.location.reload();
      } else {
        throw new Error(t("discEditFail"));
      }
    } catch (error) {
      console.error('Error editting discipline: ', error);
      toast.error(t("typeError"));
    }
  };

  const handleSubmitCreate = async () => {
    const apiUrl = `${process.env.REACT_APP_API_URL}api/discipline/create`;
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (tokenExpired(response.status)) { return; }

      if (response.ok) {
        const updatedDiscipline = await response.json();
        setDisciplines([...disciplines, updatedDiscipline.data]);
        toggleModal();
        window.location.reload();
      } else {
        throw new Error(t("discCreateFail"));
      }
    } catch (error) {
      console.error('Error creating discipline: ', error);
      toast.error(t("typeError"));
    }
  };

  useEffect(() => {
    const apiUrl = `${process.env.REACT_APP_API_URL}api/discipline/all`;

    fetch(apiUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(t("networkFail"));
        }
        return response.json();
      })
      .then(data => {
        setDisciplines(data.data);
      })
      .catch(error => {
        console.error("Error fetching data: ", error);
      });
  }, []);


  return (
    <>
      <div className="content">
        {isAdminOrLeader && (
          <Button style={{ marginBottom: '10px' }} color="primary" onClick={toggleModal}>{t("discAdd")}</Button>
        )}
        <Modal isOpen={modal} toggle={toggleModal}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (await confirm({ message: t("discEditCreate", { edit: editMode ? t("edit_lower") : t("create_lower") }) })) {
              editMode ? handleSubmitEdit() : handleSubmitCreate();
            }
          }}>
            <ModalHeader toggle={toggleModal}>{editMode ? t("discEdit") : t("discAddNew")}</ModalHeader>
            <ModalBody>
              <FormGroup>
                <Label for="name">{t("discName")}</Label>
                <Input style={{ color: 'black' }} type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required />
              </FormGroup>
              <FormGroup>
                <Label for="description">{t("descript")}</Label>
                <Input style={{ color: 'black' }} type="textarea" name="description" id="description" value={formData.description} onChange={handleInputChange} required />
              </FormGroup>
              <FormGroup>
                <Label for="scoreAggregation">{t("scoreAgrr")}</Label>
                <Input style={{ color: 'black' }} type="select" name="scoreAggregation" id="scoreAggregation" value={formData.scoreAggregation} onChange={handleInputChange}>
                  <option>{t("min")}</option>
                  <option>{t("max")}</option>
                  <option>{t("sum")}</option>
                </Input>
              </FormGroup>
              <FormGroup>
                <Label for="time">{t("timeLimit")}</Label>
                <Input style={{ color: 'black' }} type="number" name="time" id="time" value={formData.time} onChange={handleInputChange} required />
              </FormGroup>
              <FormGroup>
                <Label for="maxRounds">{t("maxRounds")}</Label>
                <Input style={{ color: 'black' }} type="number" name="maxRounds" id="maxRounds" value={formData.maxRounds} onChange={handleInputChange} required />
              </FormGroup>
            </ModalBody>
            <ModalFooter>
              <Button type="submit" style={{ margin: '10px' }} color="primary">
                {editMode ? t("edit") : t("send")}
              </Button>
              <Button style={{ margin: '10px' }} color="secondary" onClick={toggleModal}>{t("cancel")}</Button>
            </ModalFooter>
          </form>
        </Modal>
        <Row>
          <div className="d-flex flex-wrap">
            {disciplines.map((discipline) => (
              <Col md="4" key={discipline.id} className="d-flex align-items-stretch">
                <Card className="flex-fill">
                  <CardHeader>
                    <CardTitle tag="h2">{discipline.name}</CardTitle>
                  </CardHeader>
                  <CardBody>
                    {isAdminOrLeader && (
                      <p><strong>{t("evalType")}</strong> {discipline.scoreAggregation?.name || discipline.scoreAggregation || '-'}</p>)}
                    <p><strong>{t("time_colon")}</strong> {t("secs", { time: discipline.time })}</p>
                    <p><strong>{t("maxRounds_colon")}</strong> {discipline.maxRounds === -1 ? t("unlimited") : discipline.maxRounds}</p>
                    <p>{discipline.description}</p>
                  </CardBody>

                  <CardFooter>
                    {isAdminOrLeader && (
                      <Dropdown isOpen={openDropdownId === discipline.id} toggle={() => toggleDropdown(discipline.id)}>
                        <DropdownToggle caret >
                          <i className="tim-icons icon-settings" />
                        </DropdownToggle>
                        <DropdownMenu>
                          <DropdownItem onClick={() => handleEdit(discipline)}>{t("edit")}</DropdownItem>
                          <DropdownItem onClick={() => handleRemove(discipline.id)}>{t("remove")}</DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    )}
                  </CardFooter>
                </Card>
              </Col>
            ))}
          </div>
        </Row>
      </div >
    </>
  );
}

export default Tables;