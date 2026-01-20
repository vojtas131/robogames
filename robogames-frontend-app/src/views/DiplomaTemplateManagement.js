import { Row, Col, Card, CardHeader, CardBody, Form, FormGroup, Button, Input } from 'reactstrap';
import { t } from 'translations/translate';
import { useState, useEffect } from 'react';
import { useUser } from 'contexts/UserContext';
import { useToast } from 'contexts/ToastContext';
import { PDFViewer } from '@react-pdf/renderer';
import { PdfDocument } from 'components/Diploma/PdfDocument';

const DiplomaTemplateManagement = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [value, setValue] = useState('');
	const [debouncedValue, setDebouncedValue] = useState('');
	const { token } = useUser();
	const toast = useToast();

	const placeholderRobot = { robot: { disciplineName: 'Sample Discipline', userNames: ['Test Test', 'Jaromír Pytlík'] }, place: 1 };

	const fetchDiplomaTemplate = async () => {
		setIsLoading(true);
		try {
			const response = await fetch(`${process.env.REACT_APP_API_URL}api/diploma/template`, {
				headers: {
					'Authorization': `Bearer ${token}`,
				},
			});
			const data = await response.json();
			if (response.ok && data.type === 'RESPONSE') {
				setValue(data.data.value);
			} else {
				toast.error(data.data);
			}
		} catch (e) {
			console.log(e);
			toast.error(e);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedValue(value);
		}, 1000);
		return () => clearTimeout(timer);
	}, [value]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsLoading(true);
		try {
			await fetch(`${process.env.REACT_APP_API_URL}api/diploma/template`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`,
				},
				body: JSON.stringify({ value }),
			});
			toast.success(t('dataSaved'));
		} catch (e) {
			console.log(e);
			toast.error(e);
		} finally {
			setIsLoading(false);
		}
	};

	const parseJsonSafe = (str) => {
		try {
			return JSON.parse(str);
		} catch (e) {
			return null;
		}
	};

	const valueJson = parseJsonSafe(debouncedValue);

	useEffect(() => {
		fetchDiplomaTemplate();
	}, []);

	return (
		<div className="content" style={{ height: 'calc(100vh - 148px)', minHeight: 'unset' }}>
			<Row style={{ height: '100%' }}>
				<Col md="12">
					<Card style={{ height: '100%' }}>
						<CardHeader>
							<h4 className="card-title">{t('diplomaTemplate')}</h4>
						</CardHeader>
						<CardBody>
							<Form
								onSubmit={handleSubmit}
								style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
							>
								<FormGroup style={{ flex: 1, width: '100%' }}>
									<Input
										style={{ maxHeight: 'unset', height: '100%' }}
										type="textarea"
										name="value"
										value={value}
										onChange={(e) => setValue(e.target.value)}
										disabled={isLoading}
									/>
								</FormGroup>
								<Button disabled={isLoading} color="primary" type="submit">
									{t('save')}
								</Button>
							</Form>
						</CardBody>
					</Card>
				</Col>
			</Row>
			<Row>
				<Col md="12">
					{valueJson ? (
						<PDFViewer width="100%" height="1200px">
							<PdfDocument diploms={[placeholderRobot]} propsStyles={valueJson || {}} />
						</PDFViewer>
					) : (
						<p style={{ color: 'red' }}>{t('invalidJson')}</p>
					)}
				</Col>
			</Row>
		</div>
	);
};

export default DiplomaTemplateManagement;
