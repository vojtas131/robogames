import { Row, Col, Card, CardHeader, CardBody } from 'reactstrap';
import { t } from 'translations/translate';
import TemplateEditor from 'components/Diploma/TemplateEditor';

const DiplomaTemplateManagement = () => {
	const placeholderRobot = { robot: { disciplineName: 'Sample Discipline', userNames: ['Test Test', 'Jaromír Pytlík'] }, place: 1 };

	return (
		<div className="content" style={{ height: 'calc(100vh - 148px)', minHeight: 'unset' }}>
			<Row style={{ height: '100%' }}>
				<Col md="12">
					<Card style={{ height: '100%' }}>
						<CardHeader>
							<h2 className="card-title">{t('diplomaTemplate')}</h2>
						</CardHeader>
						<CardBody>
							<TemplateEditor template={"<div><h1>Test</h1></div>"}/>
						</CardBody>
					</Card>
				</Col>
			</Row>
		</div>
	);
};

export default DiplomaTemplateManagement;
