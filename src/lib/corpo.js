const boosterMaterialProportion = 0.7;
const useMoneyProportion = 1;
const productNames = { Tobacco: "DeathSticks", Restaurant: "Pizza", "Computer Hardware": "Puter", "Real Estate": "House" };

export function optimizeCorpoMaterials_raw(weights, factors, spaceConstraint, round = true) {
    let p = factors.reduce((a, b) => a + b, 0);
    let w = weights.reduce((a, b) => a + b, 0);
    let r = [];

    for (let i = 0; i < weights.length; ++i) {
        let m =
            (spaceConstraint - 500 * ((weights[i] / factors[i]) * (p - factors[i]) - (w - weights[i]))) /
            (p / factors[i]) /
            weights[i];
        if (m < 0) {
            weights.splice(i, 1);
            factors.splice(i, 1);
            r = optimizeCorpoMaterials_raw(weights, factors, spaceConstraint, round);
            r.splice(i, 0, 0);
            return r;
        } else {
            if (round) m = Math.round(m);
            r.push(m);
        }
    }
    return r;
}


/** @param {import("..").NS} ns */
export function getUpgrades(ns) {
    const upgrades = ns.corporation.getConstants().upgradeNames.filter((u) => u !== "DreamSense");
    for (const upgrade of upgrades) {
        getUpgradeThreshold(ns, upgrade, useMoneyProportion);
    }
}

/** @param {import("..").NS} ns */
export function getUpgradeThreshold(ns, upgradeName, threshold) {
    if (ns.corporation.getUpgradeLevelCost(upgradeName) <= ns.corporation.getCorporation().funds * useMoneyProportion) {
        ns.corporation.levelUpgrade(upgradeName);
    }
}

/** @param {import("..").NS} ns */
export function upgradeWarehouse(ns, division, city) {
    if (
        ns.corporation.getUpgradeWarehouseCost(division, city, 10) <=
        ns.corporation.getCorporation().funds * useMoneyProportion
    ) {
        ns.corporation.upgradeWarehouse(division, city, 10);
    }
}

/** @param {import("..").NS} ns */
export function doExports(ns) {
    const exportString = "(IPROD+IINV/10)*(-1)";
    const consumers = {};
    const producers = {};
    for (const division of ns.corporation.getCorporation().divisions) {
        const industryData = ns.corporation.getIndustryData(ns.corporation.getDivision(division).type);
        for (const material of Object.keys(industryData.requiredMaterials)) {
            if (!(material in consumers)) {
                consumers[material] = [division];
            } else {
                consumers[material].push(division);
            }
        }
        if (!industryData.producedMaterials) continue;
        for (const material of industryData.producedMaterials) {
            if (!(material in producers)) {
                producers[material] = [division];
            } else {
                producers[material].push(division);
            }
        }
    }

    for (const [material, divisions] of Object.entries(producers)) {
        if (!(material in consumers)) continue;
        for (const division of divisions) {
            for (const city of ns.corporation.getDivision(division).cities) {
                for (const consumer of consumers[material]) {
                    if (!ns.corporation.getDivision(consumer).cities.includes(city)) continue;
                    ns.corporation.cancelExportMaterial(division, city, consumer, city, material);
                    ns.corporation.exportMaterial(division, city, consumer, city, material, exportString);
                }
            }
        }
    }
}

/** @param {import("..").NS} ns */
export function handleMaterials(ns, division, city) {
    const producedMaterials = ns.corporation.getIndustryData(
        ns.corporation.getDivision(division).type
    ).producedMaterials;
    if (!producedMaterials) return;
    for (const material of producedMaterials) {
        if (ns.corporation.hasResearched(division, "Market-TA.II")) {
            ns.corporation.setMaterialMarketTA1(division, city, material, false);
            ns.corporation.setMaterialMarketTA2(division, city, material, true);
            ns.corporation.sellMaterial(division, city, material, "MAX", "MP");
        } else {
            ns.corporation.sellMaterial(division, city, material, "MAX", "MP");
        }
    }
}

