const cheerio = require('cheerio');
const glob = require('glob-promise');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const camelcase = require('camelcase');

const { icons } = require('../src/icons');

// file path
const rootDir = path.resolve(__dirname, '../');
const DIST = path.resolve(rootDir, '.');

// logic

async function getIconFiles(icon) {
  return glob(icon.files);
}
async function convertIconData(svg) {
  const $svg = cheerio.load(svg, { xmlMode: true })('svg');

  // filter/convert attributes
  // 1. remove class attr
  // 2. convert to camelcase ex: fill-opacity => fillOpacity
  const attrConverter = (
    /** @type {{[key: string]: string}} */ attribs,
    /** @type string */ tagName
  ) =>
    attribs &&
    Object.keys(attribs)
      .filter(
        name =>
          ![
            'class',
            ...(tagName === 'svg' ? ['xmlns', 'width', 'height'] : []) // if tagName is svg remove size attributes
          ].includes(name)
      )
      .reduce((obj, name) => {
        const newName = camelcase(name);
        obj[newName] = attribs[name];
        return obj;
      }, {});

  // convert to [ { tag: 'path', attr: { d: 'M436 160c6.6 ...', ... }, child: { ... } } ]
  const elementToTree = (/** @type {Cheerio} */ element) =>
    element
      .filter((_, e) => e.tagName && !['style'].includes(e.tagName))
      .map((_, e) => ({
        tag: e.tagName,
        attr: attrConverter(e.attribs, e.tagName),
        child:
          e.children && e.children.length
            ? elementToTree(cheerio(e.children))
            : undefined
      }))
      .get();

  const tree = elementToTree($svg);
  return tree[0]; // like: [ { tag: 'path', attr: { d: 'M436 160c6.6 ...', ... }, child: { ... } } ]
}
function generateIconRow(icon, formattedName, iconData) {
  return `module ${formattedName} = Icons.Make({ let iconName = "${formattedName}", let iconData = ${JSON.stringify(
    iconData
  )} });\n`;
}

async function dirInit() {
  const ignore = err => {
    if (err.code === 'EEXIST') return;
    throw err;
  };

  const mkdir = promisify(fs.mkdir);
  const writeFile = promisify(fs.writeFile);

  await mkdir(DIST).catch(ignore);

  const write = (filePath, str) =>
    writeFile(path.resolve(DIST, ...filePath), str, 'utf8').catch(ignore);

  const gitignore =
    ['# autogenerated', ...icons.map(icon => `${icon.id}.re`)].join('\n') +
    '\nREADME.md\n\n';
  writeFile(path.resolve(DIST, '.gitignore'), gitignore);

  for (const icon of icons) {
    await write(
      ['src', `${camelcase(icon.id)}.re`],
      '/* THIS FILE IS AUTO GENERATED*/\n/*open ReactIcons;*/\n'
    );
  }
}
async function writeIconModule(icon) {
  const appendFile = promisify(fs.appendFile);
  const files = await getIconFiles(icon);
  const exists = new Set(); // for remove duplicate

  for (const file of files) {
    const svgStr = await promisify(fs.readFile)(file, 'utf8');
    const iconData = await convertIconData(svgStr);

    const rawName = path.basename(file, path.extname(file));
    const pascalName = camelcase(rawName, { pascalCase: true });
    const name = (icon.formatter && icon.formatter(pascalName)) || pascalName;
    if (exists.has(name)) continue;
    exists.add(name);

    // write like: module/fa/data.mjs
    const modRes = generateIconRow(icon, name, iconData);
    await appendFile(path.resolve('./src', `${icon.id}.re`), modRes, 'utf8');

    exists.add(file);
  }
}

async function writeLicense() {
  const copyFile = promisify(fs.copyFile);
  const appendFile = promisify(fs.appendFile);

  const iconLicenses =
    icons
      .map(icon =>
        [
          `${icon.name} - ${icon.projectUrl}`,
          `License: ${icon.license} ${icon.licenseUrl}`
        ].join('\n')
      )
      .join('\n\n') + '\n';

  await copyFile(
    path.resolve(rootDir, 'LICENSE_HEADER'),
    path.resolve(rootDir, 'LICENSE')
  );
  await appendFile(path.resolve(rootDir, 'LICENSE'), iconLicenses, 'utf8');
}

async function main() {
  try {
    await dirInit();
    await writeLicense();
    // await writeIconsManifest();
    for (const icon of icons) {
      await writeIconModule(icon);
    }
    console.log('done');
  } catch (e) {
    console.error(e);
  }
}
main();
