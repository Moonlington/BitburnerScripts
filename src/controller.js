import { getServers, copyScripts, checkTarget, isPrepped, prep, getRootAccess } from "lib/utils.js";

const TYPES = ["hack", "weaken1", "grow", "weaken2"];
const WORKERS = ["tHack.js", "tWeaken.js", "tGrow.js"];
const SCRIPTS = { hack: "tHack.js", weaken1: "tWeaken.js", grow: "tGrow.js", weaken2: "tWeaken.js" };
const OFFSETS = { hack: 0, weaken1: 1, grow: 2, weaken2: 3 };
const COSTS = { hack: 1.7, weaken1: 1.75, grow: 1.75, weaken2: 1.75 };
const OVERESTIMATE_G = 1.01

/** @param {import("../.").NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.tail();

    const triedServers = []
    while (true) {
        const dataPort = ns.getPortHandle(ns.pid);
        dataPort.clear();
        
        let target = "n00dles";
        
        const servers = getServers(ns, (server) => {
            getRootAccess(ns, server);
            if (!triedServers.includes(server)) target = checkTarget(ns, server, target, ns.fileExists("Formulas.exe", "home"));
            copyScripts(ns, server, WORKERS, true);
            return ns.hasRootAccess(server);
        });
        
        const ramNet = new RamNet(ns, servers);
        const metrics = new Metrics(ns, target);
        
        if (!isPrepped(ns, target)) await prep(ns, metrics, ramNet);
        // if (!(await optimizeShotgun(ns, metrics, ramNet))) {
        //     triedServers.push(target);
        //     continue
        // }
        await optimizeShotgun(ns, metrics, ramNet)
        metrics.calculate(ns);

        const jobs = [];
        let batchCount = 0;

        metrics.end = Date.now() + metrics.wTime - metrics.spacer;

		// Instead of one batch, we repeat the scheduling based on the depth calculated by the optimizer.
		while (batchCount++ < metrics.depth) {
			for (const type of TYPES) {
				// As you can see, calculating the end time for each new job is much simpler this way.
				// The rest of the scheduling is mostly unchanged.
				metrics.end += metrics.spacer;

				// Batchcount is part of the constructor now. Yes I was that lazy in the last part.
				const job = new Job(type, metrics, batchCount);
				if (!ramNet.assign(job)) {
					ns.print(`ERROR: Unable to assign ${type}. Dumping debug info:`);
					ns.print(job);
					ns.print(metrics);
					ramNet.printBlocks(ns);
					return;
				}
				jobs.push(job);
			}
		}

        for (const job of jobs) {
			job.end += metrics.delay;
			const jobPid = ns.exec(SCRIPTS[job.type], job.server, { threads: job.threads, temporary: true }, JSON.stringify(job));
			if (!jobPid) throw new Error(`Unable to deploy ${job.type}`);

			const tPort = ns.getPortHandle(jobPid)
			await tPort.nextWrite();
			metrics.delay += tPort.read();
        }

        jobs.reverse();

		const timer = setInterval(() => {
			ns.clearLog();
			ns.print(`Hacking ~$${ns.formatNumber(metrics.maxMoney * metrics.greed * batchCount * metrics.chance)} from ${metrics.target}`);
			ns.print(`Greed: ${Math.floor(metrics.greed * 1000) / 10}%`);
			ns.print(`Ram available: ${ns.formatRam(ramNet.totalRam)}/${ns.formatRam(ramNet.maxRam)}`);
			ns.print(`Total delay: ${metrics.delay}ms`);
			ns.print(`Active jobs remaining: ${jobs.length}`);
			ns.print(`ETA ${ns.tFormat(metrics.end - Date.now())}`);
		}, 1000);
		ns.atExit(() => {
			clearInterval(timer);
		});

		do {
			await dataPort.nextWrite();
			dataPort.clear();

			// It's technically possible that some of these might finish out of order due to lag or something.
			// But it doesn't actually matter since we're not doing anything with this data yet.
			ramNet.finish(jobs.pop());
		} while (jobs.length > 0);
		clearInterval(timer);
    }
}

// First a job. Essentially, this is just a big pile of information about one H/G/W task that we intend to run.
class Job {
	constructor(type, metrics, batch) {
		this.type = type;
		// this.end = metrics.ends[type];
        this.end = metrics.end;
		this.time = metrics.times[type];
		this.target = metrics.target;
		this.threads = metrics.threads[type];
		this.cost = this.threads * COSTS[type];
		this.server = "none";
		this.report = true
		this.port = metrics.port;
		this.batch = batch;
	}
}

/** @param {import("../../.").NS} ns */
export class Metrics {
	constructor(ns, server) {
		this.target = server;
		this.maxMoney = ns.getServerMaxMoney(server);
		this.money = Math.max(ns.getServerMoneyAvailable(server), 1);
		this.minSec = ns.getServerMinSecurityLevel(server);
		this.sec = ns.getServerSecurityLevel(server);
		this.prepped = isPrepped(ns, server);
		this.chance = 0;
		this.wTime = 0;
		this.delay = 0; // The cumulative delays caused by late jobs.
		this.spacer = 5;
		this.greed = 0.1;
		this.depth = 0; // Still not using this.

		this.times = { hack: 0, weaken1: 0, grow: 0, weaken2: 0 };
        this.end = 0;
		// this.ends = { hack: 0, weaken1: 0, grow: 0, weaken2: 0 };
		this.threads = { hack: 0, weaken1: 0, grow: 0, weaken2: 0 };

		this.port = ns.pid;
	}

