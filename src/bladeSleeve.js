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
        if (!ns.bladeburner.inBladeburner()) {
            ns.tprint("ERROR: Not in bladeburner!")
            ns.exit()
        }
        sleeves.sort((a, b) => s.getSleeve(b).storedCycles - s.getSleeve(a).storedCycles);
        for (const steve of sleeves) {
            ns.print(s.getSleeve(steve).storedCycles);
            if (chosenSleeve && chosenSleeve != steve) {
                handleRestSleeve(steve);
                continue;
            }
            if (s.getSleeve(steve).storedCycles < 3000 && chosenSleeve != steve) {
                handleRestSleeve(steve);
                continue;
            }
            chosenSleeve = steve;
            if (
                s.getSleeve(steve)?.storedCycles < 600 &&
                s.getSleeve(steve).storedCycles < 300 - s.getTask(steve).cyclesWorked
            ) {
                chosenSleeve = null;
                handleRestSleeve(steve);
                continue;
            }
            if (!s.getTask(steve) || s.getTask(steve).type != "INFILTRATE")
                s.setToBladeburnerAction(steve, "Infiltrate synthoids");
        }
        await ns.asleep(0);
    }

    function handleRestSleeve(sleeveNum) {
        if (s.getSleeve(sleeveNum).storedCycles >= 6000) {
            if (s.getSleeve(sleeveNum).shock >= 95) {
                if (s.getTask(sleeveNum)?.type != "RECOVERY") s.setToShockRecovery(sleeveNum);
                return;
            } else if (ns.heart.break() >= -54000 && ns.formulas.work.crimeSuccessChance(s.getSleeve(sleeveNum), "Homicide") >= 0.25) {
                if (s.getTask(sleeveNum)?.type != "CRIME" || s.getTask(sleeveNum).crimeType != "Homicide")
                    s.setToCommitCrime(sleeveNum, "Homicide");
                return;
            }
            if (s.getTask(sleeveNum)?.type != "CRIME" || s.getTask(sleeveNum).crimeType != "Mug") {
                s.setToCommitCrime(sleeveNum, "Mug");
                return;
            }
            return;
        }
        if (s.getSleeve(sleeveNum).storedCycles < 3000) {
            s.setToIdle(sleeveNum);
        }
    }
}