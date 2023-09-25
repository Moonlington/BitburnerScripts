/** @param {import("../.").NS} ns */
export async function main(ns) {
    const job = JSON.parse(ns.args[0]);
    let delay = job.end - job.time - Date.now();
    if (delay < 0) {
        ns.tprint(`WARN: Batch ${job.batch} ${job.type} was ${-delay}ms too late. (${job.end})\n`);
        ns.writePort(ns.pid, -delay);
        delay = 0;
    } else {
        ns.writePort(ns.pid, 0);
    }
    await ns.weaken(job.target, { additionalMsec: delay });
    const end = Date.now();
    ns.atExit(() => {
        if (job.report) ns.writePort(job.port, job.type + job.server);
        // ns.tprint(
        //     `Batch ${job.batch}: ${job.type} finished at ${end.toString().slice(-6)}/${Math.round(job.end)
        //         .toString()
        //         .slice(-6)}\n`
        // );
    });
}
