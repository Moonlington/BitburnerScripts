import { optimizeCorpoMaterials_raw } from "./lib/corpo";

const CORPORATION_NAME = "FloreCorp"; // change if you like
const AGRI_NAME = "AgriCorp";
const CHEM_NAME = "ChemCorp";
const TOBACCO_NAME = "DeathCorp";
const boosterMaterialProportion = 0.5;
const useMoneyProportion = 0.1;
const productNames = { Tobacco: "DeathSticks", Restaurant: "Pizza" };

/** @param {import("..").NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.tail();
    //this script is for BN3 only
    //we get an array of city names to compare for later
    const cities = Object.values(ns.enums.CityName);
    //if we dont already have a corp we start one
    ns.print("Prepping the Corp");
    if (!ns.corporation.hasCorporation()) {
        if (!ns.corporation.createCorporation(CORPORATION_NAME, false)) {
            ns.print("This script is made for BN3 only");
            ns.exit();
        }
    } else if (ns.corporation.getCorporation().funds !== 150e9) {
        ns.tprint("this script is meant to be run on a fresh corp pls sell your ceo position and rerun this script");
        ns.exit();
    }
    //base expand and unlock buys
    ns.corporation.expandIndustry("Agriculture", AGRI_NAME);
    ns.corporation.purchaseUnlock("Smart Supply");
    ns.corporation.hireAdVert(AGRI_NAME);
    ns.corporation.hireAdVert(AGRI_NAME);
    while (ns.corporation.getUpgradeLevel("Smart Storage") < 3) ns.corporation.levelUpgrade("Smart Storage");
    //expand to cities and buy warehouse and hire employees
    for (const city of cities) {
        if (!ns.corporation.getDivision(AGRI_NAME).cities.includes(city)) ns.corporation.expandCity(AGRI_NAME, city);
        if (!ns.corporation.hasWarehouse(AGRI_NAME, city)) ns.corporation.purchaseWarehouse(AGRI_NAME, city);
        while (ns.corporation.hireEmployee(AGRI_NAME, city, "Research & Development")) {}
        while (ns.corporation.getWarehouse(AGRI_NAME, city).level < 5) ns.corporation.upgradeWarehouse(AGRI_NAME, city);
        ns.corporation.setSmartSupply(AGRI_NAME, city, true);
    }
    ns.print("Prep Done. Now we make them Happy");
    //make them energetic and raise the morale
    let done = true;
    do {
        done = true;
        for (const city of ns.corporation.getDivision(AGRI_NAME).cities) {
            const { avgEnergy, avgMorale } = ns.corporation.getOffice(AGRI_NAME, city);
            if (avgEnergy < 99) ns.corporation.buyTea(AGRI_NAME, city);
            if (avgMorale < 99.5) ns.corporation.throwParty(AGRI_NAME, city, avgMorale > 99 ? 1e5 : 1e6);
            if (avgEnergy < 99 || avgMorale < 99) done = false;
        }
        if (!done) await waitState(ns, "START", true);
    } while (!done);
    ns.print("Everyone is happy. Now lets get to work");
    //we set the buys here
    for (const city of ns.corporation.getDivision(AGRI_NAME).cities) {
        optimizeMaterials(ns, AGRI_NAME, city, 550);
        ns.corporation.setAutoJobAssignment(AGRI_NAME, city, "Research & Development", 0);
        ns.corporation.setAutoJobAssignment(AGRI_NAME, city, "Operations", 1);
        ns.corporation.setAutoJobAssignment(AGRI_NAME, city, "Engineer", 1);
        ns.corporation.setAutoJobAssignment(AGRI_NAME, city, "Business", 1);
    }
    await waitState(ns, "SALE");
    //after we have bought the stuff we clear the buys and set the sells
    for (const city of ns.corporation.getDivision(AGRI_NAME).cities) {
        stopBuyingBoosters(ns, AGRI_NAME, city);
        ns.corporation.sellMaterial(AGRI_NAME, city, "Plants", "MAX", "MP");
        ns.corporation.sellMaterial(AGRI_NAME, city, "Food", "MAX", "MP");
    }
    ns.print("Just waiting until the Offers are nice will take a few Cycles.");
    //we wait 12 because we need to wait two cycle to get the jobs set and smart supply to register production then 10 rounds of producing and selling until the peak
    for (let i = 0; i < 12; i++) {
        await waitState(ns, "START", true);
        ns.print(`${i} offer of ${ns.formatNumber(ns.corporation.getInvestmentOffer().funds, 0, 1e9)}`);
    }
    ns.print(`Accepting offer of ${ns.formatNumber(ns.corporation.getInvestmentOffer().funds, 0, 1e9)}`);
    ns.corporation.acceptInvestmentOffer();

    // ROUND 2
	while (ns.corporation.getUpgradeLevel("Smart Storage") < 10) ns.corporation.levelUpgrade("Smart Storage");
	while (ns.corporation.getUpgradeLevel("Smart Factories") < 10) ns.corporation.levelUpgrade("Smart Factories");
	ns.corporation.purchaseUnlock("Export");

    ns.corporation.expandIndustry("Chemical", CHEM_NAME);
    for (const city of cities) {
        if (!ns.corporation.getDivision(CHEM_NAME).cities.includes(city)) ns.corporation.expandCity(CHEM_NAME, city);
        if (!ns.corporation.hasWarehouse(CHEM_NAME, city)) ns.corporation.purchaseWarehouse(CHEM_NAME, city);
        while (ns.corporation.hireEmployee(CHEM_NAME, city, "Research & Development")) {}
        while (ns.corporation.getWarehouse(CHEM_NAME, city).level < 3) ns.corporation.upgradeWarehouse(CHEM_NAME, city);
        ns.corporation.setSmartSupply(CHEM_NAME, city, true);

		while (ns.corporation.getWarehouse(AGRI_NAME, city).level < 10) ns.corporation.upgradeWarehouse(AGRI_NAME, city);
		ns.corporation.upgradeOfficeSize(AGRI_NAME, city, 3)
		while (ns.corporation.hireEmployee(AGRI_NAME, city, "Research & Development")) {}
		ns.corporation.exportMaterial(AGRI_NAME, city, CHEM_NAME, city, "Plants", "(IPROD+IINV/10)*(-1)")
		ns.corporation.exportMaterial(CHEM_NAME, city, AGRI_NAME, city, "Chemicals", "(IPROD+IINV/10)*(-1)")
    }

	ns.print("Chemical prep done, now we make them happy as well")

	done = true;
    do {
        done = true;
        for (const city of ns.corporation.getDivision(CHEM_NAME).cities) {
            const { avgEnergy, avgMorale } = ns.corporation.getOffice(CHEM_NAME, city);
            if (avgEnergy < 99) ns.corporation.buyTea(CHEM_NAME, city);
            if (avgMorale < 99.5) ns.corporation.throwParty(CHEM_NAME, city, avgMorale > 99 ? 1e5 : 1e6);
            if (avgEnergy < 99 || avgMorale < 99) done = false;
        }
		for (const city of ns.corporation.getDivision(AGRI_NAME).cities) {
            const { avgEnergy, avgMorale } = ns.corporation.getOffice(AGRI_NAME, city);
            if (avgEnergy < 99) ns.corporation.buyTea(AGRI_NAME, city);
            if (avgMorale < 99.5) ns.corporation.throwParty(AGRI_NAME, city, avgMorale > 99 ? 1e5 : 1e6);
            if (avgEnergy < 99 || avgMorale < 99) done = false;
        }
        if (!done) await waitState(ns, "START", true);
    } while (!done);

	ns.print("Everyone is happy. Now lets get to work");
    for (const city of ns.corporation.getDivision(AGRI_NAME).cities) {
        optimizeMaterials(ns, AGRI_NAME, city, 1700);
        ns.corporation.setAutoJobAssignment(AGRI_NAME, city, "Research & Development", 1);
        ns.corporation.setAutoJobAssignment(AGRI_NAME, city, "Operations", 2);
        ns.corporation.setAutoJobAssignment(AGRI_NAME, city, "Engineer", 2);
        ns.corporation.setAutoJobAssignment(AGRI_NAME, city, "Business", 1);
    }
	for (const city of ns.corporation.getDivision(CHEM_NAME).cities) {
        optimizeMaterials(ns, CHEM_NAME, city, 550);
        ns.corporation.setAutoJobAssignment(CHEM_NAME, city, "Research & Development", 0);
        ns.corporation.setAutoJobAssignment(CHEM_NAME, city, "Operations", 1);
        ns.corporation.setAutoJobAssignment(CHEM_NAME, city, "Engineer", 1);
        ns.corporation.setAutoJobAssignment(CHEM_NAME, city, "Business", 1);
    }
    await waitState(ns, "SALE");
    for (const city of ns.corporation.getDivision(AGRI_NAME).cities) {
        stopBuyingBoosters(ns, AGRI_NAME, city);
        ns.corporation.sellMaterial(AGRI_NAME, city, "Plants", "MAX", "MP");
        ns.corporation.sellMaterial(AGRI_NAME, city, "Food", "MAX", "MP");
    }
	for (const city of ns.corporation.getDivision(CHEM_NAME).cities) {
        stopBuyingBoosters(ns, CHEM_NAME, city);
        ns.corporation.sellMaterial(CHEM_NAME, city, "Chemicals", "MAX", "MP");
    }
	ns.print("Just waiting until the Offers are nice will take a few Cycles.");

	for (let i = 0; i < 16; i++) {
        await waitState(ns, "START", true);
        ns.print(`${i} offer of ${ns.formatNumber(ns.corporation.getInvestmentOffer().funds, 0, 1e9)}`);
    }
    ns.print(`Accepting offer of ${ns.formatNumber(ns.corporation.getInvestmentOffer().funds, 0, 1e9)}`);
    ns.corporation.acceptInvestmentOffer();

	// ROUND 3
	while (ns.corporation.getUpgradeLevel("Wilson Analytics") < 5) ns.corporation.levelUpgrade("Wilson Analytics");
	while (ns.corporation.getUpgradeLevel("Smart Storage") < 30) ns.corporation.levelUpgrade("Smart Storage");
	while (ns.corporation.getUpgradeLevel("Smart Factories") < 30) ns.corporation.levelUpgrade("Smart Factories");
	while (ns.corporation.getUpgradeLevel("Nuoptimal Nootropic Injector Implants") < 30) ns.corporation.levelUpgrade("Nuoptimal Nootropic Injector Implants");
	while (ns.corporation.getUpgradeLevel("Speech Processor Implants") < 30) ns.corporation.levelUpgrade("Speech Processor Implants");
	while (ns.corporation.getUpgradeLevel("Neural Accelerators") < 30) ns.corporation.levelUpgrade("Neural Accelerators");
	while (ns.corporation.getUpgradeLevel("FocusWires") < 30) ns.corporation.levelUpgrade("FocusWires");
	while (ns.corporation.getUpgradeLevel("ABC SalesBots") < 30) ns.corporation.levelUpgrade("ABC SalesBots");
	while (ns.corporation.getUpgradeLevel("Project Insight") < 20) ns.corporation.levelUpgrade("Project Insight");

	ns.corporation.expandIndustry("Tobacco", TOBACCO_NAME);
	for (const city of cities) {
        if (!ns.corporation.getDivision(TOBACCO_NAME).cities.includes(city)) ns.corporation.expandCity(TOBACCO_NAME, city);
        if (!ns.corporation.hasWarehouse(TOBACCO_NAME, city)) ns.corporation.purchaseWarehouse(TOBACCO_NAME, city);
		while (ns.corporation.getOffice(TOBACCO_NAME, city).size < (city === "Aevum" ? 90 : 60)) ns.corporation.upgradeOfficeSize(TOBACCO_NAME, city, 3);
        while (ns.corporation.hireEmployee(TOBACCO_NAME, city, "Research & Development")) {}
        while (ns.corporation.getWarehouse(TOBACCO_NAME, city).level < 20) ns.corporation.upgradeWarehouse(TOBACCO_NAME, city);
        ns.corporation.setSmartSupply(TOBACCO_NAME, city, true);

		ns.corporation.exportMaterial(AGRI_NAME, city, TOBACCO_NAME, city, "Plants", "(IPROD+IINV/10)*(-1)")
    }

	ns.print("Tobacco prep done, now we go make stuff")

	await waitState(ns, "START", true)
	for (const city of ns.corporation.getDivision(AGRI_NAME).cities) {
        optimizeMaterials(ns, AGRI_NAME, city, 3200);
    }
	for (const city of ns.corporation.getDivision(CHEM_NAME).cities) {
        optimizeMaterials(ns, CHEM_NAME, city, 960);
    }
	for (const city of ns.corporation.getDivision(TOBACCO_NAME).cities) {
        optimizeMaterials(ns, TOBACCO_NAME, city, 6000);
    }
    await waitState(ns, "SALE");
    for (const city of ns.corporation.getDivision(AGRI_NAME).cities) {
        stopBuyingBoosters(ns, AGRI_NAME, city);
        ns.corporation.sellMaterial(AGRI_NAME, city, "Plants", "MAX", "MP");
        ns.corporation.sellMaterial(AGRI_NAME, city, "Food", "MAX", "MP");
    }
	for (const city of ns.corporation.getDivision(CHEM_NAME).cities) {
        stopBuyingBoosters(ns, CHEM_NAME, city);
        ns.corporation.sellMaterial(CHEM_NAME, city, "Chemicals", "MAX", "MP");
    }
	for (const city of ns.corporation.getDivision(TOBACCO_NAME).cities) {
        stopBuyingBoosters(ns, TOBACCO_NAME, city);
    }
}

/** @param {import("..").NS} ns */
async function waitState(ns, state, onpoint = false) {
    while (ns.corporation.getCorporation().state !== state) await ns.asleep(100);
    if (onpoint) while (ns.corporation.getCorporation().state == state) await ns.asleep(100);
}

