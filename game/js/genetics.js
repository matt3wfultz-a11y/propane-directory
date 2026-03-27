// genetics.js — Mendelian genetics engine

'use strict';

const MUTATION_RATE = 0.04;
const HIDDEN_MUTATION_RATE = 0.07;

/**
 * Express a genotype into a phenotype.
 * An allele pair is dominant if at least one 'D' is present.
 */
function expressGenotype(genotype) {
  const phenotype = {};
  for (const locus of ALL_LOCI) {
    const pair = genotype[locus] || ['R', 'R'];
    phenotype[locus] = pair.includes('D') ? 'dominant' : 'recessive';
  }
  return phenotype;
}

/**
 * Returns true if locus is heterozygous (one D, one R).
 */
function isHeterozygous(genotype, locus) {
  const pair = genotype[locus] || ['R', 'R'];
  return pair[0] !== pair[1];
}

/**
 * Compute stats for a monster given species, level, and genotype.
 * Formula: finalStat = round((speciesMidpoint + locusSum) * (1 + (level-1) * 0.04))
 */
function computeStats(speciesId, level, genotype) {
  const sp = SPECIES[speciesId];
  const phenotype = expressGenotype(genotype);

  let bonuses = { hp: 0, atk: 0, def: 0, spd: 0 };

  for (const locus of ALL_LOCI) {
    const trait = LOCUS_TRAITS[locus];
    const expr = phenotype[locus];
    bonuses[trait.stat] += expr === 'dominant' ? trait.domBonus : trait.recBonus;
  }

  const scale = 1 + (level - 1) * 0.04;

  function midpoint(range) {
    return (range.min + range.max) / 2;
  }

  return {
    maxHp: Math.max(1, Math.round((midpoint(sp.baseStats.hp)  + bonuses.hp)  * scale)),
    atk:   Math.max(1, Math.round((midpoint(sp.baseStats.atk) + bonuses.atk) * scale)),
    def:   Math.max(1, Math.round((midpoint(sp.baseStats.def) + bonuses.def) * scale)),
    spd:   Math.max(1, Math.round((midpoint(sp.baseStats.spd) + bonuses.spd) * scale)),
  };
}

/**
 * Generate a random wild genotype for a species based on its wildAlleleWeights.
 * Each locus weight is the probability of dominant allele for each independent allele.
 */
function randomWildGenotype(speciesId) {
  const sp = SPECIES[speciesId];
  const genotype = {};
  for (const locus of ALL_LOCI) {
    const pDom = sp.wildAlleleWeights[locus] || 0.5;
    const allele1 = Math.random() < pDom ? 'D' : 'R';
    const allele2 = Math.random() < pDom ? 'D' : 'R';
    genotype[locus] = [allele1, allele2];
  }
  return genotype;
}

/**
 * Mendelian crossover: for each locus, pick one random allele from each parent.
 */
function breedGenotypes(parentA, parentB) {
  const offspring = {};
  for (const locus of ALL_LOCI) {
    const pairA = parentA.genotype[locus] || ['R', 'R'];
    const pairB = parentB.genotype[locus] || ['R', 'R'];
    const alleleFromA = pairA[Math.floor(Math.random() * 2)];
    const alleleFromB = pairB[Math.floor(Math.random() * 2)];
    offspring[locus] = [alleleFromA, alleleFromB];
  }
  return offspring;
}

/**
 * Apply random mutations to a genotype.
 * Returns { genotype, mutations: string[] } where mutations lists which loci flipped.
 */
function applyMutations(genotype, mutationRate) {
  mutationRate = mutationRate !== undefined ? mutationRate : MUTATION_RATE;
  const result = deepClone(genotype);
  const mutations = [];
  for (const locus of ALL_LOCI) {
    const rate = HIDDEN_LOCI.includes(locus) ? HIDDEN_MUTATION_RATE : mutationRate;
    for (let i = 0; i < 2; i++) {
      if (Math.random() < rate) {
        result[locus][i] = result[locus][i] === 'D' ? 'R' : 'D';
        if (!mutations.includes(locus)) mutations.push(locus);
      }
    }
  }
  return { genotype: result, mutations };
}

/**
 * Full breeding pipeline: takes two parent monster objects, returns new offspring.
 */
function breedMonsters(parentA, parentB) {
  const rawGenotype = breedGenotypes(parentA, parentB);
  const { genotype, mutations } = applyMutations(rawGenotype);
  const offspring = createMonster(parentA.speciesId, 1, genotype);
  offspring.parents = [parentA.uid, parentB.uid];
  offspring.generation = Math.max(parentA.generation, parentB.generation) + 1;
  offspring._mutatedLoci = mutations; // temp flag for UI display
  return { offspring, mutations };
}

/**
 * Compute a "genetic score" 0–7: number of dominant loci expressed.
 * Useful for unlock conditions.
 */
function countDominantLoci(monster) {
  const phenotype = expressGenotype(monster.genotype);
  return ALL_LOCI.filter(l => phenotype[l] === 'dominant').length;
}

/**
 * Build Punnett square probabilities for each visible locus given two parents.
 * Returns { A: { DD: 0.25, DR: 0.50, RR: 0.25 }, ... }
 */
function punnettProbabilities(parentA, parentB) {
  const result = {};
  for (const locus of VISIBLE_LOCI) {
    const pA = parentA.genotype[locus] || ['R', 'R'];
    const pB = parentB.genotype[locus] || ['R', 'R'];
    const combos = { DD: 0, DR: 0, RR: 0 };
    for (const a of pA) {
      for (const b of pB) {
        if (a === 'D' && b === 'D') combos.DD += 0.25;
        else if (a === 'R' && b === 'R') combos.RR += 0.25;
        else combos.DR += 0.25;
      }
    }
    // Probability of expressing dominant phenotype = DD + DR
    result[locus] = {
      pDominant: combos.DD + combos.DR,
      pRecessive: combos.RR,
      combos,
    };
  }
  return result;
}
