const targetValue = 125;
const wantedPenThresh = 0.05

/** @param {import("..").NS} ns */
export async function main(ns) {
	const g = ns.gang
	const tick = { tw: false, otherGangsInfoPrevCycle: undefined, nextTick: undefined }
    function moneyGainedFromTask(m, t) {
        return ns.formulas.gang.moneyGain(
            g.getGangInformation(),
            g.getMemberInformation(m),
            g.getTaskStats(t)
        );
    }
    function respectGainedFromTask(m, t) {
        return ns.formulas.gang.respectGain(
            g.getGangInformation(),
            g.getMemberInformation(m),
            g.getTaskStats(t)
        );
    }
    function checkAscend(m) {
        return Math.max(-(Math.log(g.getMemberInformation(m).str_asc_mult) / Math.log(500)) + 2, 1.1);
    }

    ns.disableLog("ALL");
    if (!g.inGang()) {
        if (!g.createGang("Slum Snakes")) {
            ns.tprint("ERROR: Not in a gang and can't make one!")
            ns.exit()
        }
        ns.tprint("INFO: Created gang \"Slum Snakes\"");
    }
    let mode = "Respect";
    let names = [
        "Soggy",
        "Arbie",
        "Flore",
        "Jorkell",
        "Ryxxed",
        "Longrat",
        "Yami",
        "Xan",
        "Fluxxy",
        "Bel",
        "Milu",
        "Bob",
    ];
    while (true) {
        ns.clearLog();

        if (g.canRecruitMember()) {
            let i = 0;
            while (!g.recruitMember(names[i])) {
                i++;
                if (i >= names.length) break;
            }
        }

        for (const name of g.getMemberNames()) {
            const myGang = g.getGangInformation();

			if (g.getAscensionResult(name)) {
                if (g.getAscensionResult(name).str >= checkAscend(name)) {
                    g.ascendMember(name);
                }
            }

            const taskObjects = [],
                memberInfo = g.getMemberInformation(name),
                statCheck =
                    memberInfo.str < targetValue * memberInfo.str_asc_mult ||
                    memberInfo.def < targetValue * memberInfo.def_asc_mult ||
                    memberInfo.dex < targetValue * memberInfo.dex_asc_mult ||
                    memberInfo.agi < targetValue * memberInfo.agi_asc_mult;
			if (statCheck && 1 - myGang.wantedPenalty < wantedPenThresh) {
				g.setMemberTask(memberInfo.name, "Train Combat");
				continue;
			}

			for (const task of g.getTaskNames()) {
				const dontWant = ["Territory Warfare", "Vigilante Justice", "Train Hacking", "Train Charisma", "Ethical Hacking"]
				if (dontWant.includes(task)) continue;
				const taskStats = g.getTaskStats(task),
					wantGain = ns.formulas.gang.wantedLevelGain(myGang, memberInfo, taskStats),
					respGain = ns.formulas.gang.respectGain(myGang, memberInfo, taskStats),
					moneGain = ns.formulas.gang.moneyGain(myGang, memberInfo, taskStats);
				taskObjects.push({ name: task, wantGain, respGain, moneGain });
			}
			taskObjects.sort((a, b) => a.respGain < b.respGain ? 1 : -1);
			if (myGang.respect >= 2e6 && 1 - g.getGangInformation().wantedPenalty < wantedPenThresh)
				taskObjects.sort((a, b) => a.moneGain < b.moneGain ? 1 : -1);

			const canFight = myGang.territoryClashChance === 0 || memberInfo.def > 600
			if (g.getBonusTime() > 5000 && canFight && myGang.territory < 1) {
				g.setMemberTask(name, "Territory Warfare");
			} else {
				for (const x of taskObjects) {
					if (x.respGain < x.wantGain * 99) continue;
					g.setMemberTask(name, x.name);
					break;
				}
			}
            for (const e of g.getEquipmentNames()) {
                if (g.getEquipmentCost(e) <= ns.getPlayer().money) {
                    g.purchaseEquipment(name, e);
                }
            }
        }

		tickCheck();
        await ns.asleep(100);
    }

	function tickCheck() {
		// *** Territory warfaire *** credit: Sin from the Discord. I modified their detect tick method into a function to work with my script.
		// Detect new tick
		const myGang = g.getGangInformation(),
			otherGangsInfo = g.getOtherGangInformation(),
			members = g.getMemberNames();
		let newTick = false,
			allowClash = true
		for (let i = 0; i < Object.keys(otherGangsInfo).length; i++) {
			const gangName = Object.keys(otherGangsInfo)[i];
			if (gangName == myGang.faction) continue;

			if (g.getChanceToWinClash(gangName) < 0.55) allowClash = false;

			const gi = Object.values(otherGangsInfo)[i],
				ogi = tick.otherGangsInfoPrevCycle ? Object.values(tick.otherGangsInfoPrevCycle)[i] : gi;

			const powerChanged = gi.power != ogi.power,
				territoryChanged = gi.territory != ogi.territory,
				changed = powerChanged || territoryChanged;

			if (changed) newTick = true;
		}

		// If we're in a new tick, take note of when next one is going to happen
		if (newTick) {
			tick.nextTick = Date.now() + 19000;
		}

		// Assign members to territory warfare
		if (tick.nextTick != undefined && Date.now() + 500 > tick.nextTick) {
			for (const member of members) {
				if (allowClash && g.getMemberInformation(member).def < 600) {
					continue;
				}
				g.setMemberTask(member, 'Territory Warfare');
				tick.tw = true
			}
		} else { tick.tw = false }

		tick.otherGangsInfoPrevCycle = otherGangsInfo;
		g.setTerritoryWarfare(allowClash && myGang.territory < 1);
	}

}
