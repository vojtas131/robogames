import React, { useState } from "react";
import { Card, CardHeader, CardBody, CardTitle, Button, Row, Col, Collapse } from "reactstrap";
import sumoring from '../assets/img/sumoring.png'
import draha1 from '../assets/img/draha-150x150.png'
import draha2 from '../assets/img/draha1-150x150.png'
import cleaner from '../assets/img/cleaner.png'
import { t } from "translations/translate";


function Rules() {
  const [isOpen, setIsOpen] = useState({});
  const toggle = id => setIsOpen(prevState => ({ ...prevState, [id]: !prevState[id] }));

  return (
    <div className="content">
      <Row>
        <Col md="12">
          <Card className="card-plain">
            <CardHeader>
              <CardTitle tag="h3">{t("rules")}</CardTitle>
            </CardHeader>
            <CardBody>
              <div>
                <Button color="primary" onClick={() => toggle('ageCategories')} style={{ marginBottom: '1rem' }}>{t("ageCat")}</Button>

                <Collapse isOpen={isOpen['ageCategories']}>
                  <p>{t("ageCatP1")}</p>
                  <ul>
                    <li>{t("ageCatP2")}</li>
                    <li>{t("ageCatP3")}</li>
                  </ul>
                </Collapse>
              </div>
              <div>
                <Button color="primary" onClick={() => toggle('allowedParts')} style={{ marginBottom: '1rem' }}>{t("parts")}</Button>
                <Collapse isOpen={isOpen['allowedParts']}>
                  <p>{t("partsP")}</p>
                </Collapse>
              </div>
              <div>
                <Button color="primary" onClick={() => toggle('team')} style={{ marginBottom: '1rem' }}>{t("teams")}</Button>
                <Collapse isOpen={isOpen['team']}>
                  <p>{t("teamsP")}</p>
                </Collapse>
              </div>
              <div>
                <Button color="primary" onClick={() => toggle('registration')} style={{ marginBottom: '1rem' }}>{t("reg")}</Button>
                <Collapse isOpen={isOpen['registration']}>
                  <p>{t("regP")}</p>
                </Collapse>
              </div>
              <div>
                <Button color="primary" onClick={() => toggle('schedule')} style={{ marginBottom: '1rem' }}>{t("schedule")}</Button>
                <Collapse isOpen={isOpen['schedule']}>
                  <p>{t("scheduleP1")}</p>

                  <ul >
                    <li>{t("scheduleP2")}</li>
                    <li>{t("scheduleP3")}</li>
                  </ul>
                </Collapse>
              </div>

              <div>
                <Button color="primary" onClick={() => toggle('robosumo')} style={{ marginBottom: '1rem' }}>{t("robosumo")}</Button>
                <Collapse isOpen={isOpen['robosumo']}>
                  <p>{t("sumoP")}</p>
                  <ul>
                    <li>{t("limit9m")}</li>
                    <li>{t("max1kg")}</li>
                    <li>{t("max20cm")}</li>
                    <li>{t("size154cm")}</li>
                  </ul>

                  <b>{t("rules_colon")}</b>
                  <ol>
                    <li>{t("sumoRuleP1")}</li>
                    <li>{t("sumoRuleP2")}</li>
                    <li>{t("sumoRuleP3")}</li>
                    <li>{t("sumoRuleP4")}</li>
                    <li>{t("sumoRuleP5")}</li>
                    <li>{t("sumoRuleP6")}</li>
                    <li>{t("sumoRuleP7")}</li>
                    <li>{t("sumoRuleP8")}</li>
                    <li>{t("sumoRuleP9")}</li>
                    <li>{t("sumoRuleP10")}</li>
                    <li>{t("sumoRuleP11")}</li>
                    <li>{t("sumoRuleP12")}</li>
                    <li>{t("sumoRuleP13")}</li>
                    <li>{t("sumoRuleP14")}</li>
                    <li>{t("sumoRuleP15")}</li>
                    <li>{t("sumoRuleP16")}</li>
                    <li>{t("sumoRuleP17")}</li>
                    <li>{t("sumoRuleP18")}</li>
                    <li>{t("sumoRuleP19")}</li>
                    <li>{t("sumoRuleP20")}</li>
                  </ol>

                  <h3 >{t("miniSumo")}</h3>
                  <ul>
                    <li>{t("miniP")}</li>
                    <li>{t("size77cm")}</li>
                    <li>{t("max10cm")}</li>
                    <li>{t("max500g")}</li>
                  </ul>

                  <img src={sumoring} alt={t("altSumoRing")} style={{ maxWidth: '50%', height: '400px' }}/>
          
                </Collapse>
              </div>
              <div>
                <Button color="primary" onClick={() => toggle('lineFollowing')} style={{ marginBottom: '1rem' }}>{t("follow")}</Button>
                <Collapse isOpen={isOpen['lineFollowing']}>
                  <div>
                    <p>{t("followP")}</p>
                    <p>{t("compParams")}</p>
                    <ol>
                      <li>{t("compVariants")}
                        <ul>
                          <li>{t("followP1")}</li>
                          <li>{t("followP2")}</li>
                        </ul>
                      </li>
                      <li>{t("limit3min")}</li>
                      <li>{t("max1kg")}</li>
                      <li>{t("max25cm")}</li>
                      <li>{t("size280cm")}</li>
                    </ol>
                    <p>{t("rules_colon")}</p>
                    <ul>
                      <li>{t("followRuleP1")}</li>
                      <li>{t("followRuleP2")}</li>
                      <li>{t("followRuleP3")}</li>
                      <li>{t("followRuleP4")}</li>
                      <li>{t("followRuleP5")}</li>
                      <li>{t("followRuleP6")}</li>
                      <li>{t("followRuleP7")}</li>
                      <li>{t("followRuleP8")}</li>
                      <li>{t("followRuleP9")}</li>
                      <li>{t("followRuleP10")}</li>
                      <li>{t("variants_colon")}
                        <ul>
                          <li>{t("lego")}</li>
                          <li>{t("mcu")}</li>
                        </ul>
                      </li>
                      <li>{t("track")}</li>
                    </ul>

                    <img src={draha1} alt={t("altLineFollowTrack")} style={{ maxWidth: '50%', height: '200px' }}/>
                    <br></br>
                    <br></br>
                    <img src={draha2} alt={t("altLineFollowTrack")} style={{ maxWidth: '100%', height: '200px' }}/>
                  </div>

                </Collapse>
              </div>
              <div>
                <Button color="primary" onClick={() => toggle('cleanerRobot')} style={{ marginBottom: '1rem' }}>{t("cleaner")}</Button>
                <Collapse isOpen={isOpen['cleanerRobot']}>
                  <div>
                    <p>{t("compParams")}</p>
                    <ul>
                      <li>{t("limit3min")}</li>
                      <li>{t("maxNone")}</li>
                      <li>{t("max25cm")}</li>
                      <li>{t("size140cm")}</li>
                    </ul>
                    <p>{t("commonRules")}</p>
                    <ul>
                      <li>{t("cleanerP1")}</li>
                      <li>{t("cleanerP2")}</li>
                      <li>{t("cleanerP3")}</li>
                      <li>{t("cleanerP4")}</li>
                      <li>{t("cleanerP5")}</li>
                      <li>{t("cleanerP6")}</li>
                      <li>{t("cleanerP7")}</li>
                      <li>{t("cleanerP8")}</li>
                      <li>{t("cleanerP9")}</li>
                      <li>{t("cleanerP10")}</li>
                      <li>{t("cleanerP11")}</li>
                    </ul>
                    <p>{t("variants_colon")}</p>
                    <ol>
                      <li>{t("cleanerV1")}
                        <ul>
                          <li>{t("cleanerV1P1")}</li>
                          <li>{t("cleanerV1P2")}</li>
                        </ul>
                      </li>
                      <li>{t("cleanerV2")}
                        <ul>
                          <li>{t("cleanerV2P1")}</li>
                          <li>{t("cleanerV2P2")}</li>
                          <li>{t("cleanerV2P3")}</li>
                        </ul>
                      </li>
                    </ol>

                    <img src={cleaner} alt={t("altCleanerArena")} style={{ maxWidth: '50%', height: 'auto' }}/>
                  </div>

                </Collapse>
              </div>
              {/* References section */}
              <div>
                <Button color="primary" onClick={() => toggle('references')} style={{ marginBottom: '1rem' }}>{t("reference")}</Button>
                <Collapse isOpen={isOpen['references']}>
                  <ul>
                    <li><a href="http://robogames.net/rules/all-sumo.php" target="_blank" rel="noopener noreferrer">Unified Sumo Robot Rules</a></li>
                    <li><a href="http://robogames.net/rules/line-following.php" target="_blank" rel="noopener noreferrer">Line Following Rules</a></li>
                    <li><a href="http://www.ntf.or.jp/mouse/micromouse2011/ruleclassic-EN.html" target="_blank" rel="noopener noreferrer">Micromouse Japan - rules for Classic Micromouse</a></li>
                    <li><a href="http://cyberneticzoo.com/tag/maze-runner/" target="_blank" rel="noopener noreferrer">Maze Runner Archives</a></li>
                    <li><a href="http://robogames.net/rules/maze.php" target="_blank" rel="noopener noreferrer">Maze Solving / Micromouse Rules</a></li>
                  </ul>
                </Collapse>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Rules;