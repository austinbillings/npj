const path = require('path');
const fs = require('fs')

function loadPackage (dirPath) {
    const packagePath = path.resolve(dirPath, 'package.json')
    const hasPackage = fileExists(packagePath)

    if (!hasPackage) throw `No package.json detected in directory: ${dirPath}`

    return require(packagePath);
}

function fileExists (path) {
	let exists = false;
	try {
		const stats = fs.statSync(path);
		exists = true;
	} catch (e) {}
	return exists;
}

function omit (obj, key) {
    return Object
        .keys(obj)
        .filter(k => k !== key)
        .reduce((o, k) => Object.assign({}, o, { [k]: obj[k] }), {})
}

function dirExists (path) {
	let exists = false;
	try {
		const stats = fs.statSync(path);
		return stats.isDirectory();
	} catch (e) {}
	return exists;
}

module.exports = {
    fileExists,
    dirExists,
    omit,
    loadPackage
};
