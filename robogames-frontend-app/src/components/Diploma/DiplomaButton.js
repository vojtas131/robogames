import { useState } from 'react';
import { Button } from 'reactstrap';
import { useUser } from 'contexts/UserContext';
import html2pdf from 'html2pdf.js';
import { t } from "translations/translate";

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
				const object = data.data.value;
				return object;
			} else {
				console.error('Failed to fetch styles:', data);
				return null;
			}
		} catch (e) {
			console.log(e);
		}
	};

	const getCategoryLabel = (cat) => {
		if (cat === 'HIGH_AGE_CATEGORY') return t("students");
		if (cat === 'LOW_AGE_CATEGORY') return t("pupils");
		return cat;
	};

	async function generateBulkPDF() {
		const currentDate = new Date();
		const formattedDate = `${currentDate.getDate()}.${currentDate.getMonth() + 1}.${currentDate.getFullYear()}`;
		setIsLoading(true);
		try {
			const template = await fetchStyles();
			// Styles so each diplom is on different A4 page
			let finalHtmlString = `
				<style>
				@import url('https://cdn.jsdelivr.net/npm/suneditor@latest/dist/css/suneditor.min.css');

				@font-face {
					font-family: 'Roboto';
					src: url('/fonts/Roboto-Regular.ttf') format('truetype');
					font-weight: normal;
					font-style: normal;
				}

				@font-face {
					font-family: 'Roboto';
					src: url('/fonts/Roboto-Black.ttf') format('truetype');
					font-weight: bold;
					font-style: normal;
				}
				.diploma-page { 
					page-break-after: always;
					position: relative;
					width: 210mm;
					height: 290mm;
				}
				.diploma-page:last-child {
					page-break-after: auto; 
				}
				body { font-family: Roboto; margin: 0; padding: 0; }
				.sun-editor-editable {
					border: none !important;
					outline: none !important;
					padding: 0 !important;
				}
				</style>
				<div id="pdf-master-wrapper" class="sun-editor-editable">
			`;

			console.log(data);

			data.forEach(({ robot, place }) => {
				console.log(robot);
				robot.userNames.forEach((_) => {
					let personalizedHtml = template;
					
					personalizedHtml = personalizedHtml.replace(/{{name}}/g, robot.userNames.join(', '));
					personalizedHtml = personalizedHtml.replace(/{{place}}/g, place);
					personalizedHtml = personalizedHtml.replace(/{{currentYear}}/g, currentDate.getFullYear());
					personalizedHtml = personalizedHtml.replace(/{{disciplineName}}/g, robot.disciplindeName);
					personalizedHtml = personalizedHtml.replace(/{{category}}/g, getCategoryLabel(robot.category));
					personalizedHtml = personalizedHtml.replace(/{{formattedDate}}/g, formattedDate);

					finalHtmlString += `<div class="diploma-page">${personalizedHtml}</div>`;
				});
			});
			finalHtmlString += `</div>`;

			const elementToPrint = document.createElement('div');
			elementToPrint.innerHTML = finalHtmlString;

			console.log(elementToPrint);

			// 4. Nastavení pro html2pdf
			const pdfOptions = {
				margin: 0, // Okraje si řešíš uvnitř HTML šablony přes padding, tady dáme 0
				filename: 'diplomy-export.pdf',
				image: { type: 'jpeg', quality: 0.98 },
				
				// Extrémně důležité: řekneme knihovně, ať respektuje naše CSS stránkování
				pagebreak: { mode: ['css', 'legacy'] },
				
				// Scale 2 zajistí, že texty a obrázky nebudou rozmazané
				html2canvas: { scale: 2, useCORS: true },
				
				// Formát papíru - landscape pro diplom na šířku, portrait na výšku
				jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
			};
			
			html2pdf().set(pdfOptions).from(elementToPrint).toPdf().get('pdf').then((pdf) => {
				window.open(URL.createObjectURL(pdf.output('blob')), '_blank');
			});
		}
		catch (e) {
			console.log(e);
		}
		finally {
			setIsLoading(false);
		}
	};

	/*
	async function generatePdf() {
		setIsLoading(true);
		try {
			const styles = await fetchStyles();
			const blob = await pdf(<PdfDocument diploms={propsData} propsStyles={styles} />).toBlob();
			const url = URL.createObjectURL(blob);
			window.open(url, '_blank').focus();
		} catch (err) {
			console.log(err);
		} finally {
			setIsLoading(false);
		}
	}
	*/

	return (
		<Button {...props} disabled={isLoading || props.disabled} onClick={generateBulkPDF}>
			{children}
		</Button>
	);
};
