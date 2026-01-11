import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import robotoBlackFont from '../../assets/fonts/Roboto-Black.ttf';
import robotoRegularFont from '../../assets/fonts/Roboto-Regular.ttf';
import logo2 from '../../assets/img/robogames-logo2.png';
import failogo from '../../assets/img/fai-logo.png';

export const PdfDocument = ({ diploms, propsStyles }) => {
	Font.register({
		family: 'Roboto',
		src: robotoBlackFont,
		fontWeight: 'bold',
	});

	Font.register({
		family: 'Roboto',
		src: robotoRegularFont,
		fontWeight: 'normal',
	});

	const styles = StyleSheet.create(
		propsStyles ?? {
			page: {
				flexDirection: 'column',
				alignItems: 'center',
				fontFamily: 'Roboto',
				paddingTop: 20,
				fontSize: 15,
			},
			title: { fontSize: 80, fontWeight: 'bold' },
			teamName: { margin: '6px 0', fontSize: 32 },
			logo: { width: 280 },
			bold: { fontSize: 30, fontWeight: 'bold' },
			footer: {
				position: 'absolute',
				bottom: 50,
				display: 'flex',
				flexDirection: 'row',
				justifyContent: 'space-between',
				alignItems: 'center',
				textAlign: 'center',
				width: '100%',
				padding: '0 50px',
			},
		}
	);

	const currentDate = new Date();
	const formattedDate = `${currentDate.getDate()}.${currentDate.getMonth() + 1}.${currentDate.getFullYear()}`;

	return (
		<Document>
			{diploms.map(({ robot, place }) => (
				<Page key={place} size="A4" style={styles.page}>
					<Image src={logo2} style={styles.logo} />
					<Image src={failogo} style={styles.logo} />
					<Text style={styles.title}>DIPLOM</Text>
					<Text style={styles.teamName}>{robot.userNames}</Text>
					<Text>získává</Text>
					<Text style={styles.bold}>{place}. místo</Text>
					<Text>v robotické soutěži</Text>
					<Text style={{ fontSize: 42 }}>ROBOGAMES {currentDate.getFullYear()}</Text>
					<Text style={{ fontSize: 25 }}>v disciplíně {robot.disciplindeName}</Text>
					<View style={styles.footer}>
						<Text style={{ width: '100%' }}>Ve Zlíně dne {formattedDate}</Text>
						<View style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
							<Text>doc. Ing. Jiří Vojtěšek, Ph.D.</Text>
							<Text>děkan fakulty</Text>
						</View>
					</View>
				</Page>
			))}
		</Document>
	);
};
