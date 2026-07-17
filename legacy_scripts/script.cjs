const fs = require('fs');

const data = `28/1/2026 17:10:49	46388761	Naomi Nahir Gazal 	naogazal10@gmail.com	20	Barrio cámpora Mz H casa 4 	3754522753	9/2/2005	Leandro N. Alem	Ballet Bailar y Vivir		27463887611	Gazal Naomi 		naogazal10@gmail.com
28/1/2026 17:15:04	42715605	Piñeiro Martín Alejandro	martinchook17@gmail.com	25	Barrio cámpora Mz H casa 4 	3754439412	17/5/2000	Leandro N. Alem	Ballet Bailar y Vivir		20426156053	Piñeiro Martín 		martinchook17@gmail.com
30/1/2026 15:26:33	55048458	Keyla Franco	marianafranco1221@gmail.com	11	Barrio alem 2 casa 22	3754533498	2/11/2015	Leandro N. Alem	Profesorado Infantil ( Desde 7 años)	1er Año Preparatorio	27364707490	Franco Mariana		marianafranco1221@gmail.com
5/2/2026 10:20:32	43528949	Cintia soledad Burg 	burgcintia1@gmail.com	25	Bonpland 311	3754504509	10/3/2000	Leandro N. Alem	Profesorado/Instructorado Adultos (Desde 15 años)	1er Año Preparatorio	27435289490	Burg Cintia soledad		burgcintia1@gmail.com
9/2/2026 12:30:48	56240798	Tiziano Lautaro brites	mcaraben@gmail.com	7	Barrio primero de mayo 	3764759756	16/3/2018	Cerro Azul	Profesorado Infantil ( Desde 7 años)	1er Año Preparatorio	27392225388	Mariana Isabel caraben 		mcaraben@gmail.com
9/2/2026 16:38:21	53796732	Benjamín Maximiliano Losanto	marcelalosanto025@gmail.com	11	Bonpland 115	3754432414	31/3/2014	Leandro N. Alem	Profesorado Infantil ( Desde 7 años)	3er Año Elemental	27419951787	Marcela Losanto 		marcelalosanto025@gmail.com
9/2/2026 19:27:09	53090248	Candela Jazmín Wach	rosciszewski22yamila@gmail.com	12	San Cayetano 228	3754402554	15/4/2013	Leandro N. Alem	Profesorado Infantil ( Desde 7 años)	3er Año Preparatorio	27368931387	Rosciszewski Yamila		rosciszewski22yamila@gmail.com
18/2/2026 11:14:02	55617160	Guadalupe Xiomara Aguirre	lilianabarboza57@gmail.com	9	Arroyo del medio lote 3 mzE	03754402825	8/11/2016	Arroyo del Medio	Profesorado Infantil ( Desde 7 años)	2do Año Preparatorio	23330733004	Barboza Liliana Ines		lilianabarboza57@gmail.com
24/2/2026 11:54:40	57607912	VICTORIA MACIEL KREISCHER	soniakreischer@yahoo.com.ar	7	BUENOS AIRES 233	3754478360	25/4/2019	Leandro N. Alem	Paisanitos ( Hasta 7 años Mixto)		27269872964	KREISCHER SONIA		soniakreischer@yahoo.com.ar
24/2/2026 13:43:40	52302885	Leite Triana Elizabeth 	roselizabert@gmail.com	13	Loteo fao lote 3 Mz 13	3754457934	15/10/2012	Leandro N. Alem	Folklore un Lenguaje Artístico (+12)		27347947763	Leite Rosana Elizabet 		roselizabert@gmail.com
24/2/2026 15:22:39	53785766	Zoe Alexia Frenna 	npf_886@hotmail.com	11	Avenida Güemes 678 	3754498204	30/7/2014	Leandro N. Alem	Folklore Creativo (-12)		31789982	Frenna Nicolás Paolo 		npf_886@hotmail.com
24/2/2026 19:00:37	53785780	Ona Guillermina Arndt	eugemino14@gmail.com	11	Juan Jose Paso 665	3754431943	21/8/2014	Leandro N. Alem	Profesorado Infantil ( Desde 7 años)	3er Año Preparatorio	30078018	Miño Eugenia Ivana		eugemino14@gmail.com
24/2/2026 20:47:16	53536539	Romero Pona Luz Milagros 	maesro22romero@gmail.com	12	Barrio illia casa 109	15466849	22/11/2013	Leandro N. Alem	Profesorado Infantil ( Desde 7 años)	3er Año Elemental	32609218	Romero Ester Pona Daniel		maesro22romero@gmail.com
26/2/2026 16:12:07	53785766	Zoe Alexia Frenna 	npf_886@hotmail.com	11	Avenida Güemes 678 Leandro N. Alem Misiones 	3754498204	30/7/2011	Leandro N. Alem	Profesorado Infantil ( Desde 7 años)	3er Año Preparatorio	31789982	Frenna Nicolás Paolo 		npf_886@hotmail.com
28/2/2026 10:29:03	56369053	Gia Amelie	eugemino14@gmail.com	8	Juan jose paso 665	3754431943	9/6/2017	Leandro N. Alem	Folklore Creativo (-12)		30078018	Miño Eugenia Ivana 		eugemino14@gmail.com
28/2/2026 18:10:03	53796732	Benjamín Maximiliano Losanto	marcelalosanto025@gmail.com	11	Bonpland 115	3754432414	31/3/2014	Leandro N. Alem	Profesorado Infantil ( Desde 7 años)	3er Año Elemental	27419951787	Marcela yaquelin Losanto 		marcelalosanto025@gmail.com
2/3/2026 11:49:15	52739073	Brenda Anahi Back 	sandraisabeldasilva1@gmail.com	13	Loteo Fao Lote 9 Mz6 	3754529218	28/11/2012	Leandro N. Alem	Folklore un Lenguaje Artístico (+12)		27330735355	Da Silva Sandra Isabel 		sandraisabeldasilva1@gmail.com
2/3/2026 16:46:55	58733735	Noa Samara Duran Quensell	silviaa.quensell@gmail.com	4	Juan Pablo ll Mz 143 casa 11	3754451548	11/5/2021	Leandro N. Alem	Paisanitos ( Hasta 7 años Mixto)		32609356	Quensell silvia		silviaa.quensell@gmail.com
2/3/2026 22:15:52	53537483	Sofía Itati Cardozo Gómez Fernandez	carlagofernandez1612@gmail.com	12	Itacaruare 	3754495317	16/12/2013	Itacaruaré	Profesorado Infantil ( Desde 7 años)	2do Año Elemental	27372237444	Carla Gómez Fernandez		carlagofernandez1612@gmail.com
3/3/2026 17:45:12	52309302	Llamosas Renata Valentina 	andreaferreiraa7@gmail.com	13	Itacuruaré	3754491063	6/9/2012	Itacaruaré	Profesorado Infantil ( Desde 7 años)	2do Año Elemental	35012496	Ferreira Andrea Maricel 		andreaferreiraa7@gmail.com
4/3/2026 17:16:13	55697881	Gianna Josefina Alarcón francesconi 	yan-y010@hotmail.com	9	San Javier 71	3754526025	8/2/2017	Leandro N. Alem	Folklore Creativo (-12)		27311108243	Yanina Mariel francesconi		yan-y010@hotmail.com
7/3/2026 8:57:05	52300816	Da Rosa Luz Morena 	Marianadsrosa@gmail.com	14	Barrio El Progreso 	3754436677	2/3/2012	Itacaruaré	Folklore un Lenguaje Artístico (+12)		32303956	Da Rosa Mariana		Marianadsrosa@gmail.com
7/3/2026 17:18:34	48266790	MELINA AYLÉN FERREIRA 	yaamiiisuarezz@gmail.com	18	Barrio ILLIA casa 128	3754473017	7/2/2008	Leandro N. Alem	Profesorado/Instructorado Adultos (Desde 15 años)	1er Año Superior	31792126	SUÁREZ YAMILA 		yaamiiisuarezz@gmail.com
9/3/2026 9:55:56	48266790	ferreira melina	nelinferreira54@gmail.com	18	barrio illia 128	3754473017	8/2/2008	Leandro N. Alem	Profesorado/Instructorado Adultos (Desde 15 años)	3er Año Elemental	31792126	yamila suarez		nelinferreira54@gmail.com
9/3/2026 11:23:23	41851970	Carballo Leonardo Sebastian 	leonardosebastiancarballo@gmail.com	26	Mayordomo olivera 1196	3754406409	6/4/1999	Leandro N. Alem	Profesorado/Instructorado Adultos (Desde 15 años)	1er Año Elemental	41851970	Carballo Leonardo Sebastian 		leonardosebastiancarballo@gmail.com
10/3/2026 11:11:05	58420837	Alma Milenna Piñeiro	gladyspineiro92@gmail.com	5	Barrio Virgen del Rosario C.19 Mza B. Las Rosas L.N. Alem	3754525967	2/11/2020	Leandro N. Alem	Paisanitos ( Hasta 7 años Mixto)		45789908	Piñeiro Abril Soledad		gladyspineiro92@gmail.com
10/3/2026 14:52:32	55488299	Ghisleyne Mariel Pawluk 	carmenpolopawluk@gmail.com	9	Lote 632 (Itacaruare)	3754533553	1/8/2016	Itacaruaré	Profesorado Infantil ( Desde 7 años)	2do Año Preparatorio	27278880058	Polo, María del Carmen		carmenpolopawluk@gmail.com
10/3/2026 20:58:29	50662259	Piriz Horiana Nahiara	horianapiriz@gmail.com	15	La corita 	3758571983	10/1/2011	La Corita	Profesorado/Instructorado Adultos (Desde 15 años)	2do Año Preparatorio	31524709	Ferreira Andrea		horianapiriz@gmail.com
10/3/2026 21:47:56	55777006	Florencia Agustina Roballo	fabiinesalvez@hotmail.com	9	Itacaruare Ruta Prov. N° 2	3754402449	31/8/2016	Itacaruaré	Profesorado Infantil ( Desde 7 años)	2do Año Preparatorio	27326094612	Alvez Fabiana Ines		fabiinesalvez@hotmail.com
16/3/2026 18:08:50	58604845	Raffael Austyn Escalante 	rocio_noe25@outlook.com	5	Loteo Graf Lote U N°1 L.N.Alem 	3764717379	24/2/2021	Leandro N. Alem	Paisanitos ( Hasta 7 años Mixto)		33926008	Márquez Rocío Noelia 		rocio_noe25@outlook.com
17/3/2026 20:03:44	53796813	Thiago Francisco Ramos de matos 	roxanademattos@gmail.com	11	Itacaruare 	3754527738	20/3/2014	Itacaruaré	Profesorado Infantil ( Desde 7 años)	1er Año Preparatorio	39225800	Roxana andrea ramos de matto		roxanademattos@gmail.com
19/3/2026 13:00:08	52301700	Xiomara Belen Aguilera 	britezmarina966@gmail.com	13	Mateo estacala RN°2	3754478246	25/3/2013	Itacaruaré	Profesorado Infantil ( Desde 7 años)	1er Año Preparatorio	37325768	Britez marina mablel		britezmarina966@gmail.com
31/3/2026 7:22:43	34896657	Sanabria Benjamín Fernando 	fernalop90@gmail.com	10	Juana konopka y Unión nacional 1506	3754434865	20/11/2015	Leandro N. Alem	Folklore un Lenguaje Artístico (+12)		27348966575	Piñeiro Fernanda Lorey 		fernalop90@gmail.com
31/3/2026 8:35:14	53963778	Rodríguez Sofía Itati	yaninaalmeida535@gmail.com	9	Manuel Alvares y Sarmiento	3754476413	24/5/2016	Itacaruaré	Profesorado Infantil ( Desde 7 años)	2do Año Preparatorio	27348968624	Almeida Yanina 		yaninaalmeida535@gmail.com
1/4/2026 21:31:31	55777087	Ayala Erik Benjamin	scromedavanessa@gmail.com	8	Calle San Lorenzo Itacaruaré	3754533742	3/5/2017	Itacaruaré	Folklore Creativo (-12)		37223782	Scromeda Vanesa/Ayala Jose Luis		scromedavanessa@gmail.com
2/4/2026 13:09:56	43331812	Natali Yaquelin Baez 	yaquelinbaez845@gmail.com	24	L.CROCCE S/N L-11	3765075392	6/4/2026	Cerro Azul	Profesorado/Instructorado Adultos (Desde 15 años)	2do Año Preparatorio	28552258	Rosa Graciela Ramos 		yaquelinbaez845@gmail.com
6/4/2026 14:05:58	37473721	Evelin Itatí Suarez 	eveliinszz@gmail.com	32	Sargento Cabral y Sarasola 	3764728829	28/3/1994	Cerro Azul	Profesorado/Instructorado Adultos (Desde 15 años)	1er Año Preparatorio	37473721	Suarez Evelin Itatí 		eveliinszz@gmail.com
6/4/2026 14:19:39	36456601	Yesica belen ferreyra	yesicabelenferreyra5@gmail.com	32	Barrio sauer	3764672625	29/3/2004	Cerro Azul	Profesorado/Instructorado Adultos (Desde 15 años)	2do Año Preparatorio	27364566013	Ferreyra yesica belén 		yesicabelenferreyra5@gmail.com
6/4/2026 14:55:04	36456529	Araujo Mariza Itatí 	marizaitatiaraujo@gmail.com	33	Cerro azul 	3754527092	24/3/1993	Cerro Azul	Profesorado/Instructorado Adultos (Desde 15 años)	2do Año Preparatorio	27364565297	Araujo Mariza Itatí 		marizaitatiaraujo@gmail.com
16/4/2026 18:04:08	58733745	Clohe Liz Kubiszen 	lizmalvaamaro@icloud.com	4	Ambay 136	3754414522	8/6/2021	Leandro N. Alem	Paisanitos ( Hasta 7 años Mixto)		30752609	Amaro Liz malva 		lizmalvaamaro@icloud.com
17/4/2026 11:10:20	42515010	Francesconi Agustina Nazarena 	agustinafrancesconi70@gmail.com	26	Cerro Azul 	3764713429	14/4/0000	Cerro Azul	Profesorado/Instructorado Adultos (Desde 15 años)	2do Año Preparatorio	2742515010	Francesconi Agustina Nazarena 		agustinafrancesconi70@gmail.com
17/4/2026 13:09:43	54867338	Victoria Yazmin Engers	rojasclaraines123@gmail.com	10	Avenida San Martin	3754439836	7/9/2015	Itacaruaré	Profesorado Infantil ( Desde 7 años)	1er Año Preparatorio	28556510	Clara Ines Rojas		rojasclaraines123@gmail.com
18/4/2026 11:07:57	52300811	Engel malena belén 	martakunz59@gmail.com	14	25 de mayo y san martin	3743498495	1/3/2012	Leandro N. Alem	Profesorado/Instructorado Adultos (Desde 15 años)	1er Año Preparatorio	26113130	Kunz marta francisca		martakunz59@gmail.com
23/4/2026 12:46:24	46390849	Ciro Benjamín Nolasco 	delimanoemi6@gmail.com	8	Barrio Campora mz G casa 10	3754466398	5/4/2018	Leandro N. Alem	Paisanitos ( Hasta 7 años Mixto)		27285390341	De Lima Clara Noemi 		delimanoemi6@gmail.com
7/5/2026 13:03:13	34234803	Leites Franco Emmanuel 	leitesfrancoemmanuel@gmail.com	32	Lote 197 Arroyo del Medio 	3754465877	30/12/1993	Leandro N. Alem	Profesorado/Instructorado Adultos (Desde 15 años)	3er Año Elemental	34234803	Leites Franco 		leitesfrancoemmanuel@gmail.com
21/5/2026 21:05:42	34422662	Sol Betiana Yagus	giselaantonietaalvez2@gmail.com	11	Cataratas del Iguazú 780	3754441392	18/7/2014	Leandro N. Alem	Folklore un Lenguaje Artístico (+12)		27344226223	Gisela Alvez 		giselaantonietaalvez2@gmail.com
28/5/2026 19:52:29	56679080	Angelina Boronski Galarza 	andreaangelinagalarza7@gmail.com	8	Calle Haití 	374437765	19/2/2018	Leandro N. Alem	Folklore Creativo (-12)		28539161	Galarza Andrea Angelina 		andreaangelinagalarza7@gmail.com
3/6/2026 8:36:32	54716470	Melani Guadalupe Correa	cabreramariaeugenia311@gmail.com	10	Barrio belgrano calle maestro amatta 77	3764104866	26/9/2015	Leandro N. Alem	Folklore un Lenguaje Artístico (+12)		37159085	Arruda Maria Eugenia		cabreramariaeugenia311@gmail.com
9/6/2026 13:40:12	55617400	Francesca Aytana Sanabria 	alecorr28@gmail.com	10	Snarbach 134	3754455583	28/5/2016	Leandro N. Alem	Profesorado Infantil ( Desde 7 años)	1er Año Preparatorio	36060802	Correa da Silva 		alecorr28@gmail.com
18/6/2026 19:15:27	55046930	Francisco Nestor 	neguikpp@gmail.com	9	Mecking 256	3754456868	27/3/2017	Leandro N. Alem	Folklore Creativo (-12)		34515584	Knipp Andrea Soledad 		neguikpp@gmail.com
10/3/2026 21:47:56	56371122	Ana Paula Dallabrida	soleocara28@gmail.com	8	Cristo Rey 608	3764391815	07/08/2017	Leandro N. Alem	Folklore Creativo (-12)		27285926098	Ocampo Rafaela	Folklore Creativo (-12) 	soleocara28@gmail.com
6/4/2026 14:19:39	11111111	Amelia Fernanda Leal	andersenrafaela@gmail.com	5	gobernadores 1575	3754659925	01/03/2021	Leandro N. Alem	Paisanitos ( Hasta 7 años Mixto)		23317902514	Andersen Rafaela	Paisanitos ( Hasta 7 años Mixto) 	andersenrafaela@gmail.com
6/4/2026 14:19:39	22222222	Rocio Hupan	mariayandreshupan@gmail.com	10	av. Belgrano 1033	3754419221	18/11/2015	Leandro N. Alem	Folklore Creativo (-12)			Noelia Hupan	Folklore Creativo (-12) 	mariayandreshupan@gmail.com
6/4/2026 14:19:39	33333333	Isabella Hupan	mariayandreshupan@gmail.com	10	av. Belgrano 1033	3754419221	18/11/2015	Leandro N. Alem	Folklore Creativo (-12)			Noelia Hupan	Folklore Creativo (-12) 	mariayandreshupan@gmail.com`;

