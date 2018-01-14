const htmlValidator = require('html-validator');
const { pathExists } = require('fs-extra');
const {
	join,
	basename
} = require('path');
const htmlValidatorConfig = require('../configs/html.validator.config');
const {
	PROJECT_ROOT,
	OUTPUT_DIRECTORY,
	boldString,
	redString,
	getFiles,
	customReadFile,
	shortenPath
} = require('./core');


const OUTPUT = join(PROJECT_ROOT, OUTPUT_DIRECTORY);
let HTML;
let HTML_SIZE;

async function validateHTML(filePath) {
	const config = Object.assign({}, htmlValidatorConfig, { data: await customReadFile(filePath) });
	htmlValidator(config, (error, data) => {
		if (error) throw error;
		console.log(boldString(`validate ${basename(filePath)}:`), `\n${data}\n`);
	});
}

async function initHTMLValidator() {
	const validatedHTML = [];
	if (await pathExists(OUTPUT)) {
		HTML = await getFiles(`${OUTPUT}/!(sitegrid|styles).html`);
		HTML_SIZE = HTML.length;
		for (let i = 0; i < HTML_SIZE; i++) {
			validatedHTML.push(validateHTML(HTML[i]));
		}
		Promise.all(validatedHTML);
	} else {
		console.log(boldString(redString('error:')), `${shortenPath(OUTPUT)} does not exist`);
	}
}

initHTMLValidator();
