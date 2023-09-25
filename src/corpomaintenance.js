import { handleHiring, handleMaterials, handleProducts, maximizeHappiness, doResearch, doExports, optimizeMaterials } from "./lib/corpo";

const boosterMaterialProportion = 0.75;
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
                }
                doResearch(ns, division);
                for (const city of ns.corporation.getDivision(division).cities) {
                    handleMaterials(ns, division, city);
                }
            }
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
        await ns.asleep(0);
    }
}