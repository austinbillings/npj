const zaq = require('zaq').as('npj')
const { spawn, exec } = require('child_process')
const { dim, cyan, reset, bold, yellow } = require('chalk')
const { loadPackage, runAsyncChain } = require('./utils')
const { existsInRegistry, getPackagePath, addToRegistry, removeFromRegistry, getRegistry, packageHasScript } = require('./registry')

const CURRENT_DIR_PATH = process.cwd()

const printBorder = (color) => zaq.divider(dim('|'), { lineSymbol: dim('•'), centered: false, lineColor: color || 'dim' })

function handleAddPackage (dirPath) {
    const package = loadPackage(dirPath)
    const packageExists = existsInRegistry(package.name)
    const existingPackagePath = packageExists ? getPackagePath(package.name) : null
    const banner = `${package.name} -> ${dirPath} ${cyan(`@${package.version}`)}`

    if (packageExists && dirPath === existingPackagePath)
        return printBorder('green'), zaq.ok(`${banner} ${dim('(already set)')}`), printBorder('green')
    if (packageExists && !options.force)
        throw `"${package.name}" is already in the registry; currently set to ${existingPackagePath}. (Run again using -f/--force to overwrite)`

    addToRegistry(package.name, dirPath)

    printBorder('green')
    zaq.ok(banner)
    printBorder('green')
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
        return printBorder('yellow'),
            zaq.warn(`The registry is currently empty.`, dim(`(See ${bold('npj --help')} for more information)`))
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

function handlePrintPackageDir ([ packageName ] = []) {
    if (!packageName)
        throw `No <packageName> provided.`
    if (!existsInRegistry(packageName))
        throw `"${packageName}" is not in the registry`

    const dirPath = getPackagePath(packageName)

    console.log(dirPath);
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

function handleGoToPackageDir ([ packageName ] = []) {
    if (!packageName)
        throw `No <packageName> provided.`
    if (!existsInRegistry(packageName))
        throw `"${packageName}" is not in the registry`

    const dirPath = getPackagePath(packageName)

    console.log(`cd ${dirPath}`)
}

function handlePrintPackageManifest ([ packageName ] = []) {
    if (!packageName)
        throw `No <packageName> provided.`
    if (!existsInRegistry(packageName))
        throw `"${packageName}" is not in the registry`

    const dirPath = getPackagePath(packageName)
    const package = loadPackage(dirPath)

    logPackage(packageName, package.version, dirPath.concat('\n', JSON.stringify(package, null, '  ')))
    zaq.info('', )
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
