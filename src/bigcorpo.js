import { handleProducts, handleHiring, handleMaterials, doExports, doResearch, upgradeWarehouse, getUpgrades, optimizeMaterials, maximizeHappiness } from "./lib/corpo";

const boosterMaterialProportion = 0.6;
const useMoneyProportion = 1;
const productNames = { Tobacco: "DeathSticks", Restaurant: "Pizza", "Computer Hardware": "Puter" };
const binarySearchData = {};

/** @param {import("..").NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.tail();

    const cities = Object.values(ns.enums.CityName);

    if (!ns.corporation.hasCorporation()) {
        ns.print("This script is a maintenance and growing script for corporations, and requires a corporation.");
        ns.exit();
    }

    const timer = setInterval(() => {
        ns.clearLog();
        ns.print(`Current state: ${ns.corporation.getCorporation().state}`);
    }, 100);
    ns.atExit(() => {
        clearInterval(timer);
    });

    while (true) {
        while (ns.corporation.getCorporation().state === "PURCHASE") {
            await ns.asleep(0);
        }
        while (ns.corporation.getCorporation().state !== "PURCHASE") {
            // MULTIPLE TIMES A CYCLE
            for (const division of ns.corporation.getCorporation().divisions) {
                if (ns.corporation.getDivision(division).makesProducts) {
                    handleProducts(ns, division, binarySearchData);
                    while (
                        ns.corporation.getHireAdVertCost(division) <=
                        ns.corporation.getCorporation().funds * useMoneyProportion
                    ) {
                        ns.corporation.hireAdVert(division);
                    }
                }
                doResearch(ns, division);
                for (const city of ns.corporation.getDivision(division).cities) {
                    upgradeWarehouse(ns, division, city);
                    handleHiring(ns, division, city);
                    handleMaterials(ns, division, city);
                }
            }
            getUpgrades(ns);
            await ns.asleep(0);
        }
        // ONCE A CYCLE
        for (const division of ns.corporation.getCorporation().divisions) {
            for (const city of cities) {
                if (!ns.corporation.getDivision(division).cities.includes(city))
                    ns.corporation.expandCity(division, city);
                if (!ns.corporation.hasWarehouse(division, city)) ns.corporation.purchaseWarehouse(division, city);
                ns.corporation.setSmartSupply(division, city, true);
            }
            for (const city of ns.corporation.getDivision(division).cities) {
                maximizeHappiness(ns, division, city);
                optimizeMaterials(ns, division, city);
            }
        }
        if (ns.corporation.hasUnlock("Export")) doExports(ns);

        for (const divdata of Object.values(binarySearchData)) {
            for (const citydata of Object.values(divdata)) {
                for (const data of Object.values(citydata)) {
                    data.changed = false;
                }
            }
        }
        // ns.tprint(binarySearchData)
        for (const faction of ns.getPlayer().factions) ns.corporation.bribe(faction, Math.max(ns.corporation.getCorporation().funds*0.01, 0))
        await ns.asleep(0);
    }
}
