const zaq = require('zaq').as('NPJ')
const { spawn, exec } = require('child_process')
const { dim, cyan, reset, bold, yellow } = require('chalk')
const { loadPackage } = require('./utils')
const { existsInRegistry, getPackagePath, addToRegistry, removeFromRegistry, getRegistry } = require('./registry')

const CURRENT_DIR_PATH = process.cwd()

function handleAddPackage (dirPath) {
    const package = loadPackage(dirPath)
    const packageExists = existsInRegistry(package.name)
    const existingPackagePath = packageExists ? getPackagePath(package.name) : null
    const banner = `${package.name} -> ${dirPath} ${cyan(`@${package.version}`)}`

    if (packageExists && dirPath === existingPackagePath)
        return zaq.ok(`${banner} ${dim('(already set)')}`)
    if (packageExists && !options.force)
        throw `"${package.name}" is already in the registry; currently set to ${existingPackagePath}. (Run again using -f/--force to overwrite)`

    addToRegistry(package.name, dirPath)

    zaq.ok(banner)
}

function handleRemovePackage (dirPath) {
    const package = loadPackage(dirPath)
    const packageExists = existsInRegistry(package.name)

    if (!packageExists && dirPath === existingPackagePath)
        throw `"${package.name}" is not in the registry`

    removeFromRegistry(package.name, dirPath)

    zaq.ok(`Removed "${package.name}" from registry`)
}

function handleRemoveCurrent () {
    return handleRemovePackage(CURRENT_DIR_PATH)
}

function handleAddCurrent () {
    return handleAddPackage(CURRENT_DIR_PATH)
}

const packageLogger = zaq.createLogStyle({ style: 'cyan', level: 'info', prefix: dim('«package»  ') })
const scriptLogger = zaq.createLogStyle({ style: 'yellow', level: 'info', prefix: dim('«script»   ') })

const logPackage = (name, version, path) => packageLogger(`${name} ${cyan(`@${version}`)}`, `${dim.cyan('-->-->')} ${path}`)
const logScript = (name, contents) => scriptLogger(yellow(name), `   ${dim(contents)}`)

function handleListRegistry () {
    const registry = getRegistry()
    const keys = Object.keys(registry)

    keys.forEach((key) => {
        const dirPath = registry[key]
        const package = loadPackage(dirPath)

        logPackage(key, package.version, dirPath)
    })

    if (!keys.length)
        zaq.warn(`The registry is currently empty. (See ${bold('npj --help')} for more information)`)
}

function handleListPackageScripts ([ packageName ] = []) {
    if (!packageName)
        throw `No <packageName> provided.`
    if (!existsInRegistry(packageName))
        throw `"${packageName}" is not in the registry`

    const dirPath = getPackagePath(packageName)
    const package = loadPackage(dirPath)

    logPackage(package.name, package.version, dirPath)

    const keys = Object.keys(package.scripts)

    keys.forEach((key) => logScript(key, package.scripts[key]))

    if (!keys.length)
        zaq.warn(`"${packageName}" contains no scripts`)
}

function runPackageScript (packageName, scriptName) {
    return new Promise((resolve, reject) => {
        scriptLogger(`${packageName}: Running script «${scriptName}»`)

        const runner = spawn('npm', ['run', scriptName], { cwd: getPackagePath(packageName)})

        runner.stdout.on('data', data => console.log(`${data}`))
        runner.stderr.on('data', data => console.log(`${data}`))
        runner.on('error', (error) => zaq.err(`error: ${error.message}`))
        runner.on('close', (code) => {
            scriptLogger(`script process exited with code ${code}`)

            return code ? reject(code) : resolve(code)
        })
    })
}

async function runPromiseChain (chain) {
    zaq.info('Running promise chain', chain.map(fn => fn.toString()))

    for (i=0; i<chain.length; i++) {
        await chain[i]();
    }
}

function handlePackageDirective () {
    let [ exe, exePath, ...params ] = process.argv

    if (!params.length)
        throw `No command or packageName given.`

    const workload = params.map(param => {
        const [ packageName, scriptTarget ] = param.split(':')

        if (!existsInRegistry(packageName))
            throw `"${packageName}" is not in the registry.`

        const task = !scriptTarget
            ? () => () => new Promise(resolve => resolve(handleListPackageScripts([packageName])))
            : () => runPackageScript(packageName, scriptTarget)

        return task
    })

    runPromiseChain(workload)
}

module.exports = {
    handleAddCurrent,
    handleAddPackage,
    handleRemovePackage,
    handleRemoveCurrent,
    handleListRegistry,
    handleListPackageScripts,
    handlePackageDirective
}
