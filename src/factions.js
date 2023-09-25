import { getServers, getRootAccess, copyScripts } from "./lib/utils";

const factionServers = [
    "CSEC",
    "avmnite-02h",
    "I.I.I.I",
    "run4theh111z",
]

/** @param {import("..").NS} ns */
export async function main(ns) {
    const servers = getServers(ns, (server) => {
        getRootAccess(ns, server);
        return ns.hasRootAccess(server);
    });

    for (const serverName of factionServers) {
        const server = ns.getServer(serverName)
        if (server.hasAdminRights && server.requiredHackingSkill <= ns.getPlayer().skills.hacking && !server.backdoorInstalled) {
            ns.singularity.connect("home")
            const pid = ns.exec("route.js", "home", 1, serverName)
            while (ns.getRunningScript(pid)) await ns.asleep(0);
            await ns.singularity.installBackdoor();
            ns.singularity.connect("home")
        }
    }
}
