// Starlight Salvage — the upgrade cards offered between waves. Each one
// stacks (its level is tracked on the ship) and changes the run in a way
// the player can feel at once.

export const UPGRADE_POOL = [
  {
    id: 'twin',
    name: 'Twin Cannons',
    max: 1,
    desc: 'Fire two bolts side by side instead of one.',
    apply(ship) { ship.cannons = 2; },
  },
  {
    id: 'rapid',
    name: 'Rapid Loader',
    max: 3,
    desc: '+30% fire rate. Hold the trigger and shred rock.',
    apply(ship) { ship.fireRateBonus += 0.3; },
  },
  {
    id: 'heavy',
    name: 'Heavy Rounds',
    max: 3,
    desc: '+1 damage per bolt. Big rocks crack faster.',
    apply(ship) { ship.damageBonus += 1; },
  },
  {
    id: 'pierce',
    name: 'Piercing Rounds',
    max: 2,
    desc: 'Bolts punch through +1 extra rock or drone.',
    apply(ship) { ship.pierce += 1; },
  },
  {
    id: 'hull',
    name: 'Reinforced Hull',
    max: 4,
    desc: '+30 max hull and repair 30 right now.',
    apply(ship) {
      ship.maxHull += 30;
      ship.hull = Math.min(ship.maxHull, ship.hull + 30);
    },
  },
  {
    id: 'shield',
    name: 'Aegis Shield',
    max: 3,
    desc: '+25 regenerating shield. It soaks hits first.',
    apply(ship) {
      ship.maxShield += 25;
      ship.shield = Math.min(ship.maxShield, ship.shield + 25);
      ship.shieldRegen = Math.max(ship.shieldRegen, 4);
    },
  },
  {
    id: 'magnet',
    name: 'Magnet Array',
    max: 3,
    desc: '+60% salvage pickup radius. Shards fly to you.',
    apply(ship) { ship.magnetBonus += 0.6; },
  },
  {
    id: 'thrusters',
    name: 'Ion Thrusters',
    max: 3,
    desc: '+25% thrust and top speed. Outrun anything.',
    apply(ship) { ship.thrustBonus += 0.25; },
  },
  {
    id: 'salvage',
    name: 'Salvage Broker',
    max: 3,
    desc: '+25% score from every shard you collect.',
    apply(ship) { ship.shardBonus += 0.25; },
  },
  {
    id: 'combo',
    name: 'Combo Stabilizer',
    max: 2,
    desc: '+2s combo window and +2 max multiplier.',
    apply(ship) { ship.comboBonus += 1; },
  },
  {
    id: 'repair',
    name: 'Repair Drone',
    max: 2,
    desc: 'Slowly welds your hull back: +1.5 hull/s.',
    apply(ship) { ship.regen += 1.5; },
  },
];

/** Roll `count` distinct upgrades the ship has not maxed out. */
export function rollUpgrades(rng, ship, count = 3) {
  const available = UPGRADE_POOL.filter((u) => (ship.upgrades[u.id] ?? 0) < u.max);
  const picks = [];
  const pool = [...available];
  while (picks.length < count && pool.length > 0) {
    const i = Math.floor(rng.next() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}

/** Apply an upgrade card to the ship and bump its level. */
export function applyUpgrade(ship, upgrade) {
  ship.upgrades[upgrade.id] = (ship.upgrades[upgrade.id] ?? 0) + 1;
  upgrade.apply(ship);
}
