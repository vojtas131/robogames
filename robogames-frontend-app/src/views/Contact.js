import { number } from "prop-types";
import React from "react";
import { Card, CardHeader, CardBody, CardTitle, Row, Col } from "reactstrap";
import { t } from "translations/translate";

function Contact() {
  return (
    <div className="content">
      <Row>
        <Col md="6">
          <Card style={{ height: '300px' }}>
            <CardHeader>
              <CardTitle tag="h4">{t("organizer")}</CardTitle>
              <hr></hr>
            </CardHeader>
            <CardBody>
              <h4 style={{ fontWeight: 'bold' }}>Ing. Tomáš Dulík, Ph.D.</h4>

              <p>{t("fai")}</p>
              <p>{t("utb")}</p>
              <p>{t("institute")}</p>
              <p>Nad Stráněmi 4511, 76005 Zlín</p>
              <p>{t("phone",{number: "+420 57 603 5187"})}</p>
              <p>{t("mobile",{number: "+420 774 313 854"})}</p>
            </CardBody>
          </Card>
        </Col>
        <Col md="6">
          <Card style={{ height: '300px' }}>
            <CardHeader>
              <CardTitle tag="h4">{t("organisation")}</CardTitle>
              <hr></hr>
            </CardHeader>
            <CardBody>
              <h4 style={{ fontWeight: 'bold' }}>doc. Ing. Jiří Vojtěšek, Ph.D.</h4>
              <p>{t("dean")}</p>
              <p>{t("fai")}</p>
              <p>{t("utb")}</p>
              <p>Nad Stráněmi 4511, 76005 Zlín</p>
              <p>{t("mobile",{number: "+420 733 599 960"})}</p>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>

  );
}

export default Contact;