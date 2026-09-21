global.chatChangeData = {}

const DEFAULT_PREFIX = ""

ServerEvents.commandRegistry(event => {
    const { commands: Commands, arguments: Arguments } = event

    event.register(
        Commands.literal("chat")
            .requires(source => source.hasPermission(2))
            .then(Commands.literal("nick")
                .then(Commands.argument("value", Arguments.STRING.create(event))
                    .executes(ctx => {
                        const player = ctx.source.player
                        const value = Arguments.STRING.getResult(ctx, "value")

                        global.chatChangeData[player.username] = global.chatChangeData[player.username] || {}
                        global.chatChangeData[player.username].nick = value

                        player.tell(Text.green(`Now your nickname is ${value}`))
                        return 1
                    })
                )
            )
            .then(Commands.literal("prefix")
                .then(Commands.argument("value", Arguments.STRING.create(event))
                    .executes(ctx => {
                        const player = ctx.source.player
                        const value = Arguments.STRING.getResult(ctx, "value")

                        global.chatChangeData[player.username] = global.chatChangeData[player.username] || {}
                        global.chatChangeData[player.username].prefix = value

                        player.tell(Text.green(`Text prefix is ${value}`))
                        return 1
                    })
                )
            )
    )
})

PlayerEvents.chat(event => {
    const msg = event.message.replace("\\", "\\\\")
    const name = event.player.username

    const data = global.chatChangeData[name] || {}
    const prefix = data.prefix || DEFAULT_PREFIX
    const nick = data.nick || name

    event.server.tell([
        "<",
        nick,
        "> ",
        `${prefix}${msg}`
    ])

    event.cancel()
})