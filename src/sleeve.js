import { getServers, getRootAccess, copyScripts } from "./lib/utils";

/** @param {import("..").NS} ns */
export async function main(ns) {
    const s = ns.sleeve;
    const sleeves = [];
    let chosenSleeve = null;
    for (let i = 0; i < s.getNumSleeves(); i++) {
        sleeves.push(i);
        s.setToIdle(i);
    }

    while (true) {
        for (let i = 0; i < s.getNumSleeves(); i++) {
            const sleeve = s.getSleeve(i);
            if (sleeve.shock >= 95) {
                if (s.getTask(i)?.type != "RECOVERY") s.setToShockRecovery(i);
                continue;
            } else if (!ns.gang.inGang()) {
                if (ns.heart.break() >= -54000 && ns.formulas.work.crimeSuccessChance(sleeve, "Homicide") >= 0.25) {
                    if (s.getTask(i)?.type != "CRIME" || s.getTask(i).crimeType != "Homicide")
                        s.setToCommitCrime(i, "Homicide");
                    continue;
                }
                if (s.getTask(i)?.type != "CRIME" || s.getTask(i).crimeType != "Mug") {
                    s.setToCommitCrime(i, "Mug");
                    continue;
                }
                if (ns.heart.break() <= -54000) {
                    ns.tprint("SUCCESS: Enough negative karma to make a gang!")
                    ns.exec("gang.js", "home")
                    if (ns.isRunning("bladeSleeve.js")) ns.exit()
                    ns.spawn("bladeSleeve.js")
                }
            } else {
                if (ns.isRunning("bladeSleeve.js")) ns.exit()
                ns.tprint("SUCCESS: Already in a gang, switching to blade mode.")
                ns.spawn("bladeSleeve.js")
            }
        }
        await ns.asleep(0);
    }
}