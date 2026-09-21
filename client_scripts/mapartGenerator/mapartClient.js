function jsBytesToBase64(bytes) {
    let B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    let out = []
    let len = bytes.length
    for (let i = 0; i < len; i += 3) {
        let b0 = bytes[i]
        let b1 = (i + 1 < len) ? bytes[i + 1] : 0
        let b2 = (i + 2 < len) ? bytes[i + 2] : 0
        let n = (b0 << 16) | (b1 << 8) | b2
        out.push(B64_ALPHABET[(n >> 18) & 63])
        out.push(B64_ALPHABET[(n >> 12) & 63])
        out.push((i + 1 < len) ? B64_ALPHABET[(n >> 6) & 63] : '=')
        out.push((i + 2 < len) ? B64_ALPHABET[n & 63] : '=')
    }
    return out.join('')
}

NetworkEvents.dataReceived('mapart_request', function(event) {
    let player = event.player
    let data = event.data
    let filename = data.filename

    try {
        let nbt = NBTIO.read('maparts/' + filename + '.dat')

        if (nbt == null) {
            player.sendData('mapart_error', { error: 'File not found: kubejs/maparts/' + filename + '.dat' })
            return
        }

        let mapData = nbt.data
        if (mapData == null) {
            try { mapData = nbt.get('data') } catch (e) {}
        }
        if (mapData == null) {
            player.sendData('mapart_error', { error: 'Invalid .dat format: missing "data" tag' })
            return
        }

        let colors = mapData.colors
        if (colors == null) {
            try { colors = mapData.get('colors') } catch (e) {}
        }
        if (colors == null) {
            player.sendData('mapart_error', { error: 'Invalid .dat format: missing "colors" tag' })
            return
        }

        let rawBytes = null

        try {
            rawBytes = colors.getAsByteArray()
        } catch (e1) {}

        if (rawBytes == null) {
            try { rawBytes = colors.getByteArray() } catch (e2) {}
        }

        if (rawBytes == null) {
            try { rawBytes = colors.toArray() } catch (e3) {}
        }

        if (rawBytes == null) {
            try {
                if (colors.array != null) rawBytes = colors.array
            } catch (e4) {}
        }

        let b64Colors = null

        if (rawBytes != null && rawBytes.length > 0) {
            try {
                let Base64 = Java.loadClass('java.util.Base64')
                b64Colors = Base64.getEncoder().encodeToString(rawBytes)
            } catch (e5) {
                let jsArr = []
                for (let i = 0; i < rawBytes.length; i++) {
                    jsArr.push(rawBytes[i] & 0xFF)
                }
                b64Colors = jsBytesToBase64(jsArr)
            }
        }

        if (b64Colors == null || b64Colors.length == 0) {
            try {
                let size = colors.size()
                if (size > 0) {
                    let jsArr2 = []
                    for (let j = 0; j < size; j++) {
                        jsArr2.push(colors.get(j) & 0xFF)
                    }
                    b64Colors = jsBytesToBase64(jsArr2)
                }
            } catch (e6) {
                player.sendData('mapart_error', { error: 'Failed to extract bytes: ' + e6 })
                return
            }
        }

        if (b64Colors == null || b64Colors.length == 0) {
            player.sendData('mapart_error', { error: 'Empty colors data' })
            return
        }

        player.sendData('mapart_data', {
            filename: filename,
            b64: b64Colors,
            scale: mapData.scale != null ? mapData.scale : 0,
            xCenter: mapData.xCenter != null ? mapData.xCenter : 0,
            zCenter: mapData.zCenter != null ? mapData.zCenter : 0,
            dimension: mapData.dimension != null ? mapData.dimension : 'minecraft:overworld'
        })

    } catch (e) {
        player.sendData('mapart_error', { error: 'Error: ' + e })
    }
})