const lines = data.split('\n').map(l => l.trim()).filter(l => l);

const existingContent = fs.readFileSync('src/data/seedData.js', 'utf8');

// Match existing array items inside SEED_STUDENTS
const existingRegex = /\{[^}]+\}/g;
const studentsMatch = existingContent.match(/export const SEED_STUDENTS = \[([\s\S]*?)\];/);

let existingStudents = [];
if (studentsMatch) {
    const rawItems = studentsMatch[1].match(existingRegex);
    if (rawItems) {
        existingStudents = rawItems.map(item => {
            // Very hacky parse
            const idMatch = item.match(/id:\s*"([^"]+)"/);
            const dniMatch = item.match(/dni:\s*"([^"]+)"/);
            return {
                raw: item,
                dni: dniMatch ? dniMatch[1] : (idMatch ? idMatch[1] : null)
            };
        });
    }
}

const dniSet = new Set(existingStudents.map(s => s.dni).filter(Boolean));

const newStudents = [];
lines.forEach(line => {
    const cols = line.split('\t');
    if (cols.length < 13) return;
    const dni = cols[1].trim();
    if (dniSet.has(dni)) return; // skip duplicates
    dniSet.add(dni);
    
    const name = cols[2].trim();
    const email = cols[3].trim();
    const address = cols[5].trim();
    const phone = cols[6].trim();
    const sede = cols[8].trim();
    const taller = cols[9].trim();
    const nivel = cols[10].trim() || 'No Asignado';
    const tutor = cols[12].trim();
    
    // Some logic to parse "nivel" correctly
    let parsedLevel = nivel;
    if (nivel.includes("1er Año Preparatorio")) parsedLevel = "1ro Preparatorio";
    else if (nivel.includes("2do Año Preparatorio")) parsedLevel = "2do Preparatorio";
    else if (nivel.includes("3er Año Preparatorio")) parsedLevel = "3er Preparatorio";
    else if (nivel.includes("1er Año Elemental")) parsedLevel = "1ro Elemental";
    else if (nivel.includes("2do Año Elemental")) parsedLevel = "2do Elemental";
    else if (nivel.includes("3er Año Elemental")) parsedLevel = "3er Elemental";
    else if (nivel.includes("1er Año Superior")) parsedLevel = "Profesorado / Superior";
    
    newStudents.push(`    { id: "${dni}", name: "${name}", dni: "${dni}", level: "${parsedLevel}", sede: "${sede}", phone: "${phone}", email: "${email}", tutor: "${tutor}", address: "${address}", taller: "${taller}", active: true }`);
});

// For existing students, I should update them to add "taller" property, but maybe it's simpler to just append the missing ones, with their "taller" property.
// However, the user said "agrega los alumnos que faltan segun la columna j... (paisanitos, etc)". 

let updatedListStr = existingStudents.map(s => "    " + s.raw).concat(newStudents).join(",\n");

const newContent = existingContent.replace(
    /export const SEED_STUDENTS = \[([\s\S]*?)\];/,
    `export const SEED_STUDENTS = [\n${updatedListStr}\n];`
);

fs.writeFileSync('src/data/seedData.js', newContent, 'utf8');

console.log("Added " + newStudents.length + " missing students.");
