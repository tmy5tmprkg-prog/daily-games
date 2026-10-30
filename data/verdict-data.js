import { hashDate, makePRNG, seededShuffle } from '../js/prng.js';

// Each fact: stmts[truthValue][phrasingIdx]
// truthValue 0 = first claim, 1 = opposite claim.
// Two phrasings per value prevent verbatim repetition across witnesses.
export const FACT_POOL = [
  { id: 'f00', stmts: [
    ['The café opened at 7 a.m.', 'Staff confirmed the café was already open by 7.'],
    ['The café did not open until 9 a.m.', 'The café was still closed when I checked at 8.'],
  ]},
  { id: 'f01', stmts: [
    ['The back door was locked all morning.', 'I tried the back door myself — it was locked.'],
    ['The back door was unlocked when staff arrived.', 'Anyone could have walked in through the back.'],
  ]},
  { id: 'f02', stmts: [
    ['It was raining heavily that morning.', 'The rain was coming down hard all morning.'],
    ['The morning was clear and dry.', 'There was no rain — the ground was completely dry.'],
  ]},
  { id: 'f03', stmts: [
    ['The security camera was working.', 'I checked the monitor — the camera feed was live.'],
    ['The security camera had been unplugged.', 'The camera was off; the screen showed nothing.'],
  ]},
  { id: 'f04', stmts: [
    ['The manager left the building by noon.', 'I saw the manager head out before lunch.'],
    ['The manager was in the building all afternoon.', 'The manager never left — I saw them at their desk all day.'],
  ]},
  { id: 'f05', stmts: [
    ['The safe was empty when it was found.', 'I opened the safe myself and found nothing inside.'],
    ['The safe still contained cash when it was found.', 'The money was still in the safe when we checked.'],
  ]},
  { id: 'f06', stmts: [
    ['Only one key to the storeroom exists.', 'There is a single key — I know because I hold it.'],
    ['Duplicate keys to the storeroom had been made.', 'I know at least two copies of the storeroom key exist.'],
  ]},
  { id: 'f07', stmts: [
    ['The alarm was triggered at 2:14 p.m.', 'The alarm went off just after 2 in the afternoon.'],
    ['No alarm went off that day.', 'The alarm system was silent the entire day.'],
  ]},
  { id: 'f08', stmts: [
    ['A window on the east side was broken.', 'I noticed shattered glass near the east-facing window.'],
    ['All windows were intact throughout the day.', 'I walked the perimeter — every window was unbroken.'],
  ]},
  { id: 'f09', stmts: [
    ['The delivery van arrived before lunch.', 'The van was already unloaded by the time I had lunch.'],
    ['The delivery van did not arrive until after 3 p.m.', 'We were still waiting for the delivery at 3 o\'clock.'],
  ]},
  { id: 'f10', stmts: [
    ['Two staff members called in sick that day.', 'We were short-handed — two people did not show up.'],
    ['All staff reported for their shifts.', 'Everyone was in — no absences that day.'],
  ]},
  { id: 'f11', stmts: [
    ['The corridor lights were on all night.', 'The hallway was fully lit when I passed through after midnight.'],
    ['The corridor lights were off after midnight.', 'The hallway went dark — lights were out by midnight.'],
  ]},
  { id: 'f12', stmts: [
    ['Fingerprints were found on the counter.', 'The investigator lifted prints right off the counter surface.'],
    ['No fingerprints were found on the counter.', 'The counter was clean — no prints recovered at all.'],
  ]},
  { id: 'f13', stmts: [
    ['The vault was last accessed at 10 a.m.', 'The access log shows the vault opened at 10 in the morning.'],
    ['The vault was last accessed at 4 p.m.', 'According to the log, the vault was opened at 4 in the afternoon.'],
  ]},
  { id: 'f14', stmts: [
    ['A stranger was seen near the loading bay.', 'Someone I did not recognise was loitering by the loading bay.'],
    ['No unfamiliar person was seen on the premises.', 'Everyone present was known to me — no strangers.'],
  ]},
  { id: 'f15', stmts: [
    ['The phone lines were cut.', 'I tried to call out but the line was dead — cut clean.'],
    ['The phone lines were intact the entire time.', 'The phones worked fine all day — no interruption.'],
  ]},
  { id: 'f16', stmts: [
    ['Staff were asked to stay late that evening.', 'Management told us to stay past closing — it was mandatory.'],
    ['Everyone left at their regular time.', 'We all clocked out at the usual hour, no overtime.'],
  ]},
  { id: 'f17', stmts: [
    ['The inventory log showed items missing.', 'When I reviewed the log, several items were unaccounted for.'],
    ['The inventory was fully accounted for.', 'I checked the log myself — everything was there.'],
  ]},
  { id: 'f18', stmts: [
    ['A note was left on the reception desk.', 'There was a handwritten note sitting on the front desk.'],
    ['No note or message was left at reception.', 'The reception desk was clear — nothing left behind.'],
  ]},
  { id: 'f19', stmts: [
    ['The car park was closed for maintenance.', 'The car park was blocked off — maintenance signs were up.'],
    ['The car park was open and in use all day.', 'I parked there myself; it was open as usual.'],
  ]},
];

