import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  Button,
  Input,
  FormGroup,
  Label,
  Alert,
  Progress
} from "reactstrap";
import { t } from "translations/translate";
import { useUser } from "contexts/UserContext";
import { useToast } from "contexts/ToastContext";

const MAX_CHARS = 500;

/**
 * Admin view for broadcasting notifications to all users.
 * Only accessible by admins.
 */
function NotificationBroadcast() {
  const { token, tokenExpired } = useUser();
  const toast = useToast();
  
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const charsRemaining = MAX_CHARS - message.length;
  const progressValue = (message.length / MAX_CHARS) * 100;
  const progressColor = charsRemaining < 50 ? "danger" : charsRemaining < 100 ? "warning" : "info";

  const handleSend = async () => {
    if (!message.trim()) {
      setError(t("notificationMessageRequired") || "Zpráva je povinná");
      return;
    }

    if (message.length > MAX_CHARS) {
      setError(t("notificationTooLong") || `Zpráva je příliš dlouhá (max ${MAX_CHARS} znaků)`);
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}api/notification/broadcast`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: message.trim() })
      });

      if (tokenExpired(response.status)) return;

      if (response.ok) {
        setMessage("");
        toast.success(t("notificationSent") || "Notifikace byla odeslána všem uživatelům");
      } else {
        const result = await response.json();
        setError(result.message || t("notificationSendError") || "Nepodařilo se odeslat notifikaci");
      }
    } catch (err) {
      console.error('Error sending notification:', err);
      setError(t("notificationSendError") || "Nepodařilo se odeslat notifikaci");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="content">
      <Row>
        <Col md="12" lg="8" className="mx-auto">
          <Card>
            <CardHeader>
              <CardTitle tag="h4">
                <i className="tim-icons icon-send mr-2" />
                {t("broadcastNotification") || "Hromadná notifikace"}
              </CardTitle>
              <p className="text-muted">
                {t("broadcastNotificationDesc") || "Odešlete notifikaci všem registrovaným uživatelům"}
              </p>
            </CardHeader>
            <CardBody>
              {error && (
                <Alert color="danger" isOpen={!!error} toggle={() => setError(null)}>
                  <i className="tim-icons icon-alert-circle-exc mr-2" />
                  {error}
                </Alert>
              )}

              <FormGroup>
                <Label for="notificationMessage">
                  {t("notificationMessage") || "Text notifikace"}
                </Label>
                <Input
                  type="textarea"
                  id="notificationMessage"
                  placeholder={t("notificationPlaceholder") || "Zadejte text notifikace..."}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={MAX_CHARS}
                  style={{ 
                    resize: 'vertical',
                    minHeight: '120px'
                  }}
                />
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <Progress 
                    value={progressValue} 
                    color={progressColor}
                    style={{ width: '70%', height: '8px' }}
                  />
                  <small className={charsRemaining < 50 ? "text-danger" : "text-muted"}>
                    {charsRemaining} {t("charsRemaining") || "znaků zbývá"}
                  </small>
                </div>
              </FormGroup>

              <div className="d-flex justify-content-between align-items-center mt-4">
                <div className="text-muted">
                  <i className="tim-icons icon-alert-circle-exc mr-1" />
                  <small>{t("broadcastWarning") || "Zpráva bude odeslána všem uživatelům v systému"}</small>
                </div>
                <Button
                  color="primary"
                  onClick={handleSend}
                  disabled={sending || !message.trim()}
                  style={{ minWidth: '150px' }}
                >
                  {sending ? (
                    <>
                      <i className="tim-icons icon-refresh-02 mr-2 spin" />
                      {t("sending") || "Odesílám..."}
                    </>
                  ) : (
                    <>
                      <i className="tim-icons icon-send mr-2" />
                      {t("sendNotification") || "Odeslat notifikaci"}
                    </>
                  )}
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Information Card */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle tag="h5">
                <i className="tim-icons icon-bulb-63 mr-2" />
                {t("notificationInfo") || "Informace"}
              </CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="mb-0">
                <li>{t("notificationInfoMaxChars") || `Maximální délka zprávy je ${MAX_CHARS} znaků`}</li>
                <li>{t("notificationInfoAllUsers") || "Notifikace bude odeslána všem registrovaným uživatelům"}</li>
                <li>{t("notificationInfoVisible") || "Uživatelé uvidí notifikaci v menu zvonečku"}</li>
                <li>{t("notificationInfoAdmin") || "Jako odesílatel bude uvedeno 'Admin'"}</li>
              </ul>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default NotificationBroadcast;
