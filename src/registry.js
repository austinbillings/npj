const fs = require('fs')
const path = require('path')
const { omit, fileExists, loadPackage } = require('./utils');

const HOME_DIR = require('os').homedir()
const REGISTRY_PATH = path.resolve(HOME_DIR, '.npj-registry')

const loadRegistry = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf-8'))
const saveRegistry = (registry, filePath) => fs.writeFileSync(filePath, JSON.stringify(registry))

const getRegistry = () => !fileExists(REGISTRY_PATH) ? {} : loadRegistry(REGISTRY_PATH)
const existsInRegistry = (packageName) => Object.keys(getRegistry()).includes(packageName)

const addToRegistry = (packageName, dirPath) => {
    const existingRegistry = getRegistry()
    const addition = { [packageName]: dirPath }
    const updatedRegistry = Object.assign({}, existingRegistry, addition)

    return saveRegistry(updatedRegistry, REGISTRY_PATH)
}

const removeFromRegistry = (packageName) => {
    const existingRegistry = getRegistry()
    const updatedRegistry = omit(existingRegistry, packageName)

    return saveRegistry(updatedRegistry, REGISTRY_PATH)
}

const getPackagePath = (packageName) => {
    if (!existsInRegistry(packageName)) throw `${packageName} is not in your registry`

    return getRegistry()[packageName]
}

const packageHasScript = (packageName, scriptName) => {
    if (!existsInRegistry(packageName)) throw `${packageName} is not in your registry`

    const dirPath = getPackagePath(packageName)
    const package = loadPackage(dirPath)
    const hasScript = Object.keys(package.scripts).includes(packageName)

    return hasScript
}

module.exports = {
    getRegistry,
    addToRegistry,
    removeFromRegistry,
    existsInRegistry,
    getPackagePath,
    packageHasScript
}
