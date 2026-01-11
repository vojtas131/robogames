import { useState } from 'react';
import { Button } from 'reactstrap';
import { pdf } from '@react-pdf/renderer';
import { PdfDocument } from 'components/Diploma/PdfDocument';
import { useUser } from 'contexts/UserContext';

export const DiplomaButton = ({ data, children, ...props }) => {
	const [isLoading, setIsLoading] = useState(false);
	const { token } = useUser();

	const fetchStyles = async () => {
		try {
			const response = await fetch(`${process.env.REACT_APP_API_URL}api/diploma/template`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
			const data = await response.json();
			if (response.ok && data.type === 'RESPONSE') {
				const object = JSON.parse(data.data.value);
				return object;
			} else {
				console.error('Failed to fetch styles:', data);
				return null;
			}
		} catch (e) {
			console.log(e);
		}
	};

	async function generatePdf() {
		setIsLoading(true);
		try {
			const styles = await fetchStyles();
			const blob = await pdf(<PdfDocument diploms={data} propsStyles={styles} />).toBlob();
			const url = URL.createObjectURL(blob);
			window.open(url, '_blank').focus();
		} catch (err) {
			console.log(err);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<Button style={props.style} disabled={isLoading} onClick={generatePdf}>
			{children}
		</Button>
	);
};
