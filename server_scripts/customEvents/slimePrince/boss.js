// ============================================================================
//  Slime Prince — the fight itself: summon, phases, workers, death, wipe
// ============================================================================
let SP = global.customEvents.slimePrince

// live fight state — the single owner; _wipe resets it
SP.state = {
    summonBlock: null,
    bossEntity: null,
    sphereObj: null,
    bossSpawned: false,
    nextBossAttackAt: 0,
    nextCrystalAt: 0,
    crystalBusy: false,
    crystalStartedAt: 0,
}

// ---------------------------------------------------------------------------
//  _wipe — reload/unload cleanup (called by global.wipe before the
//  namespaces are dropped). Removes everything that would outlive the
//  script context: the boss, the shields, the bossbar, the music; restores
//  the summon block. The sphere is removed instantly by shapes._wipe right
//  after (customEvents are wiped first so the libs are still alive here).
// ---------------------------------------------------------------------------
SP._wipe = function() {
    let FX = global.libs.fx
    let cfg = SP.config.BOSS
    let st = SP.state

    // boss — discard, no loot
    let server = null
    if (st.bossEntity != null) {
        try { server = st.bossEntity.server } catch (err) {}
        SP.utils.remove(st.bossEntity)
    }

    // shields: known list first, then a tag scan for any strays
    SP.shields.killAll()
    try {
        let strays = FX.entities({ tag: SP.config.SHIELDS.TAG, server: server || undefined })
        for (let i = 0; i < strays.length; i++) SP.utils.remove(strays[i])
    } catch (err) {}

    // bossbar
    if (server != null) {
        try { server.runCommandSilent('bossbar remove ' + cfg.BOSSBAR_ID) } catch (err) {}
    }

    // music
    SP.music.stop()

    // restore the summon block so the fight can be restarted
    if (st.summonBlock != null) {
        try { st.summonBlock.set('tconstruct:budding_sky_slime_crystal') } catch (err) {}
    }

    // reset the workers & pointers for the next fight
    st.summonBlock = null
    st.bossEntity = null
    st.sphereObj = null
    st.bossSpawned = false
    st.nextBossAttackAt = 0
    st.nextCrystalAt = 0
    st.crystalBusy = false
    st.crystalStartedAt = 0
}

// ---------- helpers ----------
function buildCtx(server) {
    let st = SP.state
    if (st.summonBlock == null) return null
    let level = st.summonBlock.level
    if (level == null) return null
    let anchor = { x: st.summonBlock.x + 0.5, y: st.summonBlock.y, z: st.summonBlock.z + 0.5 }
    return {
        server: server,
        level: level,
        boss: st.bossEntity,
        sphere: st.sphereObj,
        anchor: anchor,
        center: { x: anchor.x, y: anchor.y + SP.config.SPHERE.Y_OFFSET, z: anchor.z },
        bossSpawn: { x: anchor.x, y: anchor.y + SP.config.BOSS.SPAWN_Y_OFFSET, z: anchor.z },
        phase: currentPhase(),
        done: null,
        alive: function() {
            return st.bossEntity != null && st.bossEntity.alive === true
        },
    }
}

function currentPhase() {
    let st = SP.state
    let cfg = SP.config
    if (st.bossEntity == null || st.bossEntity.alive !== true) return 1
    let f = st.bossEntity.health / cfg.BOSS.MAX_HEALTH
    let th = cfg.PHASES.THRESHOLDS
    if (f > th[0]) return 1
    if (f > th[1]) return 2
    return 3
}

function delayFor(phase, table) {
    let v = table == null ? null : table[phase - 1]
    return v == null ? 200 : v
}

function findAttack(name) {
    let list = SP.attacks
    for (let i = 0; i < list.length; i++) if (list[i].name === name) return list[i]
    return null
}

// run an attack; onDone fires exactly once — when the attack completes,
// crashes, or is stopped by the boss dying
function runAttack(server, attack, onDone) {
    let ctx = buildCtx(server)
    let finished = false
    if (ctx == null) { if (typeof onDone === 'function') onDone(); return }
    ctx.done = function() {
        if (finished) return
        finished = true
        if (typeof onDone === 'function') onDone()
    }
    try {
        attack.run(ctx)
    } catch (err) {
        console.error('[slime_prince] attack "' + attack.name + '" crashed: ' + err)
        ctx.done()
    }
}