/** @param {import("..").NS} ns */
function optimizeMaterials(ns, division, city, size) {
    const hmd = ns.corporation.getMaterialData("Hardware");
    const amd = ns.corporation.getMaterialData("AI Cores");
    const remd = ns.corporation.getMaterialData("Real Estate");
    const rmd = ns.corporation.getMaterialData("Robots");
    const weights = [hmd.size, amd.size, remd.size, rmd.size];

    const industry = ns.corporation.getIndustryData(ns.corporation.getDivision(division).type);
    const factors = [industry.hardwareFactor, industry.aiCoreFactor, industry.realEstateFactor, industry.robotFactor];

    const optimum = optimizeCorpoMaterials_raw(weights, factors, size);
    const targetNums = { Hardware: optimum[0], "AI Cores": optimum[1], "Real Estate": optimum[2], Robots: optimum[3] };

    for (const [material, target] of Object.entries(targetNums)) {
        const stored = ns.corporation.getMaterial(division, city, material).stored;
        if (stored > target) {
            ns.corporation.buyMaterial(division, city, material, 0);
            continue;
        }
        ns.corporation.buyMaterial(division, city, material, (target - stored) / 10);
    }
}

/** @param {import("..").NS} ns */
function stopBuyingBoosters(ns, division, city) {
    for (const material of ["Hardware", "AI Cores", "Real Estate", "Robots"]) {
        ns.corporation.buyMaterial(division, city, material, 0);
    }
}

async function d(ns, text) {
	await ns.asleep(100)
	ns.print(text)
}