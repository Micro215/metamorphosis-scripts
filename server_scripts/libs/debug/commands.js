// ============================================================================
//  customDebug — /debug and /silentCommand
// ============================================================================

const FULL_RELOAD = [
    'kubejs reload server_scripts',
    'kubejs reload client_scripts',
    'kubejs reload startup_scripts',
    'reload',
]

ServerEvents.commandRegistry(event => {
    const { commands, arguments } = event

    event.register(
        commands.literal('debug')
            .requires(src => src.hasPermission(2))
            .executes(ctx => {
                let D = global.libs.customDebug
                let player = ctx.source.player
                let nick = player == null ? null : player.name.string
                let on = nick != null && D._users.indexOf(nick) >= 0
                let verbose = on && D._verbose[nick] === true

                let msg = 'Debug users: [' + D._users.join(', ') + ']'
                if (nick == null) msg += ' (from console)'
                else msg += ' | you: ' + (on ? 'on' : 'off') + (verbose ? ' +verbose' : '')

                if (player != null) player.tell(msg)
                else console.info(msg)
                return 1
            })
            .then(commands.literal('on')
                .executes(ctx => {
                    let D = global.libs.customDebug
                    let player = ctx.source.player
                    if (player == null) return 0
                    let nick = player.name.string
                    if (D._users.indexOf(nick) >= 0) {
                        player.tell('Debug is already on')
                        return 1
                    }
                    D._users.push(nick)
                    player.tell('Debug turned on')
                    return 1
                })
            )
            .then(commands.literal('off')
                .executes(ctx => {
                    let D = global.libs.customDebug
                    let player = ctx.source.player
                    if (player == null) return 0
                    let nick = player.name.string
                    D._users = D._users.filter(n => n !== nick)
                    delete D._verbose[nick]
                    player.tell('Debug turned off')
                    return 1
                })
            )
            .then(commands.literal('verbose')
                .executes(ctx => {
                    let D = global.libs.customDebug
                    let player = ctx.source.player
                    if (player == null) return 0
                    let nick = player.name.string
                    if (D._users.indexOf(nick) < 0) D._users.push(nick)
                    let now = D._verbose[nick] !== true
                    if (now) D._verbose[nick] = true
                    else delete D._verbose[nick]
                    player.tell('Verbose ' + (now ? 'on' : 'off'))
                    return 1
                })
            )
            .then(commands.literal('fullReload')
                .executes(ctx => {
                    let server = ctx.source.server
                    let player = ctx.source.player
                    if (player != null) player.tell('Full reload: ' + FULL_RELOAD.length + ' steps...')

                    for (let i = 0; i < FULL_RELOAD.length; i++) {
                        server.runCommandSilent(FULL_RELOAD[i])
                    }
                    if (player != null) player.tell('Full reload done')
                    return 1
                })
            )
    )

    event.register(
        commands.literal('silentCommand')
            .requires(src => src.hasPermission(2))
            .executes(ctx => {
                if (ctx.source.player != null) ctx.source.player.tell('Usage: /silentCommand {cmd}')
                else console.info('Usage: /silentCommand {cmd}')
                return 1
            })
            .then(commands.argument('cmd', arguments.GREEDY_STRING.create(event))
                .executes(ctx => {
                    let cmd = arguments.GREEDY_STRING.getResult(ctx, 'cmd')
                    ctx.source.server.runCommandSilent(cmd)
                    return 1
                })
            )
    )
})