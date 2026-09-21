function checkUpdates() {
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
}

checkUpdates()