/** @param {import("..").NS} ns */
export function doResearch(ns, division) {
    if (!ns.corporation.hasResearched(division, "Hi-Tech R&D Laboratory")) {
        if (
            ns.corporation.getResearchCost(division, "Hi-Tech R&D Laboratory") * 2 <
            ns.corporation.getDivision(division).researchPoints
        ) {
            ns.corporation.research(division, "Hi-Tech R&D Laboratory");
        }
        return;
    }
    if (!ns.corporation.hasResearched(division, "Market-TA.II")) {
        if (
            ns.corporation.getResearchCost(division, "Market-TA.I") * 2 +
                ns.corporation.getResearchCost(division, "Market-TA.II") * 2 <
            ns.corporation.getDivision(division).researchPoints
        ) {
            ns.corporation.research(division, "Market-TA.I");
            ns.corporation.research(division, "Market-TA.II");
        }
        return;
    }

    for (const research of ns.corporation.getConstants().researchNames.filter((r) => {
        return ns.corporation.getDivision(division).makesProducts || !r.startsWith("uPgrade");
    })) {
        if (!ns.corporation.hasResearched(division, research)) {
            if (
                ns.corporation.getResearchCost(division, research) * 4 <
                ns.corporation.getDivision(division).researchPoints
            ) {
                ns.corporation.research(division, research);
            }
        }
    }
}

/** @param {import("..").NS} ns */
export function handleProducts(ns, division, binarySearchData) {
    if (!ns.corporation.getDivision(division).cities.includes("Aevum")) return;
    var div = ns.corporation.getDivision(division);
    const sortedProducts = div.products.sort((a, b) => {
        ns.corporation.getProduct(division, "Aevum", a).rating - ns.corporation.getProduct(division, "Aevum", b).rating;
    });
    if (
        div.products.filter((p) => ns.corporation.getProduct(division, "Aevum", p).developmentProgress >= 100)
            .length === div.maxProducts
    ) {
        let number = Number(sortedProducts[sortedProducts.length - 1].match(/\w+ v(\d+)/)[1]) + 1;
        while (div.products.includes(`${productNames[div.type]} v${number}`)) {
            number++;
        }
        ns.corporation.discontinueProduct(division, sortedProducts[0]);
        if (ns.corporation.getCorporation().funds > 0)
            ns.corporation.makeProduct(
                division,
                "Aevum",
                `${productNames[div.type]} v${number}`,
                ns.corporation.getCorporation().funds * 0.1,
                ns.corporation.getCorporation().funds * 0.1
            );
    } else if (div.products.length < div.maxProducts) {
        let number =
            sortedProducts.length > 0
                ? Number(sortedProducts[sortedProducts.length - 1].match(/\w+ v(\d+)/)[1]) + 1
                : 1;
        while (div.products.includes(`${productNames[div.type]} v${number}`)) {
            number++;
        }
        if (ns.corporation.getCorporation().funds > 0)
            ns.corporation.makeProduct(
                division,
                "Aevum",
                `${productNames[div.type]} v${number}`,
                ns.corporation.getCorporation().funds * 0.1,
                ns.corporation.getCorporation().funds * 0.1
            );
    }
    div = ns.corporation.getDivision(division);
    for (const product of div.products.filter(
        (p) => ns.corporation.getProduct(division, "Aevum", p).developmentProgress >= 100
    )) {
        for (const city of div.cities) {
            if (ns.corporation.hasResearched(division, "Market-TA.II")) {
                ns.corporation.setProductMarketTA1(division, product, false);
                ns.corporation.setProductMarketTA2(division, product, true);
                ns.corporation.sellProduct(division, city, product, "MAX", "MP", true);
            } else {
                ns.corporation.sellProduct(
                    division,
                    city,
                    product,
                    "MAX",
                    `MP*${binarySearchPriceProduct(ns, division, city, product, binarySearchData)}`,
                    true
                );
            }
        }
    }
}