    // This function calculates the current metrics of the server. For now, we only run it once, but later
    // we can use it any time we expect the environment to change, such as after a level up, or if we switch targets.
    /** @param {import("../../.").NS} ns */
    calculate(ns, greed = this.greed) {
        const server = this.target;
        const maxMoney = this.maxMoney;
        this.money = ns.getServerMoneyAvailable(server);
        this.sec = ns.getServerSecurityLevel(server);
        this.wTime = ns.getWeakenTime(server);
        this.times.weaken1 = this.wTime;
        this.times.weaken2 = this.wTime;
        this.times.hack = this.wTime / 4;
        this.times.grow = this.wTime * 0.8;
        // this.depth = (this.wTime / this.spacer) * 4;

        const hPercent = ns.hackAnalyze(server);
        const amount = maxMoney * greed;
        const hThreads = Math.max(Math.floor(ns.hackAnalyzeThreads(server, amount)), 1);
        const tGreed = hPercent * hThreads;
        const gThreads = Math.ceil(ns.growthAnalyze(server, maxMoney / (maxMoney - maxMoney * tGreed))*OVERESTIMATE_G);
        this.threads.weaken1 = Math.max(Math.ceil((hThreads * 0.002) / 0.05), 1);
        this.threads.weaken2 = Math.max(Math.ceil((gThreads * 0.004) / 0.05), 1);
        this.threads.hack = hThreads;
        this.threads.grow = gThreads;
        this.chance = ns.hackAnalyzeChance(server);
    }
}

export class RamNet {
    // These fields are all private. It's easy to mess things up when handling the ram allocation, so we want to
    // limit the interaction with the class's data only to designated functions of the class itself.
    #blocks = []; // A list of every server and how much ram it has available.
    #minBlockSize = Infinity; // The size of the smallest block on the network (spoilers, it usually 4).
    #maxBlockSize = 0; // The size of the largest block on the network.
    #totalRam = 0; // The total ram available on the network.
    #maxRam = 0; // The maximum ram that the network can support.
    #prepThreads = 0; // Used for the prep function
    #index = new Map(); // An index for accessing memory blocks by server. More on this later.

    // We feed the RamNet a list of servers to turn into useful data.
    /** @param {import("../.").NS} ns */
    constructor(ns, servers) {
        for (const server of servers) {
            if (!ns.hasRootAccess(server)) continue;

            const maxRam = ns.getServerMaxRam(server);
            const ram = maxRam - ns.getServerUsedRam(server);
            if (ram <= 1.6) continue; // Make sure there's enough ram on the server to run at least one script.

            // A block is just a server hostname, and the amount of available ram on it.
            // However, it's very easy to extend the functionality by adding new values as needed.
            const block = { server: server, ram: ram };
            this.#blocks.push(block);
            if (ram < this.#minBlockSize) this.#minBlockSize = ram;
            if (ram > this.#maxBlockSize) this.#maxBlockSize = ram;
            this.#totalRam += ram;
            this.#maxRam += maxRam;
            this.#prepThreads += Math.floor(ram / 1.75);
        }
        // We have our own special sorting function, coming up in a moment.
        this.#sort();

        // Here we make our index map by matching server names to their corresponding index in the blocks array.
        // This will let us look up specific blocks with another function later.
        this.#blocks.forEach((block, index) => this.#index.set(block.server, index));
    }

    // Custom sort algorithm. You can play around with this to make your own system of prioritization.
    // For now, I just go smallest to largest, with home last.
    #sort() {
        this.#blocks.sort((x, y) => {
            // Prefer assigning to home last so that we have more room to play the game while batching.
            if (x.server === "home") return 1;
            if (y.server === "home") return -1;

            return x.ram - y.ram;
        });
    }

    // Here's that function for looking up a memory block by server name.
    getBlock(server) {
        if (this.#index.has(server)) {
            return this.#blocks[this.#index.get(server)];
        } else {
            throw new Error(`Server ${server} not found in RamNet.`);
        }
    }

    /*
	Getter functions for our private fields. This might seem redundant, but we don't want to expose the data
	to being overwritten unintentionally.
	*/
    get totalRam() {
        return this.#totalRam;
    }

    get maxRam() {
        return this.#maxRam;
    }

    get maxBlockSize() {
        return this.#maxBlockSize;
    }

    get prepThreads() {
        return this.#prepThreads;
    }

    // When assigning a job, we find a block that can fit it and set its server to that block.
    // Then we reduce the available ram to reserve it for that job.
    assign(job) {
        const block = this.#blocks.find((block) => block.ram >= job.cost);
        if (block) {
            job.server = block.server;
            block.ram -= job.cost;
            this.#totalRam -= job.cost;
            return true;
        } else return false; // Return false if we don't find one.
    }

    // When a job finishes, we can use the index lookup, since it's much faster.
    // We don't actually use this yet, but it will come in handy later.
    finish(job) {
        const block = this.getBlock(job.server);
        block.ram += job.cost;
        this.#totalRam += job.cost;
    }

    // This gets us make a copy of the blocks so that we can calculate without changing any data.
    cloneBlocks() {
        return this.#blocks.map((block) => ({ ...block }));
    }

    // This is just a debugging tool
    /** @param {import("../.").NS} ns */
    printBlocks(ns) {
        for (const block of this.#blocks) ns.print(block);
    }

    // This function takes an array of job costs and simulates assigning them to see how many batches it can fit.
	testThreads(threadCosts) {
		// Clone the blocks, since we don't want to actually change the ramnet.
		const pRam = this.cloneBlocks();
		let batches = 0;
		let found = true;
		while (found) {
			// Pretty much just a copy of assign(). Repeat until a batch fails to assign all it's jobs.
			for (const cost of threadCosts) {
				found = false;
				const block = pRam.find(block => block.ram >= cost);
				if (block) {
					block.ram -= cost;
					found = true;
				} else break;
			}
			if (found) batches++; // If all of the jobs were assigned successfully, +1 batch and loop.
		}
		return batches; // Otherwise, we've found our number.
	}
}

