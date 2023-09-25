/** @param {import("..").NS} ns */
export async function main(ns) {
	function moneyGainedFromTask(m, t) {
		return ns.formulas.gang.moneyGain(ns.gang.getGangInformation(), ns.gang.getMemberInformation(m), ns.gang.getTaskStats(t))
	}
	function respectGainedFromTask(m, t) {
		return ns.formulas.gang.respectGain(ns.gang.getGangInformation(), ns.gang.getMemberInformation(m), ns.gang.getTaskStats(t))
	}
	function checkAscend(m) {
		return Math.max(-(Math.log(ns.gang.getMemberInformation(m).str_asc_mult) / Math.log(500)) + 2, 1.1)
	}

	ns.disableLog("ALL")
	ns.tail()
	if (!ns.gang.inGang()) {
		ns.gang.createGang("Slum Snakes")
		ns.tprint("Created a gang since you weren't before...")
	}
	let mode = "Money"
	let names = ["Soggy", "Arbie", "Flore", "Jorkell", "Steve", "Alex", "Jeff", "Bill", "Gabe", "Nadeko", "Kuni", "Longrats"]
	while (true) {
		ns.clearLog()
		let members = ns.gang.getMemberNames()
		let tasks = ns.gang.getTaskNames()
		ns.gang.setTerritoryWarfare(!Object.keys(ns.gang.getOtherGangInformation()).filter(h => h !== "Slum Snakes").some(h => ns.gang.getChanceToWinClash(h) < .55))
		members.forEach(function (m) {
			let intendedTask = ""
			if (ns.gang.getGangInformation().wantedPenalty < 0.95 && ns.gang.getGangInformation().wantedLevel >= 20 || mode == "Wanted") {
				intendedTask = "Vigilante Justice"
				mode = "Wanted"
			}
			if (ns.gang.getGangInformation().wantedLevel == 1 && mode == "Wanted") mode = "Money"
			if (mode == "Money") {
				if (ns.gang.getGangInformation().respect <= 125) {
					intendedTask = tasks.sort((a, b) => respectGainedFromTask(m, b) - respectGainedFromTask(m, a))[0]
				} else {
					intendedTask = tasks.sort((a, b) => moneyGainedFromTask(m, b) - moneyGainedFromTask(m, a))[0]
				}
			}
			if (ns.gang.getMemberInformation(m).str < 50) intendedTask = "Train Combat"
			ns.gang.setMemberTask(m, intendedTask)

			let eqs = ns.gang.getEquipmentNames()
			eqs.forEach(function (e) {
				if (ns.gang.getEquipmentCost(e) <= ns.getPlayer().money) {
					ns.gang.purchaseEquipment(m, e)
				}
			})
			if (ns.gang.getAscensionResult(m)) {
				if (ns.gang.getAscensionResult(m).str >= checkAscend(m)) {
					ns.gang.ascendMember(m)
				}
			}

			ns.print(ns.sprintf("%s -> %s", m, intendedTask))
		})
		if (ns.gang.canRecruitMember()) {
			let i = 0
			while (!ns.gang.recruitMember(names[i])) {
				i++
				if (i >= names.length) break
			}
		}
		await ns.asleep(0)
	}
}