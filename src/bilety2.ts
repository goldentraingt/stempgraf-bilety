import fs from 'fs-extra';
import Jimp from 'jimp';
import configure from '@jimp/custom';
import rotate from '@jimp/plugin-rotate';
const jimp = configure({ plugins: [rotate] }, Jimp);
import PDFMerger from 'pdf-merger-js';

import puppeteer, { PuppeteerNodeLaunchOptions } from 'puppeteer';
import { join } from 'path';

const data = [
	['hex4', 'hex0'],
	['hex18', 'hex14'],
	['hex30', 'hex26'],
	['hex42', 'hex38'],
	['hex54', 'hex50'],
	['hex68', 'hex64'],

	['hex5', 'hex1'],
	['hex19', 'hex15'],
	['hex31', 'hex27'],
	['hex43', 'hex39'],
	['hex55', 'hex51'],
	['hex69', 'hex65'],
];

const textOverlay = async (path: string, outputFile: string, x: number, y: number, rotate: boolean, ticketNumber: number) => {
	const image = await jimp.read(path);

	const font = await jimp.loadFont(jimp.FONT_SANS_16_BLACK);

	const zeros: string = ticketNumber < 10000 ? '00' : '0';

	await image.print(font, x, y, zeros + ticketNumber);

	if (rotate) {
		await image.rotate(90, true).crop(1, 1, 22, 57);
	}

	await image.writeAsync(outputFile);
};

const generatePage = async (startNumber: number, pageNumber: number) => {
	await fs.mkdir(`./output/${startNumber}_${pageNumber}`).catch((_) => _);

	await fs.copy(`./template/images2`, `./output/${startNumber}_${pageNumber}/images2`, { recursive: true }).catch((_) => _);

	for (let i = 0; i < data.length; i++) {
		const asidePath = './template/aside.jpg';
		const asideOutputFile = `./output/${startNumber}_${pageNumber}/images2/${data[i][0]}.jpg`;
		const asideX = 1;
		const asideY = 3;

		await textOverlay(asidePath, asideOutputFile, asideX, asideY, true, startNumber + i * 100 + pageNumber);

		const mainPath = './template/main.jpg';
		const mainOutputFile = `./output/${startNumber}_${pageNumber}/images2/${data[i][1]}.jpg`;
		const mainX = 120;
		const mainY = 50;

		await textOverlay(mainPath, mainOutputFile, mainX, mainY, false, startNumber + i * 100 + pageNumber);
	}

	await fs.copy(`./template/bilety2_2021.htm`, `./output/${startNumber}_${pageNumber}/bilety2_2021.htm`).catch((_) => _);
};

(async () => {
	const puppeteerLaunchOptions: PuppeteerNodeLaunchOptions = {
		headless: true,
		timeout: 10 * 1000,
		userDataDir: './dataDirs',
		args: [
			// '-window-size=1440,900',
			// '--window-position=500,0',
			'--autoplay-policy=user-gesture-required',
			'--disable-background-networking',
			'--disable-client-side-phishing-detection',
			'--disable-component-update',
			'--disable-default-apps',
			'--disable-domain-reliability',
			'--disable-features=AudioServiceOutOfProcess',
			'--disable-hang-monitor',
			'--disable-notifications',
			'--disable-offer-store-unmasked-wallet-cards',
			// '--disable-popup-blocking',
			'--disable-print-preview',
			'--disable-prompt-on-repost',
			'--disable-speech-api',
			'--disable-sync',
			// '--hide-scrollbars',
			'--ignore-gpu-blacklist',
			'--no-default-browser-check',
			'--password-store=basic',
			'--use-gl=swiftshader',
			'--use-mock-keychain',
			'--no-sandbox',
			'--disable-setuid-sandbox',
			'--disable-infobars',
			'--single-process',
			'--no-zygote',
			'--no-first-run',
			'--ignore-certificate-errors',
			'--ignore-certificate-errors-skip-list',
			'--disable-dev-shm-usage',
			'--disable-accelerated-2d-canvas',
			'--disable-gpu',
			'--disable-background-timer-throttling',
			'--disable-backgrounding-occluded-windows',
			'--disable-breakpad',
			'--disable-component-extensions-with-background-pages',
			'--disable-features=TranslateUI,BlinkGenPropertyTrees',
			'--disable-ipc-flooding-protection',
			'--disable-renderer-backgrounding',
			'--enable-features=NetworkService,NetworkServiceInProcess',
			'--force-color-profile=srgb',
			'--metrics-recording-only',
			'--mute-audio',
			'--disable-translate',
			'--disable-background-networking',
			'--safebrowsing-disable-auto-update',
		],
	};

	const browser = await puppeteer.launch(puppeteerLaunchOptions);
	const page = [...(await browser.pages())][0];

	const startNumber = 7200;
	const endNumber = 10400;

	await fs.mkdir('./output/_bilety2_pdf').catch((_) => _);
	await fs.mkdir('./output/_bilety2_pdf/blocks').catch((_) => _);

	for (let i = startNumber; i <= endNumber; i += 1200) {
		for (let j = 1; j <= 100; j++) {
			const isExist: Boolean = await fs
				.access(`./output/${i}_${j}/bilety2_2021.htm`)
				.then(() => true)
				.catch(() => false);

			console.log(`numer bazowy: [${i}] strona: [${j}] [${isExist}]`);

			if (!isExist) {
				await generatePage(i, j);
				console.log('html generated');
			}

			const isAccesstoPdf: Boolean = await fs
				.access(`./output/_bilety2_pdf/${i}_${j}_bilety2_2021.pdf`)
				.then(() => true)
				.catch(() => false);

			if (!isAccesstoPdf) {
				await page.goto(`file:////${join(__dirname, '../', 'output', `${i}_${j}`, 'bilety2_2021.htm')}`);

				await page.pdf({
					format: 'a4',
					path: `./output/_bilety2_pdf/${i}_${j}_bilety2_2021.pdf`,
				});

				console.log('pdf created');
			}
		}

		const pdfFiles: string[] = await fs.readdir('./output/_bilety2_pdf');

		const pdfFilesFromStartNumber: string[] = pdfFiles
			.filter((pdfName: string) => {
				return pdfName.includes(`${i}`);
			})
			.sort((el: string, el2: string) => {
				return Number(el.match(/_(\d*)_/)?.pop() || 0) - Number(el2.match(/_(\d*)_/)?.pop() || 0);
			});

		if (pdfFilesFromStartNumber.length === 100) {
			const firstPart: string[] = pdfFilesFromStartNumber.slice(0, 50);
			const secondPart: string[] = pdfFilesFromStartNumber.slice(50);

			const merger = new PDFMerger();

			firstPart.map(async (el) => {
				merger.add(`./output/_bilety2_pdf/${el}`);
			});

			await merger.save(`./output/_bilety2_pdf/blocks/${i}_1-50.pdf`);

			secondPart.map(async (el) => {
				merger.add(`./output/_bilety2_pdf/${el}`);
			});

			await merger.save(`./output/_bilety2_pdf/blocks/${i}_51-100.pdf`);

			console.log('merged files');
		}
	}
})();
