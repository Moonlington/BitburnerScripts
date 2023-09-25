import { getServers, getRootAccess, copyScripts } from "./lib/utils";

/** @param {import("../.").NS} ns */
export async function main(ns) { 
    ns.disableLog("ALL");
    ns.tail();

    const servers = getServers(ns, (server) => {
        getRootAccess(ns, server);
        copyScripts(ns, server, ["share.js"], true);
        return ns.hasRootAccess(server);
    });

    const pids = []

    servers.forEach(server => {
        const freeRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
        if (freeRam < 4) return;

        const threads = Math.max(Math.floor(freeRam / 4), 1);
		const pid = ns.exec("share.js", server, threads);

        if (pid) pids.push(pid);
    })

    ns.atExit(()=>{
        const terminated = pids.filter(p => ns.kill(p));
		ns.print(`Terminated PIDS: ${terminated.join(", ")}`);
    })

    while (true) {
		ns.clearLog();
		let threadCount = 0
		pids.forEach(p => ns.getRunningScript(p) === null ? pids.splice(pids.indexOf(p), 1) : null);
		pids.forEach(p => threadCount += ns.getRunningScript(p).threads);
		const message = [`Active share scripts: ${pids.length}`]
		message.push(`Total threads:        ${ns.formatNumber(threadCount)}`);
		message.push(`Total share power:    ${ns.formatPercent(ns.getSharePower() - 1)}`);
		ns.print(message.join("\n"));
		await ns.sleep(1000);
	}
}