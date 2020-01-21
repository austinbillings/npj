#!/usr/bin/env node
const chalk = require('chalk')
const cli = require('commander')
const zaq = require('zaq')

const { fileExists, loadPackage } = require('./utils')
const { version } = require('../package.json')
const controllers = require('./controllers')

const { dim, yellow, cyan, bold, blue, white } = chalk
const { getRegistry, addToRegistry, removeFromRegistry, existsInRegistry, getPackagePath } = require('./registry')

cli.version(version)
    .description(`${bold(yellow('npj'))} ("np"m "j"umper) acts as a global bridge between all your npm projects.

        Navigate to any directory containing a package.json and simply run ${cyan('npj add')}.
        Now, that directory is a part of your global register (which you can view using ${cyan('npj ls')}).
        Entries in the register are keyed by the project's ${dim('name')} according to its package.json.

        ${cyan('npj ls')}
            Shows the packages, including versions and paths, currently in your registry.

        ${cyan('npj add')}
            Adds the current directory to your global registry.
            A message will be shown confirming the entry.
            ${yellow('-f --force')} Overwrites an existing entry's path.
                Without this flag, adding a duplicate <projectName> will fail.

        ${cyan('npj remove')} ${blue('<packageName>')}
            Removes the package named by <packageName> from your global registry.

        ${cyan('npj scripts')} ${blue('<packageName>')}
            Shows the list of scripts set in <packageName>.

        ${cyan('npj')} ${blue('<packageName>:<scriptName>')}
            Runs the script listed as <scriptName> within the <packageName> directory.
            When multiple <packageName>:<scriptName> sets are provided, they are run in sequence.
    `)
    .option('-f, --force', 'Overwrites existing saved registry package when used with "npj add <packageName>"')

// ------------------------------------------------------------------------------

function getOptionValue (option, defaultValue = null) {
    if (typeof cli[option] !== 'undefined')
        return cli[option]

    return defaultValue
}

const options = {
    force: getOptionValue('force', false)
}

const wrapActionHandler = (action, callback) => (instance, args) => {
    try { callback(args) }
    catch (errText) {
        zaq.as('NPJ')
            .err(`Failed to ${action}:`, `${errText}\n(See ${bold('npj --help')} for more information)`)
    }
}

// ------------------------------------------------------------------------------



cli.command('add')
    .description(`Adds the current directory to your global register. A message will be shown confirming the entry.`)
    .action(wrapActionHandler('add current directory', controllers.handleAddCurrent))

cli.command('ls')
    .description(`List all packages setup in the registry, and print their paths.`)
    .action(wrapActionHandler('list registry packages', controllers.handleListRegistry))

cli.command('remove')
    .description(`Removes the current directory from your global register.`)
    .action(wrapActionHandler('remove current directory', controllers.handleRemoveCurrent))

cli.command('scripts')
    .description(`Shows the list of scripts set in <packageName>.`)
    .action(wrapActionHandler('list package scripts', controllers.handleListPackageScripts))

cli.parse(process.argv)

const acceptableCommands = ['add', 'ls', 'remove', 'scripts']

if (process.argv.length === 2)
    wrapActionHandler('run default command', controllers.handleListRegistry)()
if (process.argv.length >= 3 && !acceptableCommands.includes(process.argv[2]))
    wrapActionHandler('run package directive', controllers.handlePackageDirective)()