// ---------- artillery (boss projectile, sounds added) ----------
function fireArtillery(ctx) {
    let FX = global.libs.fx
    let st = SP.state
    let cfg = SP.config.ATTACK
    let boss = st.bossEntity

    let targets = []
    ctx.server.players.forEach(player => {
        if (String(player.level.dimension) !== String(boss.level.dimension)) return
        if (player.distanceToEntity(boss) > cfg.TARGET_RANGE) return
        if (!SP.utils.inArena(player, ctx)) return
        targets.push(player)
    })
    if (targets.length === 0) return

    let target = targets[(Math.random() * targets.length) | 0]
    let acfg = SP.config.ARTILLERY

    // shot sound at the victim, like the lua version
    FX.sound(ctx.server, { x: target.x, y: target.y, z: target.z }, acfg.SHOOT_SOUND, {
        volume: acfg.SOUND_VOLUME,
        distance: acfg.SOUND_DISTANCE,
    })

    FX.projectile({
        from: boss,
        to: target,
        homing: false,
        speed: cfg.PROJECTILE.SPEED,
        particle: cfg.PROJECTILE.PARTICLE,
        trail: {
            count: cfg.PROJECTILE.COUNT_PER_TICK,
            spread: cfg.PROJECTILE.SPREAD,
            speed: cfg.PROJECTILE.MOTION,
        },
        impact: {
            count: cfg.PROJECTILE.IMPACT_COUNT,
            spread: cfg.PROJECTILE.IMPACT_SPREAD,
            speed: cfg.PROJECTILE.IMPACT_MOTION,
        },
        onImpact: function(hctx) {
            FX.sound(hctx.server, { x: hctx.x, y: hctx.y, z: hctx.z }, acfg.HIT_SOUND, {
                volume: acfg.SOUND_VOLUME,
                distance: acfg.SOUND_DISTANCE,
            })
            tryCloud(hctx.server, hctx.level, hctx.x, hctx.y, hctx.z)
        },
    })
}

// impact cloud when a player stands in the hit radius
function tryCloud(server, level, x, y, z) {
    let cfg = SP.config.ATTACK
    let radiusSq = cfg.HIT_RADIUS * cfg.HIT_RADIUS
    let hit = false

    server.players.forEach(player => {
        if (String(player.level.dimension) !== String(level.dimension)) return

        let dx = player.x - x
        let dy = player.y - y
        let dz = player.z - z

        if (dx * dx + dy * dy + dz * dz <= radiusSq) hit = true
    })

    if (hit) {
        SP.utils.cloud(level, x, y, z, {
            particle: cfg.CLOUD.PARTICLE,
            radius: cfg.CLOUD.RADIUS,
            duration: cfg.CLOUD.DURATION,
            waitTime: cfg.CLOUD.WAIT_TIME,
            effects: [
                { Id: cfg.CLOUD.EFFECTS[0].Id, amplifier: cfg.CLOUD.EFFECTS[0].Amplifier, duration: cfg.CLOUD.EFFECTS[0].Duration },
                { Id: cfg.CLOUD.EFFECTS[1].Id, amplifier: cfg.CLOUD.EFFECTS[1].Amplifier, duration: cfg.CLOUD.EFFECTS[1].Duration },
            ],
        })
    }
}

// ---------- summon & death spiral ----------
function startSpiral(level, x, y, z, direction) {
    let FX = global.libs.fx
    let cfg = SP.config.SPIRAL
    FX.spiral({
        target: [x, y, z],
        level: level,
        particle: cfg.PARTICLE,
        radius: cfg.RADIUS,
        duration: cfg.DURATION_TICKS,
        spin: cfg.SPIN,               // deg/tick: SPIN * DURATION = full turns
        arms: cfg.ARMS,
        pointsPerTick: cfg.POINTS_PER_TICK,
        direction: direction === cfg.IN ? 'in' : 'out',
        rise: cfg.RISE,
        drift: cfg.DRIFT,
        viewDist: 128,
    })
}