/** @param {import("..").NS} ns */
export function handleHiring(ns, division, city) {
    if (
        ns.corporation.getOfficeSizeUpgradeCost(division, city, 15) <=
        ns.corporation.getCorporation().funds * useMoneyProportion
    ) {
        ns.corporation.upgradeOfficeSize(division, city, 15);
    }
    while (ns.corporation.hireEmployee(division, city, "Research & Development")) {}

    const size = ns.corporation.getOffice(division, city).size;

    assignJobs(ns, division, city, [0,0,0,0,0])

    if (ns.corporation.getDivision(division).makesProducts) {
        if (city !== "Aevum") {
            // Research Cities
            const rest = Math.max(1, Math.floor(size * 0.01))
            assignJobs(ns, division, city, [rest,rest,rest,rest,size-(rest*4)])
        } else {
            // Design Cities
            const [ops, eng, bus] = [Math.max(1, Math.floor(size * 0.06)), Math.max(1, Math.floor(size * 0.3)), Math.max(1, Math.floor(size * 0.08))]
            assignJobs(ns, division, city, [ops, eng, bus, size-ops-eng-bus, 0])
        }
    } else {
        // Rest Cities
        const [ops, eng, bus, man] = [Math.max(1, Math.floor(size * 0.06)), Math.max(1, Math.floor(size * 0.3)), Math.max(1, Math.floor(size * 0.08)), Math.floor(size * 0.3)]
        assignJobs(ns, division, city, [ops, eng, bus, man,size-ops-eng-bus-man])
    }
}

/** @param {import("..").NS} ns */
export function assignJobs(ns, division, city, amounts) {
    const [ops, eng, bus, man, rnd] = amounts
    ns.corporation.setAutoJobAssignment(division, city, "Operations", ops);
    ns.corporation.setAutoJobAssignment(division, city, "Engineer", eng);
    ns.corporation.setAutoJobAssignment(division, city, "Business", bus);
    ns.corporation.setAutoJobAssignment(division, city, "Management", man);
    ns.corporation.setAutoJobAssignment(division, city, "Research & Development", rnd);
    ns.corporation.setAutoJobAssignment(division, city, "Intern", 0);
}

/** @param {import("..").NS} ns */
export function maximizeHappiness(ns, division, city) {
    const { avgEnergy, avgMorale } = ns.corporation.getOffice(division, city);
    if (avgEnergy < 99) ns.corporation.buyTea(division, city);
    if (avgMorale < 99.5) ns.corporation.throwParty(division, city, avgMorale > 99 ? 1e5 : 1e6);
}

/** @param {import("..").NS} ns */
export function optimizeMaterials(ns, division, city) {
    const hmd = ns.corporation.getMaterialData("Hardware");
    const amd = ns.corporation.getMaterialData("AI Cores");
    const remd = ns.corporation.getMaterialData("Real Estate");
    const rmd = ns.corporation.getMaterialData("Robots");
    const weights = [hmd.size, amd.size, remd.size, rmd.size];

    const industry = ns.corporation.getIndustryData(ns.corporation.getDivision(division).type);
    const factors = [industry.hardwareFactor, industry.aiCoreFactor, industry.realEstateFactor, industry.robotFactor].map((s)=>s === undefined ? 0 : s);

    const warehouse = ns.corporation.getWarehouse(division, city);

    const optimum = optimizeCorpoMaterials_raw(weights, factors, warehouse.size * boosterMaterialProportion);
    const targetNums = { Hardware: optimum[0], "AI Cores": optimum[1], "Real Estate": optimum[2], Robots: optimum[3] };

    for (const [material, target] of Object.entries(targetNums)) {
        if (isNaN(target)) continue;
        const stored = ns.corporation.getMaterial(division, city, material).stored;
        if (stored > target) {
            ns.corporation.buyMaterial(division, city, material, 0);
            ns.corporation.sellMaterial(division, city, material, (stored - target) / 10, "0");
            continue;
        }
        ns.corporation.buyMaterial(division, city, material, (target - stored) / 10);
        ns.corporation.sellMaterial(division, city, material, 0, "0");
    }
}

/** @param {import("..").NS} ns */
export function binarySearchPriceProduct(ns, division, city, product, binarySearchData) {
    if (!(division in binarySearchData)) {
        binarySearchData[division] = {};
    }
    if (!(city in binarySearchData[division])) {
        binarySearchData[division][city] = {};
    }
    if (!(product in binarySearchData[division][city])) {
        binarySearchData[division][city][product] = { value: 2, lower: 0, changed: false };
    }

    const data = binarySearchData[division][city][product];
    if (data.changed) return data.value;

    const mat = ns.corporation.getProduct(division, city, product);
    if (mat.stored <= 0) {
        data.lower = data.value;
        data.value = data.value * 2;
    } else {
        if (data.value - data.lower <= 0.1) {
            data.value = data.value * 0.99;
            data.lower = data.value;
        } else {
            data.value = (data.lower + data.value) / 2;
        }
    }
    data.changed = true;
    return data.value;
}