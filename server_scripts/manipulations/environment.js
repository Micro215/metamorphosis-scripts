global.manipulations.env = {
    sky: {
        set(player, data) {
            player.sendData("env_sky_set", { data: data })
        },
        reset(player) {
            player.sendData("env_sky_reset", { data: null })
        }
    },
    fog: {
        set(player, data) {
            player.sendData("env_fog_set", { data: data })
        },
        reset(player) {
            player.sendData("env_fog_reset", { data: null })
        }
    },
    sun: {
        set(player, data) {
            player.sendData("env_sun_set", { data: data })
        },
        reset(player) {
            player.sendData("env_sun_reset", { data: null })
        }
    },
    moon: {
        set(player, data) {
            player.sendData("env_moon_set", { data: data })
        },
        reset(player) {
            player.sendData("env_moon_reset", { data: null })
        }
    },
    rain: {
        set(player, data) {
            player.sendData("env_rain_set", { data: data })
        },
        reset(player) {
            player.sendData("env_rain_reset", { data: null })
        }
    },
    reset(player) {
        player.sendData("env_reset", { data: null })
    }
}

ServerEvents.commandRegistry(event => {
    const { commands, arguments } = event

    let cmd = commands.literal("env").requires(source => source.hasPermission(2))

    // ---
    cmd.then(commands.literal("sky")
        .then(commands.literal("set")
            .then(commands.argument("color", arguments.STRING.create(event))
                .executes(ctx => {
                    global.manipulations.env.sky.set(ctx.source.player, arguments.STRING.getResult(ctx, "color"))
                    return 1
                })
                .then(commands.argument("target", arguments.PLAYER.create(event))
                    .executes(ctx => {
                        global.manipulations.env.sky.set(arguments.PLAYER.getResult(ctx, "target"), arguments.STRING.getResult(ctx, "color"))
                        return 1
                    })
                )
            )
        )
        .then(commands.literal("reset")
            .executes(ctx => {
                global.manipulations.env.sky.reset(ctx.source.player)
                return 1
            })
            .then(commands.argument("target", arguments.PLAYER.create(event))
                .executes(ctx => {
                    global.manipulations.env.sky.reset(arguments.PLAYER.getResult(ctx, "target"))
                    return 1
                })
            )
        )
    )

    // ---
    cmd.then(commands.literal("fog")
        .then(commands.literal("set")
            .then(commands.argument("color", arguments.STRING.create(event))
                .executes(ctx => {
                    global.manipulations.env.fog.set(ctx.source.player, arguments.STRING.getResult(ctx, "color"))
                    return 1
                })
                .then(commands.argument("target", arguments.PLAYER.create(event))
                    .executes(ctx => {
                        global.manipulations.env.fog.set(arguments.PLAYER.getResult(ctx, "target"), arguments.STRING.getResult(ctx, "color"))
                        return 1
                    })
                )
            )
        )
        .then(commands.literal("reset")
            .executes(ctx => {
                global.manipulations.env.fog.reset(ctx.source.player)
                return 1
            })
            .then(commands.argument("target", arguments.PLAYER.create(event))
                .executes(ctx => {
                    global.manipulations.env.fog.reset(arguments.PLAYER.getResult(ctx, "target"))
                    return 1
                })
            )
        )
    )

    // ---
    cmd.then(commands.literal("sun")
        .then(commands.literal("set")
            .then(commands.argument("texture", arguments.STRING.create(event))
                .executes(ctx => {
                    global.manipulations.env.sun.set(ctx.source.player, arguments.STRING.getResult(ctx, "texture"))
                    return 1
                })
                .then(commands.argument("target", arguments.PLAYER.create(event))
                    .executes(ctx => {
                        global.manipulations.env.sun.set(arguments.PLAYER.getResult(ctx, "target"), arguments.STRING.getResult(ctx, "color"))
                        return 1
                    })
                )
            )
        )
        .then(commands.literal("reset")
            .executes(ctx => {
                global.manipulations.env.sun.reset(ctx.source.player)
                return 1
            })
            .then(commands.argument("target", arguments.PLAYER.create(event))
                .executes(ctx => {
                    global.manipulations.env.sun.reset(arguments.PLAYER.getResult(ctx, "target"))
                    return 1
                })
            )
        )
    )

    // ---
    cmd.then(commands.literal("moon")
        .then(commands.literal("set")
            .then(commands.argument("texture", arguments.STRING.create(event))
                .executes(ctx => {
                    global.manipulations.env.moon.set(ctx.source.player, arguments.STRING.getResult(ctx, "texture"))
                    return 1
                })
                .then(commands.argument("target", arguments.PLAYER.create(event))
                    .executes(ctx => {
                        global.manipulations.env.moon.set(arguments.PLAYER.getResult(ctx, "target"), arguments.STRING.getResult(ctx, "color"))
                        return 1
                    })
                )
            )
        )
        .then(commands.literal("reset")
            .executes(ctx => {
                global.manipulations.env.moon.reset(ctx.source.player)
                return 1
            })
            .then(commands.argument("target", arguments.PLAYER.create(event))
                .executes(ctx => {
                    global.manipulations.env.moon.reset(arguments.PLAYER.getResult(ctx, "target"))
                    return 1
                })
            )
        )
    )

    // ---
    cmd.then(commands.literal("rain")
        .then(commands.literal("set")
            .then(commands.argument("texture", arguments.STRING.create(event))
                .executes(ctx => {
                    global.manipulations.env.rain.set(ctx.source.player, arguments.STRING.getResult(ctx, "texture"))
                    return 1
                })
                .then(commands.argument("target", arguments.PLAYER.create(event))
                    .executes(ctx => {
                        global.manipulations.env.rain.set(arguments.PLAYER.getResult(ctx, "target"), arguments.STRING.getResult(ctx, "color"))
                        return 1
                    })
                )
            )
        )
        .then(commands.literal("reset")
            .executes(ctx => {
                global.manipulations.env.rain.reset(ctx.source.player)
                return 1
            })
            .then(commands.argument("target", arguments.PLAYER.create(event))
                .executes(ctx => {
                    global.manipulations.env.rain.reset(arguments.PLAYER.getResult(ctx, "target"))
                    return 1
                })
            )
        )
    )

    // ---
    cmd.then(commands.literal("reset")
        .executes(ctx => {
            global.manipulations.env.reset(ctx.source.player)
            return 1
        })
        .then(commands.argument("target", arguments.PLAYER.create(event))
            .executes(ctx => {
                global.manipulations.env.reset(arguments.PLAYER.getResult(ctx, "target"))
                return 1
            })
        )
    )

    // ---
    event.register(cmd)
})