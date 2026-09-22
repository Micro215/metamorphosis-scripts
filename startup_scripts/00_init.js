(function checkUpdates() {
    let settings = JsonIO.read("kubejs/config/settings.json")
    FetchJS.fetch(settings.verLink, data => {
        if (JSIO.read("kubejs/config/ver.txt")[0] !== data) {
            JSIO.findJSInDirectory("kubejs/").forEach(file => {
                JSIO.delete(file)
            })
            FetchJS.fetch(settings.manifestLink, data => {
                data.split("~").forEach(path => {
                    let link = settings.baseLink + path
                    let filepath = "kubejs/" + path
                    FetchJS.download(link, filepath, _ => {})
                })
            })
            console.error("New version detected. Please restart your instance.")
        }
    })
})()

let customModeName = "<glitch frequency=10 shiftChance=0.1 slices=5><c col=60AC0C>M<c col=F3CA48>E<c col=#968355>T<c col=D0D6DB>A<c col=1C6271>M<c col=C1D8FF>O<c col=C19856>R<c col=A07831>P<c col=4A474A>H<c col=C98541>O<c col=E631FB>S<c col=f6a0d3>I<c col=69dd54>S</c></glitch>"
Platform.mods.kubejs.name = customModeName
Platform.getInfo("metamorphosis").name = customModeName

global.metamorphosis = {}