const fs = require('fs')
const path = require('path')
const homeDir = require('os').homedir()
const { omit, fileExists } = require('./utils');

const loadRegistry = (registryPath) => JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
const saveRegistry = (registry, registryPath) => fs.writeFileSync(registryPath, JSON.stringify(registry))

const registryPath = path.resolve(homeDir, '.npj-registry')
const getRegistry = () => !fileExists(registryPath) ? {} : loadRegistry(registryPath)
const existsInRegistry = (packageName) => Object.keys(getRegistry()).includes(packageName)

const addToRegistry = (packageName, dirPath) => {
    const existingRegistry = getRegistry()
    const addition = { [packageName]: dirPath }
    const updatedRegistry = Object.assign({}, existingRegistry, addition)

    return saveRegistry(updatedRegistry, registryPath)
}

const removeFromRegistry = (packageName) => {
    const existingRegistry = getRegistry()
    const updatedRegistry = omit(existingRegistry, packageName)

    return saveRegistry(updatedRegistry, registryPath)
}

const getPackagePath = (packageName) => {
    if (!existsInRegistry(packageName)) throw `${packageName} is not in your registry`

    return getRegistry()[packageName]
}

module.exports = {
    getRegistry,
    addToRegistry,
    removeFromRegistry,
    existsInRegistry,
    getPackagePath
}
