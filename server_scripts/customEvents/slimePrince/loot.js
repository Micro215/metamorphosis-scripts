// ============================================================================
//  Slime Prince — loot: fixed drops + random entries from the pool
// ============================================================================
let SP = global.customEvents.slimePrince

SP.loot = {
    drop: function(ctx) {
        let cfg = SP.config.LOOT
        let FX = global.libs.fx
        let a = ctx.anchor
        let x = a.x + (cfg.OFFSET ? cfg.OFFSET[0] : 0)
        let y = a.y + (cfg.OFFSET ? cfg.OFFSET[1] : 0)
        let z = a.z + (cfg.OFFSET ? cfg.OFFSET[2] : 0)

        // player effects first
        ctx.server.players.forEach(function(pl) {
            if (!SP.utils.inArena(pl, ctx)) return
            for (let i = 0; i < cfg.PLAYER_EFFECTS.length; i++) {
                let e = cfg.PLAYER_EFFECTS[i]
                SP.utils.giveEffect(pl, e.effect, e.duration, e.amplifier)
            }
        })

        // fixed items split into batch-sized chunks
        let chunks = []
        for (let i = 0; i < cfg.FIXED.length; i++) {
            let it = cfg.FIXED[i]
            let left = it.count == null ? 1 : it.count
            while (left > 0) {
                let n = Math.min(cfg.ITEMS_PER_BATCH, left)
                chunks.push({ id: it.id, count: n, nbt: it.nbt })
                left -= n
            }
        }

        // random picks
        if (cfg.RANDOM_POOL.length > 0) {
            let picks = SP.utils.randInt(cfg.RANDOM_MIN, cfg.RANDOM_MAX)
            for (let k = 0; k < picks; k++) {
                let it = cfg.RANDOM_POOL[(Math.random() * cfg.RANDOM_POOL.length) | 0]
                chunks.push({ id: it.id, count: it.count == null ? 1 : it.count, nbt: it.nbt })
            }
        }

        // eject over time: one item chunk + a batch of xp orbs per step
        // (no alive() guard — the boss is already dead at this point)
        let steps = []
        let orbBudget = cfg.XP.count
        for (let i = 0; i < chunks.length; i++) {
            let orbN = Math.min(cfg.ORBS_PER_BATCH, Math.max(0, orbBudget))
            orbBudget -= orbN
            ;(function(chunk, tt, orbN) {
                steps.push({
                    t: tt,
                    fn: function() {
                        SP.utils.spawnItemEntity(ctx.level, x, y, z, chunk, cfg.MOTION)
                        for (let k = 0; k < orbN; k++) {
                            let v = SP.utils.randInt(cfg.XP.valueMin, cfg.XP.valueMax)
                            SP.utils.spawnXpOrb(ctx.level, x, y, z, v, cfg.MOTION)
                        }
                    },
                })
            })(chunks[i], i * cfg.BATCH_EVERY, orbN)
        }

        if (steps.length > 0) {
            FX.timeline(steps, { name: 'slime_prince:loot' })
        }
        try { global.libs.customDebug.info('loot dropped: ' + chunks.length + ' chunks, ' + cfg.XP.count + ' xp orbs') } catch (err) {}
    },
}