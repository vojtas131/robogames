import React, { useState, useEffect, useContext } from 'react';
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
  DropdownItem,
  Badge
} from 'reactstrap';
import { useUser } from "contexts/UserContext";
import { useToast } from "contexts/ToastContext";
import { useConfirm } from "components/ConfirmModal";
import { ThemeContext, themes } from "contexts/ThemeContext";
import { t } from "translations/translate";

function Tables() {
  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    scoreAggregation: 'MIN',
    time: '',
    maxRounds: '',
    scoreType: 'SCORE',
    highScoreWin: true,
    hidden: false,
    competitionMode: 'BEST_SCORE'
  });
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const rolesString = localStorage.getItem('roles');
  const rolesArray = rolesString ? rolesString.split(', ') : [];
  const isAdminOrLeader = rolesArray.some(role => ['ADMIN', 'LEADER'].includes(role));

  const { token, tokenExpired } = useUser();
  const toast = useToast();
  const { confirm } = useConfirm();
  const { theme } = useContext(ThemeContext);
  const isDark = theme === themes.dark;

  // Theme-aware colors
  const colors = {
    primary: '#ef6000',
    primaryLight: '#ff8533',
    primaryDark: '#cc5200',
    cardBg: isDark ? '#27293d' : '#ffffff',
    cardBorder: isDark ? '#2b3553' : '#e9ecef',
    textPrimary: isDark ? '#ffffff' : '#344675',
    textSecondary: isDark ? 'rgba(255,255,255,0.6)' : '#8898aa',
    heroBg: isDark 
      ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
      : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    heroAccent: 'linear-gradient(135deg, #ef6000 0%, #ff8533 100%)',
    infoBg: isDark ? 'rgba(239, 96, 0, 0.1)' : 'rgba(239, 96, 0, 0.08)',
  };

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
      maxRounds: '',
      scoreType: 'SCORE',
      highScoreWin: true,
      hidden: false,
      competitionMode: 'BEST_SCORE'
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
      maxRounds: discipline.maxRounds,
      scoreType: discipline.scoreTypeName || 'SCORE',
      highScoreWin: discipline.highScoreWin !== undefined ? discipline.highScoreWin : true,
      hidden: discipline.hidden || false,
      competitionMode: discipline.competitionModeName || 'BEST_SCORE'
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
    // Admin/Leader vidí všechny disciplíny včetně skrytých, běžní uživatelé jen viditelné
    const endpoint = isAdminOrLeader ? 'api/discipline/all' : 'api/discipline/all/visible';
    const apiUrl = `${process.env.REACT_APP_API_URL}${endpoint}`;
    setLoading(true);

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
      })
      .finally(() => setLoading(false));
  }, [isAdminOrLeader]);

  // Loading state
  if (loading) {
    return (
      <div className="content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-border" style={{ color: colors.primary, width: '3rem', height: '3rem' }} role="status">
            <span className="sr-only">{t("loading")}</span>
          </div>
          <p style={{ marginTop: '1rem', color: colors.textPrimary }}>{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="content">
        {/* Hero Section */}
        <Row className="mb-4">
          <Col md="12">
            <Card style={{ 
              background: colors.heroBg,
              border: `2px solid ${colors.primary}`,
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <CardBody className="py-4">
                <Row className="align-items-center">
                  <Col lg="8" className="text-center text-lg-left">
                    <div className="d-inline-block px-3 py-1 mb-3" style={{
                      background: colors.heroAccent,
                      borderRadius: '20px'
                    }}>
                      <small className="text-white font-weight-bold">
                        <i className="tim-icons icon-settings-gear-63 mr-1" />
                        {t("disc") || "DISCIPLÍNY"}
                      </small>
                    </div>
                    <h2 className="mb-2" style={{ 
                      fontWeight: 700,
                      color: colors.textPrimary
                    }}>
                      {t("discListTitle") || "Soutěžní disciplíny"}
                    </h2>
                    <p className="mb-0" style={{ 
                      color: colors.textSecondary
                    }}>
                      {t("discListDesc") || "Prozkoumejte všechny disciplíny, ve kterých můžete soutěžit se svými roboty"}
                    </p>
                  </Col>
                  <Col lg="4" className="text-center mt-3 mt-lg-0">
                    <div style={{ 
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: colors.heroAccent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 10px'
                    }}>
                      <i className="tim-icons icon-trophy" style={{ fontSize: '2.5rem', color: 'white' }} />
                    </div>
                    <Badge color="warning" style={{ fontSize: '1rem', padding: '8px 16px' }}>
                      {disciplines.length} {t("disciplinesCount") || "disciplín"}
                    </Badge>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {isAdminOrLeader && (
          <Button 
            style={{ 
              marginBottom: '20px',
              background: colors.heroAccent,
              border: 'none',
              borderRadius: '25px',
              padding: '12px 28px'
            }} 
            onClick={toggleModal}
          >
            <i className="tim-icons icon-simple-add mr-2" />
            {t("discAdd")}
          </Button>
        )}

        <Modal 
          isOpen={modal} 
          toggle={toggleModal} 
          scrollable
        >
          <style>
            {`
              .modal-dialog {
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                margin: 0 !important;
                max-width: 600px;
                width: 90%;
                max-height: 90vh;
              }
              .modal-content {
                max-height: 90vh;
                overflow: hidden;
              }
            `}
          </style>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (await confirm({ message: t("discEditCreate", { edit: editMode ? t("edit_lower") : t("create_lower") }) })) {
              editMode ? handleSubmitEdit() : handleSubmitCreate();
            }
          }}>
            <ModalHeader toggle={toggleModal}>{editMode ? t("discEdit") : t("discAddNew")}</ModalHeader>
            <ModalBody style={{ maxHeight: 'calc(90vh - 130px)', overflowY: 'auto' }}>
              <Row>
                <Col md="12">
                  <FormGroup>
                    <Label for="name">{t("discName")}</Label>
                    <Input style={{ color: 'black' }} type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required />
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md="6">
                  <FormGroup>
                    <Label for="time">{t("timeLimit")}</Label>
                    <Input style={{ color: 'black' }} type="number" name="time" id="time" value={formData.time} onChange={handleInputChange} required />
                  </FormGroup>
                </Col>
                <Col md="6">
                  <FormGroup>
                    <Label for="maxRounds">{t("maxRounds")}</Label>
                    <Input style={{ color: 'black' }} type="number" name="maxRounds" id="maxRounds" value={formData.maxRounds} onChange={handleInputChange} required />
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md="6">
                  <FormGroup>
                    <Label for="scoreType">{t("scoreType") || "Typ skóre"}</Label>
                    <Input style={{ color: 'black' }} type="select" name="scoreType" id="scoreType" value={formData.scoreType} onChange={handleInputChange}>
                      <option value="SCORE">{t("scoreTypeScore") || "Body"}</option>
                      <option value="TIME">{t("scoreTypeTime") || "Čas"}</option>
                    </Input>
                  </FormGroup>
                </Col>
                <Col md="6">
                  <FormGroup>
                    <Label for="scoreAggregation">{t("scoreAgrr")}</Label>
                    <Input style={{ color: 'black' }} type="select" name="scoreAggregation" id="scoreAggregation" value={formData.scoreAggregation} onChange={handleInputChange}>
                      <option>{t("min")}</option>
                      <option>{t("max")}</option>
                      <option>{t("sum")}</option>
                    </Input>
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md="6">
                  <FormGroup>
                    <Label for="highScoreWin">{t("winCondition") || "Podmínka výhry"}</Label>
                    <Input 
                      style={{ color: 'black' }} 
                      type="select" 
                      name="highScoreWin" 
                      id="highScoreWin" 
                      value={formData.highScoreWin ? "true" : "false"} 
                      onChange={(e) => setFormData({ ...formData, highScoreWin: e.target.value === "true" })}
                    >
                      <option value="true">{t("highScoreWinsShort") || "Vyšší skóre vyhrává"}</option>
                      <option value="false">{t("lowScoreWinsShort") || "Nižší skóre vyhrává"}</option>
                    </Input>
                  </FormGroup>
                </Col>
                <Col md="6">
                  <FormGroup>
                    <Label for="competitionMode">{t("competitionMode") || "Režim soutěže"}</Label>
                    <Input 
                      style={{ color: 'black' }} 
                      type="select" 
                      name="competitionMode" 
                      id="competitionMode" 
                      value={formData.competitionMode} 
                      onChange={handleInputChange}
                    >
                      <option value="BEST_SCORE">{t("competitionModeBestScore") || "Nejlepší skóre"}</option>
                      <option value="TOURNAMENT">{t("competitionModeTournament") || "Turnaj"}</option>
                    </Input>
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md="12">
                  <FormGroup className="mb-3">
                    <Label>{t("hiddenDiscipline") || "Skrytá disciplína"}</Label>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: '#f8f9fa',
                      borderRadius: '6px',
                      border: '1px solid #ced4da',
                      gap: '12px'
                    }}>
                      <input 
                        type="checkbox" 
                        name="hidden" 
                        checked={formData.hidden} 
                        onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })}
                        style={{ 
                          width: '18px', 
                          height: '18px', 
                          cursor: 'pointer',
                          flexShrink: 0,
                          accentColor: '#ef6000'
                        }}
                      />
                      <span style={{ color: '#555', fontSize: '0.9rem', lineHeight: '1.4' }}>
                        {t("hiddenDisciplineHelp") || "Skryté disciplíny nebudou viditelné pro běžné uživatele a nebude možné do nich registrovat roboty."}
                      </span>
                    </div>
                  </FormGroup>
                </Col>
              </Row>
              <Row>
                <Col md="12">
                  <FormGroup>
                    <Label for="description">{t("descript")}</Label>
                    <Input style={{ color: 'black' }} type="textarea" name="description" id="description" value={formData.description} onChange={handleInputChange} rows="3" required />
                  </FormGroup>
                </Col>
              </Row>
            </ModalBody>
            <ModalFooter>
              <Button type="submit" color="primary">
                {editMode ? t("edit") : t("send")}
              </Button>
              <Button color="secondary" onClick={toggleModal}>{t("cancel")}</Button>
            </ModalFooter>
          </form>
        </Modal>

        <Row>
          {disciplines.map((discipline) => (
            <Col lg="4" md="6" key={discipline.id} className="mb-4">
              <Card style={{ 
                background: colors.cardBg,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: '12px',
                overflow: 'hidden',
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              className="discipline-card"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = `0 10px 30px rgba(239, 96, 0, 0.2)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              >
                <CardHeader style={{ 
                  background: colors.heroAccent,
                  borderBottom: 'none',
                  padding: '1.5rem'
                }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div style={{
                        width: '45px',
                        height: '45px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '12px'
                      }}>
                        <i className="tim-icons icon-components" style={{ fontSize: '1.4rem', color: 'white' }} />
                      </div>
                      <div>
                        <CardTitle tag="h3" style={{ 
                          color: '#ffffff', 
                          fontWeight: 600,
                          marginBottom: discipline.hidden ? '4px' : 0
                        }}>
                          {discipline.name}
                        </CardTitle>
                        {discipline.hidden && (
                          <Badge style={{ 
                            background: 'rgba(255,255,255,0.2)', 
                            color: '#ffcc00',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem'
                          }}>
                            <i className="tim-icons icon-lock-circle mr-1" />
                            {t("hidden") || "Skrytá"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {isAdminOrLeader && (
                      <Dropdown isOpen={openDropdownId === discipline.id} toggle={() => toggleDropdown(discipline.id)}>
                        <DropdownToggle 
                          style={{ 
                            background: 'rgba(255,255,255,0.2)', 
                            border: 'none',
                            padding: '8px 12px'
                          }}
                        >
                          <i className="tim-icons icon-settings-gear-63" style={{ color: '#fff' }} />
                        </DropdownToggle>
                        <DropdownMenu right>
                          <DropdownItem onClick={() => handleEdit(discipline)}>
                            <i className="tim-icons icon-pencil mr-2" />
                            {t("edit")}
                          </DropdownItem>
                          <DropdownItem onClick={() => handleRemove(discipline.id)} className="text-danger">
                            <i className="tim-icons icon-trash-simple mr-2" />
                            {t("remove")}
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    )}
                  </div>
                </CardHeader>
                <CardBody style={{ padding: '1.5rem' }}>
                  <div className="mb-3">
                    <div className="d-flex flex-wrap" style={{ gap: '8px' }}>
                      <Badge style={{ 
                        background: colors.infoBg, 
                        color: colors.primary,
                        padding: '8px 12px',
                        borderRadius: '20px',
                        fontSize: '0.85rem'
                      }}>
                        <i className="tim-icons icon-watch-time mr-1" />
                        {t("secs", { time: discipline.time })}
                      </Badge>
                      <Badge style={{ 
                        background: colors.infoBg, 
                        color: colors.primary,
                        padding: '8px 12px',
                        borderRadius: '20px',
                        fontSize: '0.85rem'
                      }}>
                        <i className="tim-icons icon-refresh-02 mr-1" />
                        {discipline.maxRounds === -1 ? t("unlimited") : `${discipline.maxRounds} ${t("rounds") || "kol"}`}
                      </Badge>
                    </div>
                  </div>

                  {isAdminOrLeader && (
                    <div className="mb-3" style={{ 
                      background: colors.infoBg, 
                      padding: '12px', 
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}>
                      <div className="mb-2">
                        <i className="tim-icons icon-chart-bar-32 mr-2" style={{ color: colors.primary }} />
                        <strong style={{ color: colors.textSecondary }}>{t("evalType")}</strong>{' '}
                        <span style={{ color: colors.textPrimary }}>{discipline.scoreAggregation?.name || discipline.scoreAggregation || '-'}</span>
                      </div>
                      <div className="mb-2">
                        <i className="tim-icons icon-chart-pie-36 mr-2" style={{ color: colors.primary }} />
                        <strong style={{ color: colors.textSecondary }}>{t("scoreType") || "Typ skóre"}:</strong>{' '}
                        <span style={{ color: colors.textPrimary }}>
                          {discipline.scoreTypeName === 'TIME' ? (t("scoreTypeTime") || "Čas") : (t("scoreTypeScore") || "Body")}
                        </span>
                      </div>
                      <div className="mb-2">
                        <i className="tim-icons icon-trophy mr-2" style={{ color: colors.primary }} />
                        <strong style={{ color: colors.textSecondary }}>{t("winCondition") || "Výhra"}:</strong>{' '}
                        <span style={{ color: colors.textPrimary }}>
                          {discipline.highScoreWin ? (t("highScoreWins") || "Vyšší vyhrává") : (t("lowScoreWins") || "Nižší vyhrává")}
                        </span>
                      </div>
                      <div>
                        <i className="tim-icons icon-controller mr-2" style={{ color: colors.primary }} />
                        <strong style={{ color: colors.textSecondary }}>{t("competitionMode") || "Režim"}:</strong>{' '}
                        <span style={{ color: colors.textPrimary }}>
                          {discipline.competitionModeName === 'TOURNAMENT' 
                            ? (t("competitionModeTournament") || "Turnaj") 
                            : (t("competitionModeBestScore") || "Nejlepší skóre")}
                        </span>
                      </div>
                    </div>
                  )}

                  <p style={{ 
                    color: colors.textSecondary, 
                    lineHeight: '1.6',
                    marginBottom: 0
                  }}>
                    {discipline.description}
                  </p>
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>

        {disciplines.length === 0 && !loading && (
          <Row>
            <Col md="12" className="text-center py-5">
              <div style={{ 
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: colors.infoBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <i className="tim-icons icon-zoom-split" style={{ fontSize: '2.5rem', color: colors.primary }} />
              </div>
              <h4 style={{ color: colors.textPrimary }}>{t("noDisciplines") || "Žádné disciplíny"}</h4>
              <p style={{ color: colors.textSecondary }}>{t("noDisciplinesDesc") || "Zatím nejsou k dispozici žádné disciplíny."}</p>
            </Col>
          </Row>
        )}
      </div>
    </>
  );
}

export default Tables;