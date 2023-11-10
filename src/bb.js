/** @param {import("..").NS} ns */
export async function main(ns) {
    const bb = ns.bladeburner;
    let resting,
        diplo = false;

    if (!bb.inBladeburner()) {
        ns.tprint("ERROR: Not in Bladeburner!");
        ns.exit();
    }

    while (true) {
        operate();
        getSkills();
        if (bb.getCityEstimatedPopulation(bb.getCity()) <= 1e9) {
            let cities = Object.values(ns.enums.CityName);
            cities.sort((a,b) => bb.getCityEstimatedPopulation(b) - bb.getCityEstimatedPopulation(a))
            cities = cities.filter(a => bb.getCityChaos(a) < 50)
            bb.switchCity(cities[0]);
        }
        await ns.asleep(0);
    }

    function getStaminaPercentage() {
        const [current, max] = ns.bladeburner.getStamina();
        return current / max;
    }

    function operate() {
        if (getStaminaPercentage() >= 1) resting = false;
        if (getStaminaPercentage() <= 0.5) resting = true;

        if (bb.getCityChaos(bb.getCity()) >= 50) diplo = true;

        const inaccuracy =
            bb.getActionEstimatedSuccessChance("BlackOps", bb.getBlackOpNames()[bb.getBlackOpNames().length - 1])[1] -
            bb.getActionEstimatedSuccessChance("BlackOps", bb.getBlackOpNames()[bb.getBlackOpNames().length - 1])[0];
        if (
            bb.getCityChaos(bb.getCity()) <= 5 ||
            bb.getActionEstimatedSuccessChance("Operation", "Assassination")[1] >= 1
        )
            diplo = false;

        if (inaccuracy > 0) {
            let action = { type: "General", name: "Field Analysis" };
            if (bb.getActionTime("Operation", "Investigation") < bb.getActionTime("General", "Field Analysis"))
                action = { type: "Operation", name: "Investigation" };
            if (bb.getCurrentAction().name != action.name) bb.startAction(action.type, action.name);
            return;
        }
        if (diplo) {
            if (bb.getCurrentAction().name != "Diplomacy") bb.startAction("General", "Diplomacy");
            return;
        }

        if (resting) {
            if (bb.getCurrentAction().name != "Training") bb.startAction("General", "Training");
            return;
        }

        for (const bOp of bb.getBlackOpNames()) {
            if (bb.getActionCountRemaining("BlackOps", bOp) < 1) continue;
            if (bb.getBlackOpRank(bOp) > bb.getRank()) continue;
            if (bb.getActionEstimatedSuccessChance("BlackOps", bOp)[1] < 1) break;
            if (bb.getCurrentAction().name != bOp) bb.startAction("BlackOps", bOp);
            return;
        }

        let operationObjects = [];
        const dontWant = ["Raid", "Tracking"];
        for (const operation of bb.getOperationNames()) {
            if (dontWant.includes(operation)) continue;
            const chance = bb.getActionEstimatedSuccessChance("Operation", operation)[0];
            const repGain = bb.getActionRepGain("Operation", operation);
            const remaining = bb.getActionCountRemaining("Operation", operation);
            operationObjects.push({ name: operation, chance, repGain, remaining });
        }

        operationObjects = operationObjects.filter((o) => o.chance >= 1 && o.remaining > 0);
        // operationObjects.sort((a, b) => b.repGain - a.repGain);
        operationObjects.reverse();
        for (const operation of operationObjects) {
            if (bb.getCurrentAction().name != operation.name) bb.startAction("Operation", operation.name);
            return;
        }

        let contractObjects = [];
        for (const contract of bb.getContractNames()) {
            if (dontWant.includes(contract)) continue;
            const chance = bb.getActionEstimatedSuccessChance("Contracts", contract)[0];
            const repGain = bb.getActionRepGain("Contracts", contract);
            const remaining = bb.getActionCountRemaining("Contracts", contract);
            contractObjects.push({ name: contract, chance, repGain, remaining });
        }

        contractObjects = contractObjects.filter((o) => o.chance >= 1 && o.remaining > 0);
        contractObjects.sort((a, b) => b.chance - a.chance);
        for (const contract of contractObjects) {
            if (bb.getCurrentAction().name != contract.name) bb.startAction("Contracts", contract.name);
            return;
        }

        if (bb.getCityEstimatedPopulation(bb.getCity()) <= 1e9) {
            if (bb.getCurrentAction().name != "Investigation") bb.startAction("Operations", "Investigation");
            return
        }

        if (bb.getCurrentAction().name != "Training") bb.startAction("General", "Training");
        return;
    }

    function getSkills() {

        const skillObjects = [];
        for (const skill of bb.getSkillNames()) {
            if (skill == "Overclock" && bb.getSkillLevel(skill) == 90) continue;
            if (bb.getSkillLevel(skill) >= 50000 && skill != "Hyperdrive") continue;
            const cost = bb.getSkillUpgradeCost(skill);
            skillObjects.push({ name: skill, cost });
        }

        skillObjects.sort((a, b) => a.cost - b.cost);
        if (skillObjects[0].name == "Hyperdrive") {
            while (bb.getSkillUpgradeCost(skillObjects[0].name) <= bb.getSkillPoints()) bb.upgradeSkill(skillObjects[0].name);
            return
        }
        if (bb.getSkillUpgradeCost(skillObjects[0].name) <= bb.getSkillPoints()) bb.upgradeSkill(skillObjects[0].name);
    }
}