// ---------- fight orchestration ----------
// Phase-based delays for artillery, a busy-gated worker with random picks
// for the crystal attacks, plus the module ticks (shields, dome fx, aura).
ServerEvents.tick(event => {
    let st = SP.state
    if (!st.bossEntity || !st.bossEntity.alive) return

    const server = event.server
    const now = server.tickCount

    const ctx = buildCtx(server)
    if (ctx == null) return

    // fight modules
    if (now % 10 === 0) {
        SP.shields.tick(ctx)
        SP.domefx.tick(ctx)
    }
    if (now % 2 === 0) SP.shields.aura(ctx)

    // safety: forget an attack that never signalled done
    if (st.crystalBusy && now - st.crystalStartedAt > SP.config.ATTACK_TIMEOUT) {
        st.crystalBusy = false
    }

    // crystal attack worker
    if (!st.crystalBusy) {
        if (st.nextCrystalAt === 0) st.nextCrystalAt = now + SP.config.FIRST_CRYSTAL_DELAY
        if (now >= st.nextCrystalAt) {
            let pool = SP.config.CRYSTAL_POOLS[ctx.phase]
            if (pool == null || pool.length === 0) {
                st.nextCrystalAt = now + 40   // no pool for this phase yet
            } else {
                let name = pool[(Math.random() * pool.length) | 0]
                let attack = findAttack(name)
                if (attack == null) {
                    st.nextCrystalAt = now + 40
                } else {
                    st.crystalBusy = true
                    st.crystalStartedAt = now
                    runAttack(server, attack, function() {
                        st.crystalBusy = false
                        st.nextCrystalAt = server.tickCount + delayFor(ctx.phase, SP.config.CRYSTAL_DELAYS)
                    })
                }
            }
        }
    }

    // artillery worker
    if (st.nextBossAttackAt === 0) st.nextBossAttackAt = now + 60
    if (now >= st.nextBossAttackAt) {
        st.nextBossAttackAt = now + delayFor(ctx.phase, SP.config.ATTACK_DELAYS)
        fireArtillery(ctx)
    }
})

// ---------- boss lifecycle ----------
ServerEvents.tick(event => {
    let st = SP.state
    if (event.server.tickCount % 10 !== 0) return
    if (!st.bossEntity) return

    let server = event.server
    let cfg = SP.config.BOSS

    if (st.bossEntity.alive) {
        let currentHealth = Math.round(st.bossEntity.health)
        let bossSize = Math.max((cfg.SIZE * currentHealth / cfg.MAX_HEALTH | 0), 3)

        st.bossEntity.mergeNbt({ Size: bossSize })
        SP.utils.giveEffect(st.bossEntity, 'spartanweaponry:ender_disruption', 30, 255)

        server.runCommandSilent(`bossbar set ${cfg.BOSSBAR_ID} value ${currentHealth}`)

        server.runCommandSilent(`execute as @e[tag=${cfg.ENTITY_TAG}] at @s run bossbar set ${cfg.BOSSBAR_ID} players @a[distance=..${cfg.BOSSBAR_VISIBILITY_DIST}]`)
    } else {  // death
        server.runCommandSilent(`bossbar remove ${cfg.BOSSBAR_ID}`)

        // module shutdown + loot (built while the anchor is still known)
        let ctx = buildCtx(server)
        SP.shields.killAll()
        SP.domefx.stop()
        SP.music.stop()
        if (ctx != null) SP.loot.drop(ctx)

        st.bossEntity = null
        server.tell(Text.green('The Slime Prince has been defeated!'))
        st.summonBlock.set('tconstruct:budding_sky_slime_crystal')

        let cx = st.summonBlock.x + 0.5
        let cy = st.summonBlock.y + SP.config.SPIRAL.Y_OFFSET
        let cz = st.summonBlock.z + 0.5

        startSpiral(st.summonBlock.level, cx, cy, cz, SP.config.SPIRAL.IN)
        st.summonBlock = null

        if (st.sphereObj) st.sphereObj.stop()   // wave-in dissolve from the center

        // reset the workers for the next fight
        st.nextBossAttackAt = 0
        st.nextCrystalAt = 0
        st.crystalBusy = false
    }
})

// ---------- leftover filter ----------
// Remove everything that carries the boss name but NOT our tag: split
// children and post-fight leftovers. The real boss always carries the tag
// and is never touched.
EntityEvents.spawned(event => {
    let e = event.entity
    try {
        let name = e.customName
        if (name == null || String(name).indexOf(SP.config.BOSS.NAME) < 0) return
        if (SP.utils.hasTag(e, SP.config.BOSS.ENTITY_TAG)) return
        SP.utils.remove(e)
    } catch (err) {}
})