/**
 * @param {import("../.").NS} ns
 * @param {Metrics} metrics
 * @param {RamNet} ramNet
 */
function optimizeBatch(ns, metrics, ramNet) {
    const maxThreads = ramNet.maxBlockSize / 1.75;
    const maxMoney = metrics.maxMoney;
    const hPercent = ns.hackAnalyze(metrics.target);

    const minGreed = 0.001;
    const stepValue = 0.01;
    let greed = 0.99;
    while (greed > minGreed) {
        const amount = maxMoney * greed;
        const hThreads = Math.max(Math.floor(ns.hackAnalyzeThreads(metrics.target, amount)), 1);
        const tGreed = hPercent * hThreads;
        const gThreads = Math.ceil(ns.growthAnalyze(metrics.target, maxMoney / (maxMoney - maxMoney * tGreed)));

        if (Math.max(hThreads, gThreads) <= maxThreads) {
            const wThreads1 = Math.max(Math.ceil((hThreads * 0.002) / 0.05), 1);
            const wThreads2 = Math.max(Math.ceil((gThreads * 0.004) / 0.05), 1);

            const threadCosts = [hThreads * 1.7, wThreads1 * 1.75, gThreads * 1.75, wThreads2 * 1.75];

            const pRam = ramNet.cloneBlocks();
            let found;
            for (const cost of threadCosts) {
                found = false;
                for (const block of pRam) {
                    if (block.ram < cost) continue;
                    found = true;
                    block.ram -= cost;
                    break;
                }
                if (found) continue;
                break;
            }
            if (found) {
                metrics.greed = greed;
                metrics.threads = { hack: hThreads, weaken1: wThreads1, grow: gThreads, weaken2: wThreads2 };
                return true;
            }
        }
        greed -= stepValue;
    }
    return false;
    // throw new Error("Not enough ram to run even a single batch. Something has gone seriously wrong.");
}


/**
 * @param {import("../.").NS} ns
 * @param {Metrics} metrics
 * @param {RamNet} ramNet
 */
async function optimizeShotgun(ns, metrics, ramNet) {
    const maxThreads = ramNet.maxBlockSize / 1.75;
    const maxMoney = metrics.maxMoney;
    const hPercent = ns.hackAnalyze(metrics.target);
    const wTime = ns.getWeakenTime(metrics.target);

    const minGreed = 0.001;
    const stepValue = 0.01;
    let greed = 0.99;
    let best = 0;

    while (greed > minGreed) {
        const amount = maxMoney * greed;
        const hThreads = Math.max(Math.floor(ns.hackAnalyzeThreads(metrics.target, amount)), 1);
        const tGreed = hPercent * hThreads;
        const gThreads = Math.ceil(ns.growthAnalyze(metrics.target, maxMoney / (maxMoney - maxMoney * tGreed))*OVERESTIMATE_G);

        if (Math.max(hThreads, gThreads) <= maxThreads) {
            const wThreads1 = Math.max(Math.ceil((hThreads * 0.002) / 0.05), 1);
            const wThreads2 = Math.max(Math.ceil((gThreads * 0.004) / 0.05), 1);

            const threadCosts = [hThreads * 1.7, wThreads1 * 1.75, gThreads * 1.75, wThreads2 * 1.75];

            const batchCount = ramNet.testThreads(threadCosts)
            const income = tGreed*maxMoney*batchCount/(metrics.spacer*4*batchCount+wTime)
            if (income > best) {
                best = income
                metrics.greed = tGreed
                metrics.depth = batchCount
            }
        }
        await ns.sleep(0)
        greed -= stepValue;
    }
    if (best === 0) return false;
    // throw new Error("Not enough ram to run even a single batch. Something has gone seriously wrong.");
}
