const zaq = require('zaq').as('npj')
const { spawn, exec } = require('child_process')
const { dim, cyan, red, reset, bold, yellow } = require('chalk')
const { loadPackage, runAsyncChain } = require('./utils')
const { existsInRegistry, getPackagePath, addToRegistry, removeFromRegistry, getRegistry, packageHasScript } = require('./registry')

const CURRENT_DIR_PATH = process.cwd()

const printBorder = (color) => zaq.divider(dim('|'), { lineSymbol: dim('•'), centered: false, lineColor: color || 'dim' })

function handleAddPackage (dirPath, options) {
    const package = loadPackage(dirPath)
    const packageExists = existsInRegistry(package.name)
    const existingPackagePath = packageExists ? getPackagePath(package.name) : null
    const banner = `${package.name} -> ${dirPath} ${cyan(`@${package.version}`)}`

    if (packageExists && dirPath === existingPackagePath)
        return printBorder('green'), zaq.ok(`${banner} ${dim('(already set)')}`), printBorder('green')
    if (packageExists && !options.force)
        throw `"${package.name}" is already in the registry; currently set to ${existingPackagePath}.\n(Run again using -f/--force to overwrite)`

    addToRegistry(package.name, dirPath)

    printBorder('green')
    zaq.ok(banner)
    printBorder('green')
}

function handleRemovePackage (dirPath) {
    const package = loadPackage(dirPath)
    const packageExists = existsInRegistry(package.name)

    if (!packageExists)
        throw `"${package.name}" is not in the registry`

    removeFromRegistry(package.name, dirPath)

    zaq.ok(`Removed "${package.name}" from registry`)
}

function handleRemoveCurrent (cmd, args) {
    return handleRemovePackage(CURRENT_DIR_PATH)
}

function handleAddCurrent (cmd) {
    return handleAddPackage(CURRENT_DIR_PATH, cmd)
}

const packageLogger = zaq.createLogStyle({ style: 'cyan', level: 'info', prefix: dim('«package»  ') })
const errorLogger = zaq.createLogStyle({ style: 'red', level: 'info', prefix: dim('«error»    ') })
const scriptLogger = zaq.createLogStyle({ style: 'yellow', level: 'info', prefix: dim('«script»   ') })

const logPackage = (name, version, path) => packageLogger(`${name} ${cyan(`@${version}`)}`, `${dim.cyan('-->-->')} ${path}`)
const logPackageError = (name, version, err) => errorLogger(`${name} ${red(`unavailable`)}`, `${dim.red('-->-->')} ${err}`)
const logScript = (name, contents) => scriptLogger(yellow(name), `   ${dim(contents)}`)

function handleListRegistry () {
    const registry = getRegistry()
    const keys = Object.keys(registry)

    keys.forEach((key) => {
        const dirPath = registry[key]
        try {
            const package = loadPackage(dirPath)

            logPackage(key, package.version, dirPath)
        } catch (e) {
            logPackageError(key, '!!!', e);
        }
    })

    if (!keys.length)
        return printBorder('yellow'),
            zaq.warn(`The registry is currently empty.`, dim(`(See ${bold('npj --help')} for more information)`))
}

function handleListPackageScripts (cmd, [ packageName ] = []) {
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

function handlePrintPackageDir (cmd, [ packageName ] = []) {
    if (!packageName)
        throw `No <packageName> provided.`
    if (!existsInRegistry(packageName))
        throw `"${packageName}" is not in the registry`

    const dirPath = getPackagePath(packageName)

    console.log(dirPath)
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

function handlePackageDirective () {
    const [ exe, exePath, ...triggers ] = process.argv

    if (!triggers.length)
        throw `No command or packageName given.`

    const workload = triggers.map(trigger => {
        const [ packageName, scriptName ] = trigger.split(':', 2)

        if (!existsInRegistry(packageName))
            throw `"${packageName}" is not in the registry.`
        if (scriptName && !packageHasScript(packageName, scriptName))
            throw `No such script "${yellow(scriptName)}" in ${bold(packageName)}`

        const task = scriptName
            ? () => runPackageScript(packageName, scriptName)
            : () => () => new Promise(resolve => resolve(handleListPackageScripts([packageName])))

        return task
    })

    return runAsyncChain(workload)
}

function handleGoToPackageDir (cmd, [ packageName ] = []) {
    if (!packageName)
        throw `No <packageName> provided.`
    if (!existsInRegistry(packageName))
        throw `"${packageName}" is not in the registry`

    const dirPath = getPackagePath(packageName)

    console.log(`cd ${dirPath}`)
}

function handlePrintPackageManifest (cmd, [ packageName ] = []) {
    if (!packageName)
        throw `No <packageName> provided.`
    if (!existsInRegistry(packageName))
        throw `"${packageName}" is not in the registry`

    const dirPath = getPackagePath(packageName)
    const package = loadPackage(dirPath)

    logPackage(packageName, package.version, dirPath.concat('\n', JSON.stringify(package, null, '  ')))
}

module.exports = {
    handleAddCurrent,
    handleAddPackage,
    handleRemovePackage,
    handleRemoveCurrent,
    handleListRegistry,
    handleListPackageScripts,
    handlePrintPackageDir,
    handlePackageDirective,
    handleGoToPackageDir,
    handlePrintPackageManifest
}
