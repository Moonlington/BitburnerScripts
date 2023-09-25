import { getServers, copyScripts, getRootAccess } from "./lib/utils";
/** @param {import(".").NS} ns */
function recursiveScan(ns, parent, server, target, route) {
    const children = ns.scan(server);
    for (let child of children) {
        if (parent === child) {
            continue;
        }
        if (child === target) {
            route.unshift(child);
            route.unshift(server);
            return true;
        }

        if (recursiveScan(ns, server, child, target, route)) {
            route.unshift(server);
            return true;
        }
    }
    return false;
}

/** @param {import(".").NS} ns */
export async function main(ns) {
    let target = ns.args[0];
    let route = [];
    getServers(ns, (server) => {
        getRootAccess(ns, server);
        copyScripts(ns, server, ["route.js", "lib/utils.js"], true);
        return ns.hasRootAccess(server);
    });
    recursiveScan(ns, "", ns.getServer().hostname, target, route);
    route.forEach(ns.singularity.connect);
}

export function autocomplete(data, args) {
    return data.servers;
}
