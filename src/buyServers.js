/** @param {import("..").NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    
    var ram = 32;
    const hostnamePrefix = "pserv-";
    let serverLimit = ns.getPurchasedServerLimit();
    let serverMaxRam = ns.getPurchasedServerMaxRam();

    while (true) {
        if (ram >= serverMaxRam) break;
        var serverNumber = 0;
        while (serverNumber < serverLimit) {
            ns.clearLog();
            var serverName = hostnamePrefix + serverNumber;
            if (!ns.serverExists(serverName)) {
                if (ns.getServerMoneyAvailable("home") >= ns.getPurchasedServerCost(ram)) {
                    ns.purchaseServer(serverName, ram);
                    ns.print(`Purchased server "${serverName}" with ${ns.formatRam(ram)}`);
                    serverNumber++;
                    continue;
                }

                ns.print(
                    `Unable to purchase server "${serverName}" require: $${ns.formatNumber(
                        ns.getPurchasedServerCost(ram)
                    )}`
                );
                await ns.sleep(1000);
                continue;
            }

            if (ns.getServerMoneyAvailable("home") >= ns.getPurchasedServerUpgradeCost(serverName, ram)) {
                if (ns.getServerMaxRam(serverName) < ram) {
                    if (ns.ps(serverName).length !== 0) {
                        ns.print(
                            `Unable to upgrade server "${serverName}" to ${ns.formatRam(ram)}, scripts running on the server`
                        );
                        await ns.sleep(0)
                        continue;
                    }
                    ns.upgradePurchasedServer(serverName, ram);
                    ns.print(`Upgraded ram on server "${serverName}" to ${ns.formatRam(ram)}`);
                }
                serverNumber++;
                continue;
            }

            ns.print(
                `Unable to upgrade server "${serverName}" require: $${ns.formatNumber(
                    ns.getPurchasedServerUpgradeCost(serverName, ram)
                )}`
            );
            await ns.sleep(1000);
        }
        ram = 2 * ram
    }
    ns.tprint("SUCCESS: Maxed out servers!")
}