// ---------- summon ----------
BlockEvents.rightClicked('tconstruct:budding_sky_slime_crystal', event => {
    const { player, block, server } = event
    let st = SP.state
    let SH = global.libs.shapes

    if (player.cooldowns.isOnCooldown(player.mainHandItem)) return
    if (player.mainHandItem.nbt.tag !== SP.config.BOSS.SUMMON_ITEM_TAG) return
    if (st.bossEntity || st.sphereObj) return

    st.bossSpawned = false

    st.summonBlock = block
    block.set('tconstruct:sky_slime_crystal_block')
    server.runCommandSilent(`bossbar remove ${SP.config.BOSS.BOSSBAR_ID}`)

    st.sphereObj = SH.sphere({
        level: block.level,
        pos: [block.x, block.y + SP.config.SPHERE.Y_OFFSET, block.z],
        radius: SP.config.SPHERE.RADIUS,
        blocks: SP.config.SPHERE.BLOCKS,
        name: 'slime_prince_arena',
        shell: SP.config.SPHERE.SHELL,
        wave: SP.config.SPHERE.WAVE,
        slice: SP.config.SPHERE.SLICE,
    })
    if (st.sphereObj == null) { summonBoss(server); return }

    startSpiral(player.level, block.x + 0.5, block.y + SP.config.SPIRAL.Y_OFFSET, block.z + 0.5, SP.config.SPIRAL.OUT)
    server.tell(Text.green('A sphere appears around the crystal...'))

    // intro music while the dome forms
    SP.music.play(server, { x: block.x + 0.5, y: block.y, z: block.z + 0.5 }, SP.config.MUSIC.INTRO)

    player.addItemCooldown(player.mainHandItem, SP.config.BOSS.SUMMON_COOLDOWN)
})

// ---------- sphere driver ----------
ServerEvents.tick(event => {
    let st = SP.state
    let SH = global.libs.shapes
    let s = st.sphereObj
    if (s == null) return

    let every = s.phase() === 'clear' ? SP.config.SPHERE.CLEAR_EVERY : SP.config.SPHERE.BUILD_EVERY
    if (event.server.tickCount % every !== 0) return

    if (!s.done) SH.animate(s)

    if (s.built && !st.bossSpawned) {
        summonBoss(event.server)
    }

    if (s.done) st.sphereObj = null
})

// ---------- deferred boss spawn ----------
function summonBoss(server) {
    let st = SP.state
    let cfg = SP.config.BOSS
    if (st.summonBlock == null || st.bossEntity != null) return
    st.bossSpawned = true

    st.bossEntity = st.summonBlock.createEntity(cfg.TYPE)
    st.bossEntity.setPosition(st.summonBlock.x, st.summonBlock.y + cfg.SPAWN_Y_OFFSET, st.summonBlock.z)

    // Tags:                vanilla entity tag — the leftover filter's marker
    // PersistenceRequired: the boss never despawns, it exists until it dies
    st.bossEntity.mergeNbt({
        Size: cfg.SIZE,
        Tags: [cfg.ENTITY_TAG],
        PersistenceRequired: 1,
        NoAI: cfg.NO_AI,
        Attributes: [
            { Name: 'forge:entity_gravity', Base: cfg.GRAVITY },
            { Name: 'minecraft:generic.attack_damage', Base: cfg.ATTACK_POWER },
        ],
    })

    st.bossEntity.setMaxHealth(cfg.MAX_HEALTH)
    st.bossEntity.setHealth(cfg.MAX_HEALTH)
    st.bossEntity.setCustomName(Text.of('§d⚔ ' + cfg.NAME + ' ⚔'))

    server.runCommandSilent(`bossbar add ${cfg.BOSSBAR_ID} {"text":"⚔ ${cfg.NAME} ⚔","color":"blue","bold":true}`)
    server.runCommandSilent(`bossbar set ${cfg.BOSSBAR_ID} max ${cfg.MAX_HEALTH}`)
    server.runCommandSilent(`bossbar set ${cfg.BOSSBAR_ID} value ${cfg.MAX_HEALTH}`)
    server.runCommandSilent(`bossbar set ${cfg.BOSSBAR_ID} style progress`)

    st.bossEntity.spawn()

    // fight music + the shield ring
    let spawnPos = { x: st.summonBlock.x + 0.5, y: st.summonBlock.y, z: st.summonBlock.z + 0.5 }
    SP.music.play(server, spawnPos, SP.config.MUSIC.FIGHT)
    let sctx = buildCtx(server)
    if (sctx != null) SP.shields.spawn(sctx)

    // fresh worker timers
    st.nextBossAttackAt = 0
    st.nextCrystalAt = 0
    st.crystalBusy = false

    server.tell(Text.green('The Slime Prince has arrived!'))
}

// ---------- protect boss spawn ----------
BlockEvents.broken('tconstruct:budding_sky_slime_crystal', event => {
    let block = event.block

    if (block.level.getBlock(block.x, block.y - 1, block.z).id === 'minecraft:bedrock') {
        event.player.tell(Text.red('You have been afflicted with Creative Shock'))
        event.server.runCommandSilent(`effect give ${event.player.name.string} slowness 10 255 true`)
        event.server.runCommandSilent(`effect give ${event.player.name.string} darkness 10 255 true`)
        event.cancel()
    }
})