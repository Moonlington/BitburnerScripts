import { getServers, getRootAccess, copyScripts } from "./lib/utils";

var ram = 32;
var bb = true;
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
    while (true) {
        if (!ns.hasTorRouter()) ns.singularity.purchaseTor();
        ns.singularity.upgradeHomeRam()
        const unownedPrograms = darkwebPrograms.filter((p) => !ns.fileExists(p, "home"));
        for (const program of unownedPrograms) {
            ns.singularity.purchaseProgram(program);
        }
        ns.singularity.upgradeHomeCores()
        for (const faction of ns.singularity.checkFactionInvitations()) {
            ns.singularity.joinFaction(faction)
        }
        await ns.asleep(0);
    }
}