export const WITNESS_NAMES = [
  'Alex', 'Blair', 'Casey', 'Dana', 'Emery', 'Finley', 'Gray', 'Harper',
  'Indigo', 'Jordan', 'Kendall', 'Lane', 'Morgan', 'Nico', 'Parker', 'Quinn',
];

export const SCENARIOS = [
  { title: 'The Missing Deposit', intro: 'A cash deposit vanished from the office overnight. Four witnesses were questioned the next morning.' },
  { title: 'The Warehouse Breach', intro: 'Someone accessed a restricted warehouse after hours. Four employees gave their accounts to the investigator.' },
  { title: 'The Tampered Files', intro: 'Confidential records were altered before the audit. The inquiry team interviewed four staff members.' },
  { title: 'The Stolen Keycard', intro: 'A master keycard went missing during the morning shift. Four colleagues provided their recollections.' },
  { title: 'The Silent Alarm', intro: 'The security system failed to trigger during an incident. Four on-duty staff were interviewed separately.' },
  { title: 'The Unlocked Vault', intro: 'The vault was found open with no record of entry. Four individuals present that day gave statements.' },
  { title: 'The Removed Evidence', intro: 'Critical evidence disappeared before the investigation began. Four witnesses described what they saw.' },
  { title: 'The After-Hours Visitor', intro: 'Someone was in the building long after closing time. Four staff members shared what they noticed.' },
];

// ── Witness-fact layout ───────────────────────────────────────────────────────
//
// 3 facts sampled per puzzle:
//   f0 appears in W0 (s0), W1 (s2), W3 (s6)  — 3 times
//   f1 appears in W0 (s1), W2 (s4), W3 (s7)  — 3 times
//   f2 appears in W1 (s3), W2 (s5)            — 2 times
//
// The solution is always one lie about f0 + one lie about f1 from different
// witnesses. With both lie-facts appearing 3 times, uniqueness is guaranteed:
// any wrong pair keeps at least one lie trusted alongside a contradicting truth.

const PATTERN = [[0, 1], [0, 2], [1, 2], [0, 1]]; // PATTERN[witness][slot] → factIdx

// f0 statement positions: 0(W0), 2(W1), 6(W3)
const F0_STMTS = [0, 2, 6];
// f1 statement positions: 1(W0), 4(W2), 7(W3)
const F1_STMTS = [1, 4, 7];

// All 7 valid [f0-lie-idx, f1-lie-idx] solution pairs (different witnesses).
const VALID_SOLUTIONS = [
  [0, 4], [0, 7],           // lie at W0-f0, lie at W2-f1 or W3-f1
  [2, 1], [2, 4], [2, 7],   // lie at W1-f0
  [6, 1], [6, 4],            // lie at W3-f0, lie at W0-f1 or W2-f1
];

// ── Consistency check ─────────────────────────────────────────────────────────

