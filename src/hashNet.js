import { getServers, copyScripts, checkTarget, isPrepped, prep, getRootAccess } from "lib/utils.js";
const roiLimit = 4*24*60*60
const budget = 0.1
var lastSplurge = Date.now();

/** @param {import("..").NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    const hn = ns.hacknet;

    while (true) {
        for (let i = 0; i < 50; i++) {
            if (ns.bladeburner.inBladeburner()) {
                if ((hn.getHashUpgradeLevel("Exchange for Bladeburner Rank")+1)*250 > 3.3*(hn.getHashUpgradeLevel("Exchange for Bladeburner SP")+1)*250) {
                    hn.spendHashes("Exchange for Bladeburner SP")
                    continue
                }
                hn.spendHashes("Exchange for Bladeburner Rank")
                continue
            }
            let target = "n00dles";
        
            const servers = getServers(ns, (server) => {
                getRootAccess(ns, server);
                target = checkTarget(ns, server, target, ns.fileExists("Formulas.exe", "home"));
                return ns.hasRootAccess(server) && !server.startsWith("hacknet-server-");
            });

            if (Date.now()-lastSplurge < 60000) {
                break
            }

            if ((hn.getHashUpgradeLevel("Reduce Minimum Security")+1)*50 > (hn.getHashUpgradeLevel("Increase Maximum Money")+1)*50) {
                hn.spendHashes("Increase Maximum Money", target)
                continue
            }
            hn.spendHashes("Reduce Minimum Security", target)
        }

        if (ns.hacknet.numNodes() < 1) {
            if (ns.getPlayer().money > hn.getPurchaseNodeCost()) {
                hn.purchaseNode();
            } else {
                ns.print("Not enough money for first hacknet server.");
                await ns.asleep(100)
                continue;
            }
        }

        let upgradeObjects = []
        for (let i = 0; i < hn.numNodes(); i++) {
            const nodeStat = hn.getNodeStats(i)
            const levelUp = {
                type: "level",
                nodeNum: i,
                cost: hn.getLevelUpgradeCost(i, 1),
                newGainRate: ns.formulas.hacknetServers.hashGainRate(nodeStat.level+1, nodeStat.ramUsed, nodeStat.ram, nodeStat.cores, ns.getHacknetMultipliers().production),
                execute: () => hn.upgradeLevel(i, 1),
            }
            levelUp.increase = levelUp.newGainRate - nodeStat.production
            levelUp.roi = levelUp.cost / (250000*levelUp.increase)
            const ramUp = {
                type: "ram",
                nodeNum: i,
                cost: hn.getRamUpgradeCost(i, 1),
                newGainRate: ns.formulas.hacknetServers.hashGainRate(nodeStat.level, nodeStat.ramUsed, nodeStat.ram*2, nodeStat.cores, ns.getHacknetMultipliers().production),
                execute: () => hn.upgradeRam(i, 1),
            }
            ramUp.increase = ramUp.newGainRate - nodeStat.production
            ramUp.roi = ramUp.cost / (250000*ramUp.increase)
            const coreUp = {
                type: "core",
                nodeNum: i,
                cost: hn.getCoreUpgradeCost(i, 1),
                newGainRate: ns.formulas.hacknetServers.hashGainRate(nodeStat.level, nodeStat.ramUsed, nodeStat.ram, nodeStat.cores+1, ns.getHacknetMultipliers().production),
                execute: () => hn.upgradeCore(i, 1),
            }
            coreUp.increase = coreUp.newGainRate - nodeStat.production
            coreUp.roi = coreUp.cost / (250000*coreUp.increase)
            upgradeObjects.push(levelUp, ramUp, coreUp)
        }

        upgradeObjects.sort((a,b) => b.increase - a.increase)
        upgradeObjects = upgradeObjects.filter(o => budget * ns.getPlayer().money > o.cost)
        upgradeObjects = upgradeObjects.filter(o => roiLimit > o.roi)
        for (const upgrade of upgradeObjects) {
            if (upgrade.execute()) break;
        }


        for (let i = 0; i < hn.numNodes(); i++) {
            if (budget * ns.getPlayer().money > hn.getCacheUpgradeCost(i, 1) && hn.getNodeStats(i).cache < 8) {
                hn.upgradeCache(i, 1);
            }
        }

        if (ns.getPlayer().money > hn.getPurchaseNodeCost() && hn.numNodes() < hn.maxNumNodes()) {
            hn.purchaseNode();
        }

        await ns.asleep(0);
    }
}
