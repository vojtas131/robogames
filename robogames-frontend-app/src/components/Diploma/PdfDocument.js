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

	Font.registerHyphenationCallback((word) => [word]);

	const styles = StyleSheet.create(
		propsStyles ?? {
			page: {
				flexDirection: 'column',
				alignItems: 'center',
				fontFamily: 'Roboto',
				paddingTop: 20,
				fontSize: 15,
			},
			logo: { width: 280 },
			title: { fontSize: 80, fontWeight: 'bold' },
			userNames: { margin: '6px 12px', fontSize: 32, textAlign: 'center' },
			gets: {},
			place: { fontSize: 30, fontWeight: 'bold' },
			competition: {},
			competitionYear: { fontSize: 42 },
			discipline: { fontSize: 25 },
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
			footerWhere: { width: '100%' },
			footerAwarder: { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' },
		}
	);

	const currentDate = new Date();
	const formattedDate = `${currentDate.getDate()}.${currentDate.getMonth() + 1}.${currentDate.getFullYear()}`;

	return (
		<Document>
			{diploms.map(({ robot, place }) =>
				robot.userNames.map((_) => (
					<Page key={place} size="A4" style={styles.page}>
						<Image src={logo2} style={styles.logo} />
						<Image src={failogo} style={styles.logo} />
						<Text style={styles.title}>DIPLOM</Text>
						<Text style={styles.userNames}>{robot.userNames.join(', ')}</Text>
						<Text style={styles.gets}>získává</Text>
						<Text style={styles.place}>{place}. místo</Text>
						<Text style={styles.competition}>v robotické soutěži</Text>
						<Text style={styles.competitionYear}>ROBOGAMES {currentDate.getFullYear()}</Text>
						<Text style={styles.discipline}>v disciplíně {robot.disciplindeName}</Text>
						<View style={styles.footer}>
							<Text style={styles.footerWhere}>Ve Zlíně dne {formattedDate}</Text>
							<View style={styles.footerAwarder}>
								<Text>doc. Ing. Jiří Vojtěšek, Ph.D.</Text>
								<Text>děkan fakulty</Text>
							</View>
						</View>
					</Page>
				))
			)}
		</Document>
	);
};