export function isConsistent(stmts, lieA, lieB) {
  const beliefs = new Map(); // factId → assertsIdx
  for (let k = 0; k < stmts.length; k++) {
    if (k === lieA || k === lieB) continue;
    const { factId, assertsIdx } = stmts[k];
    if (beliefs.has(factId) && beliefs.get(factId) !== assertsIdx) return false;
    beliefs.set(factId, assertsIdx);
  }
  return true;
}

// ── Violation message ─────────────────────────────────────────────────────────

export function getViolationMessage(stmts, lieA, lieB) {
  const beliefs = new Map(); // factId → { assertsIdx, text }
  for (let k = 0; k < stmts.length; k++) {
    if (k === lieA || k === lieB) continue;
    const { factId, assertsIdx, text } = stmts[k];
    if (beliefs.has(factId)) {
      const prior = beliefs.get(factId);
      if (prior.assertsIdx !== assertsIdx) {
        return `Contradiction: "${prior.text}" and "${text}" can't both be true.`;
      }
    } else {
      beliefs.set(factId, { assertsIdx, text });
    }
  }
  return 'Those statements are not the lies. Keep looking.';
}

// ── Puzzle generation ─────────────────────────────────────────────────────────

export function generateVerdictPuzzle(seedStr) {
  const rng = makePRNG(hashDate(seedStr));

  // Pick 3 facts and 4 witness names
  const facts = seededShuffle([...FACT_POOL], rng).slice(0, 3);
  const names = seededShuffle([...WITNESS_NAMES], rng).slice(0, 4);
  const scenario = seededShuffle([...SCENARIOS], rng)[0];

  // Truth value for each fact: 0 or 1
  const worldTruth = facts.map(() => (rng() < 0.5 ? 0 : 1));

  // Pick solution: one of the 7 valid [f0-stmt-idx, f1-stmt-idx] pairs
  const [sA, sB] = VALID_SOLUTIONS[Math.floor(rng() * VALID_SOLUTIONS.length)];

  // Which f0/f1 positions are truths (the non-solution ones)?
  const f0Truths = F0_STMTS.filter(i => i !== sA); // 2 elements
  const f1Truths = F1_STMTS.filter(i => i !== sB); // 2 elements

  // Build all 8 statement slots.
  // Each slot gets: factId, assertsIdx, text, witnessIdx.
  const allStmts = Array(8);

  // Helper: assign a statement to slot k
  function assign(k, factIdx, assertsIdx, phrasingIdx) {
    const fact = facts[factIdx];
    allStmts[k] = {
      factId: fact.id,
      assertsIdx,
      text: fact.stmts[assertsIdx][phrasingIdx],
      witnessIdx: Math.floor(k / 2),
    };
  }

  // f0 truths: use phrasings [0, 1] alternately
  f0Truths.forEach((k, i) => assign(k, 0, worldTruth[0], i % 2));
  // f0 lie
  assign(sA, 0, 1 - worldTruth[0], 0);

  // f1 truths
  f1Truths.forEach((k, i) => assign(k, 1, worldTruth[1], i % 2));
  // f1 lie
  assign(sB, 1, 1 - worldTruth[1], 0);

  // f2 truths: positions 3(W1) and 5(W2), phrasings [0, 1]
  assign(3, 2, worldTruth[2], 0);
  assign(5, 2, worldTruth[2], 1);

  // Build witness objects (each witness = consecutive pair of slots)
  const witnesses = Array.from({ length: 4 }, (_, w) => ({
    name: names[w],
    statements: [
      { id: `w${w}s0`, stmtIdx: w * 2,     text: allStmts[w * 2].text,     factId: allStmts[w * 2].factId },
      { id: `w${w}s1`, stmtIdx: w * 2 + 1, text: allStmts[w * 2 + 1].text, factId: allStmts[w * 2 + 1].factId },
    ],
  }));

  return {
    puzzleDate: seedStr,
    scenario,
    witnesses,
    solution: [sA, sB],
    allStmts,
  };
}
