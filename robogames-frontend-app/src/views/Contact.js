import React from "react";
import { Card, CardHeader, CardBody, CardTitle, Row, Col } from "reactstrap";
import { t } from "translations/translate";

function Contact() {
  return (
    <div className="content">
      <Row className="justify-content-center">
        <Col lg="10">
          <h2 className="text-center mb-4" style={{ 
            background: 'linear-gradient(135deg, #ef6000 0%, #ff8533 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            <i className="tim-icons icon-email-85 mr-2" style={{ WebkitTextFillColor: '#ef6000' }} />
            {t("contactUs") || "Kontaktujte nás"}
          </h2>
        </Col>
      </Row>
      <Row className="justify-content-center">
        <Col lg="5" md="6" className="mb-4">
          <Card style={{ 
            height: '100%', 
            border: '1px solid rgba(255,255,255,0.1)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          >
            <CardHeader style={{ 
              background: 'linear-gradient(135deg, rgba(94,114,228,0.2) 0%, transparent 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <CardTitle tag="h4" className="mb-3">
                <i className="tim-icons icon-single-02 mr-2" style={{ color: '#5e72e4' }} />
                {t("organizer")}
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '20px',
                padding: '15px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '10px'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #5e72e4 0%, #825ee4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '15px',
                  flexShrink: 0
                }}>
                  <i className="tim-icons icon-single-02" style={{ fontSize: '1.5rem', color: 'white' }} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 'bold', marginBottom: '5px' }}>Ing. Tomáš Dulík, Ph.D.</h4>
                  <span className="text-muted">{t("institute")}</span>
                </div>
              </div>

              <div className="contact-info">
                <div className="d-flex align-items-center mb-3">
                  <div style={{
                    width: '35px',
                    height: '35px',
                    borderRadius: '8px',
                    background: 'rgba(94,114,228,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px'
                  }}>
                    <i className="tim-icons icon-bank" style={{ color: '#5e72e4' }} />
                  </div>
                  <div>
                    <small className="text-muted d-block">{t("institution") || "Instituce"}</small>
                    <span>{t("fai")}, {t("utb")}</span>
                  </div>
                </div>

                <div className="d-flex align-items-center mb-3">
                  <div style={{
                    width: '35px',
                    height: '35px',
                    borderRadius: '8px',
                    background: 'rgba(40,167,69,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px'
                  }}>
                    <i className="tim-icons icon-square-pin" style={{ color: '#28a745' }} />
                  </div>
                  <div>
                    <small className="text-muted d-block">{t("address") || "Adresa"}</small>
                    <span>Nad Stráněmi 4511, 76005 Zlín</span>
                  </div>
                </div>

                <div className="d-flex align-items-center mb-3">
                  <div style={{
                    width: '35px',
                    height: '35px',
                    borderRadius: '8px',
                    background: 'rgba(239,96,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px'
                  }}>
                    <i className="tim-icons icon-email-85" style={{ color: '#ef6000' }} />
                  </div>
                  <div>
                    <small className="text-muted d-block">E-mail</small>
                    <a href="mailto:dulik@utb.cz" style={{ color: '#ef6000' }}>dulik@utb.cz</a>
                  </div>
                </div>

                <div className="d-flex align-items-center mb-3">
                  <div style={{
                    width: '35px',
                    height: '35px',
                    borderRadius: '8px',
                    background: 'rgba(23,162,184,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px'
                  }}>
                    <i className="tim-icons icon-mobile" style={{ color: '#17a2b8' }} />
                  </div>
                  <div>
                    <small className="text-muted d-block">{t("phoneLabel") || "Telefon"}</small>
                    <span>+420 57 603 5187</span>
                  </div>
                </div>

                <div className="d-flex align-items-center">
                  <div style={{
                    width: '35px',
                    height: '35px',
                    borderRadius: '8px',
                    background: 'rgba(255,193,7,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px'
                  }}>
                    <i className="tim-icons icon-chat-33" style={{ color: '#ffc107' }} />
                  </div>
                  <div>
                    <small className="text-muted d-block">{t("mobileLabel") || "Mobil"}</small>
                    <span>+420 774 313 854</span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col lg="5" md="6" className="mb-4">
          <Card style={{ 
            height: '100%', 
            border: '1px solid rgba(255,255,255,0.1)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          >
            <CardHeader style={{ 
              background: 'linear-gradient(135deg, rgba(239,96,0,0.2) 0%, transparent 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <CardTitle tag="h4" className="mb-3">
                <i className="tim-icons icon-badge mr-2" style={{ color: '#ef6000' }} />
                {t("organisation")}
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '20px',
                padding: '15px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '10px'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ef6000 0%, #ff8533 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '15px',
                  flexShrink: 0
                }}>
                  <i className="tim-icons icon-badge" style={{ fontSize: '1.5rem', color: 'white' }} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 'bold', marginBottom: '5px' }}>doc. Ing. Jiří Vojtěšek, Ph.D.</h4>
                  <span className="text-muted">{t("dean")}</span>
                </div>
              </div>

              <div className="contact-info">
                <div className="d-flex align-items-center mb-3">
                  <div style={{
                    width: '35px',
                    height: '35px',
                    borderRadius: '8px',
                    background: 'rgba(94,114,228,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px'
                  }}>
                    <i className="tim-icons icon-bank" style={{ color: '#5e72e4' }} />
                  </div>
                  <div>
                    <small className="text-muted d-block">{t("institution") || "Instituce"}</small>
                    <span>{t("fai")}, {t("utb")}</span>
                  </div>
                </div>

                <div className="d-flex align-items-center mb-3">
                  <div style={{
                    width: '35px',
                    height: '35px',
                    borderRadius: '8px',
                    background: 'rgba(40,167,69,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px'
                  }}>
                    <i className="tim-icons icon-square-pin" style={{ color: '#28a745' }} />
                  </div>
                  <div>
                    <small className="text-muted d-block">{t("address") || "Adresa"}</small>
                    <span>Nad Stráněmi 4511, 76005 Zlín</span>
                  </div>
                </div>

                <div className="d-flex align-items-center mb-3">
                  <div style={{
                    width: '35px',
                    height: '35px',
                    borderRadius: '8px',
                    background: 'rgba(239,96,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px'
                  }}>
                    <i className="tim-icons icon-email-85" style={{ color: '#ef6000' }} />
                  </div>
                  <div>
                    <small className="text-muted d-block">E-mail</small>
                    <a href="mailto:vojtesek@utb.cz" style={{ color: '#ef6000' }}>vojtesek@utb.cz</a>
                  </div>
                </div>

                <div className="d-flex align-items-center">
                  <div style={{
                    width: '35px',
                    height: '35px',
                    borderRadius: '8px',
                    background: 'rgba(255,193,7,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px'
                  }}>
                    <i className="tim-icons icon-chat-33" style={{ color: '#ffc107' }} />
                  </div>
                  <div>
                    <small className="text-muted d-block">{t("mobileLabel") || "Mobil"}</small>
                    <span>+420 733 599 960</span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Contact;