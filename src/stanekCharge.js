import { getServers, getRootAccess, copyScripts } from "./lib/utils";

/** @param {import("..").NS} ns */
export async function main(ns) {
    const fileName = "charge.js"
    const fileSize = ns.getScriptRam(fileName), killIt = (server, fileName) => ns.ps(server).forEach(script => script.filename === fileName && ns.kill(script.pid));

    const chargeGuide = []
    for (const obj of ns.stanek.activeFragments()) {
        if (obj.id >= 100) continue;
        chargeGuide.push({ id: obj.id, x: obj.x, y: obj.y, rotation: obj.rotation });
    }
    ns.write("charge_guide.txt", JSON.stringify(chargeGuide), "w");

    const servers = getServers(ns, (server) => {
        getRootAccess(ns, server);
        copyScripts(ns, server, [fileName, "charge_guide.txt"], true);
        return ns.hasRootAccess(server) && !server.startsWith("hacknet-server-");
    });


    await ns.asleep(1000)

    for (const server of servers) {
        if (ns.isRunning(fileName, server)) killIt(server, fileName);
        const availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server), threads = Math.floor(availableRam / fileSize)
        if (availableRam < 2) continue;
        ns.exec(fileName, server, {threads, temporary:true})
        ns.toast(`${fileName} started on ${server} with ${threads} threads.`);
    }

    killIt("home", fileName);
    ns.spawn(fileName, {threads: Math.floor((ns.getServerMaxRam("home") + ns.getScriptRam(ns.getScriptName()) - ns.getServerUsedRam("home")) / fileSize), temporary:true});
}