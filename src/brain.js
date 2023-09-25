import { FactionWorkType } from "..";
import { getServers, getRootAccess, copyScripts } from "./lib/utils";

var ram = 32;
const darkwebPrograms = [
    "BruteSSH.exe",
    "FTPCrack.exe",
    "relaySMTP.exe",
    "HTTPWorm.exe",
    "SQLInject.exe",
    "ServerProfiler.exe",
    "DeepscanV1.exe",
    "DeepscanV2.exe",
    "AutoLink.exe",
    "Formulas.exe",
];

/** @param {import("..").NS} ns */
export async function main(ns) {
    const servers = getServers(ns, (server) => {
        getRootAccess(ns, server);
        return ns.hasRootAccess(server);
    });

    while (true) {
        ns.singularity.purchaseTor();

        for (const program of darkwebPrograms.filter((p) => !ns.fileExists(p, "home"))) {
            ns.singularity.purchaseProgram(program);
        }

        handleSleeves(ns);

        await ns.asleep(0);
    }
}

/** @param {import("..").NS} ns */
function handleSleeves(ns) {
    for (let i = 0; i < ns.sleeve.getNumSleeves(); i++) {
        const sleeve = ns.sleeve.getSleeve(i);
        if (sleeve.shock >= 95) {
            if (ns.sleeve.getTask(i).type != "RECOVERY") ns.sleeve.setToShockRecovery(i);
            continue;
        }
        if (ns.formulas.work.crimeSuccessChance(sleeve, "Homicide") >= .25) {
            if (ns.sleeve.getTask(i).type != "CRIME" || ns.sleeve.getTask(i).crimeType != "Homicide") ns.sleeve.setToCommitCrime(i, "Homicide")
            continue;
        }
        if (ns.sleeve.getTask(i).type != "CRIME" || ns.sleeve.getTask(i).crimeType != "Mug") ns.sleeve.setToCommitCrime(i, "Mug")
    }
}
