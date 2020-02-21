#!/usr/bin/env node
const chalk = require('chalk')
const cli = require('commander')
const zaq = require('zaq')

const { version } = require('../package.json')
const controllers = require('./controllers')

const { yellow, cyan, bold, blue, dim } = chalk
const { getRegistry, addToRegistry, removeFromRegistry, existsInRegistry, getPackagePath } = require('./registry')

cli.version(version)
    .description(`${bold(yellow('npj'))} ("Node Package Juggler") acts as a global bridge between all your npm projects.

        Navigate to any directory containing a package.json and simply run ${cyan('npj add')}.
        Now, that directory is a part of your global register (which you can view using ${cyan('npj ls')}).
        Entries in the register are keyed by the project's ${bold('name')} according to its package.json.

        ${cyan('npj ls')}
            Shows the packages, including versions and paths, currently in your registry.

        ${cyan('npj add')}
            Adds the current directory to your global registry.
            ${yellow('-f --force')} Overwrites an existing entry's path.
                Without this flag, adding a duplicate <projectName> will fail.

        ${cyan('npj remove')} ${bold('<packageName>')}
            Removes the package named by <packageName> from your global registry.

        ${cyan('npj scripts')} ${bold('<packageName>')}
            Shows the list of scripts set in <packageName>.

        ${cyan('npj manifeest')} ${bold('<packageName>')}
            Prints a readout of the ${blue('package.json')} associated with ${bold('<packageName>')}

        ${cyan('npj dir')} ${bold('<packageName>')}
            Prints the dirPath of the <packageName> given in your registry.

        ${cyan('npj')} ${bold('<packageName>:<scriptName>')}
            Runs the script listed as <scriptName> within the <packageName> directory.
            When multiple <packageName>:<scriptName> sets are provided, they are run in sequence.
    `)

// ------------------------------------------------------------------------------

function getOptionValue (option, defaultValue = null) {
    if (typeof cli[option] !== 'undefined')
        return cli[option]

    return defaultValue
}

const options = {
    force: getOptionValue('force', false)
}

const wrapActionHandler = (action, callback) => (instance, ...args) => {
    try { callback(instance, ...args) }
    catch (errText) {
        zaq.as('npj')
            .err(`Failed to ${action}:`, `${errText}\n${dim(`(See ${bold('npj --help')} for more information)`)}`)
    }
}

// ------------------------------------------------------------------------------

cli.command('add')
    .option('-f, --force', 'Overwrites existing saved registry package path.')
    .description(`Adds the current directory to your global registry. A message will be shown confirming the entry.`)
    .action(wrapActionHandler('add current directory', (args) => controllers.handleAddCurrent(args)))

cli.command('ls')
    .description(`List all packages setup in the registry, and print their paths.`)
    .action(wrapActionHandler('list registry packages', controllers.handleListRegistry))

cli.command('remove')
    .description(`Removes the current directory from your global registry.`)
    .action(wrapActionHandler('remove current directory', controllers.handleRemoveCurrent))

cli.command('scripts')
    .description(`Shows the list of scripts set in <packageName>.`)
    .action(wrapActionHandler('list package scripts', controllers.handleListPackageScripts))

cli.command('manifest')
    .description(`Shows the package.json configuration associated <packageName>.`)
    .action(wrapActionHandler('print package manifest', controllers.handlePrintPackageManifest))

cli.command('dir')
    .description(`Prints the dirPath of the <packageName> given in your registry.`)
    .action(wrapActionHandler('print package dir', controllers.handlePrintPackageDir))

cli.command('go')
    .description(`Prints a "cd" command which can be combined with shell substitution to navigate to a package's directory.`)
    .action(wrapActionHandler('change to package dir', controllers.handleGoToPackageDir))

cli.parse(process.argv)

const acceptableCommands = ['add', 'ls', 'remove', 'scripts', 'dir', 'manifest', 'go']

if (process.argv.length === 2)
    wrapActionHandler('run default command', controllers.handleListRegistry)()
if (process.argv.length >= 3 && !acceptableCommands.includes(process.argv[2]))
    wrapActionHandler('run package directive', controllers.handlePackageDirective)()
