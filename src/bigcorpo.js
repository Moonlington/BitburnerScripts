import { handleProducts, handleHiring, handleMaterials, doExports, doResearch, upgradeWarehouse, getUpgrades, optimizeMaterials, maximizeHappiness } from "./lib/corpo";

const boosterMaterialProportion = 0.6;
const useMoneyProportion = 1;
const productNames = { Tobacco: "DeathSticks", Restaurant: "Pizza", "Computer Hardware": "Puter" };
const binarySearchData = {};

/** @param {import("..").NS} ns */
export async function main(ns) {
    const c = ns.corporation

    ns.disableLog("ALL");

    const cities = Object.values(ns.enums.CityName);

    if (!c.hasCorporation()) {
        ns.tprint("ERROR: Not in a Corporation!");
        ns.exit();
    }

    if (!c.getCorporation().divisions.map((d)=>c.getDivision(d)).filter((d)=>d.type==="Tobacco").length < 1) {
        ns.tprint("ERROR: No Tabacco industry, assuming not ready!");
        ns.exit();
    }

    const timer = setInterval(() => {
        ns.clearLog();
        ns.print(`Current state: ${c.getCorporation().state}`);
    }, 100);
    ns.atExit(() => {
        clearInterval(timer);
    });

    while (true) {
        while (c.getCorporation().state === "PURCHASE") {
            await ns.asleep(0);
        }
        while (c.getCorporation().state !== "PURCHASE") {
            // MULTIPLE TIMES A CYCLE
            for (const division of c.getCorporation().divisions) {
                if (c.getDivision(division).makesProducts) {
                    handleProducts(ns, division, binarySearchData);
                    while (
                        c.getHireAdVertCost(division) <=
                        c.getCorporation().funds * useMoneyProportion
                    ) {
                        c.hireAdVert(division);
                    }
                }
                doResearch(ns, division);
                for (const city of c.getDivision(division).cities) {
                    upgradeWarehouse(ns, division, city);
                    handleHiring(ns, division, city);
                    handleMaterials(ns, division, city);
                }
            }
            getUpgrades(ns);
            await ns.asleep(0);
        }
        // ONCE A CYCLE
        for (const division of c.getCorporation().divisions) {
            for (const city of cities) {
                if (!c.getDivision(division).cities.includes(city))
                    c.expandCity(division, city);
                if (!c.hasWarehouse(division, city)) c.purchaseWarehouse(division, city);
                c.setSmartSupply(division, city, true);
            }
            for (const city of c.getDivision(division).cities) {
                maximizeHappiness(ns, division, city);
                optimizeMaterials(ns, division, city);
            }
        }
        if (c.hasUnlock("Export")) doExports(ns);

        for (const divdata of Object.values(binarySearchData)) {
            for (const citydata of Object.values(divdata)) {
                for (const data of Object.values(citydata)) {
                    data.changed = false;
                }
            }
        }
        // ns.tprint(binarySearchData)
        for (const faction of ns.getPlayer().factions) c.bribe(faction, Math.max(c.getCorporation().funds*0.01, 0))
        await ns.asleep(0);
    }
}
