const genScripts = [
    "sleeve.js",
    "buyServers.js",
    "maintenance.js",
    "contractor.js",
    "hashNet.js",
    "gang.js",
    "bb.js",
    "bigcorpo.js",
]

/** @param {import("..").NS} ns */
export async function main(ns) {
    for (const script of genScripts) {
        launchScript(script)
    }

    ns.tprint(`INFO: Launching script "controller.js"`)
    ns.spawn("controller.js");

    function launchScript(script) {
        if (ns.isRunning(script, "home")) return;
        if (ns.getScriptRam(script, "home") < (ns.getServerMaxRam("home")-ns.getServerUsedRam("home"))) {
            ns.tprint(`INFO: Launching script "${script}"`)
            ns.exec(script, "home")
        }
    }
}