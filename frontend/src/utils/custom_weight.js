export default function customWeight(meta, coefficients) {

	const {
		frequency, hasSignificance, avgSignificance, avgImpactFactor, maxImpactFactor, pValue
	}  = coefficients

	let weight = (
		frequency * Math.log((meta['freq'] + 1)) +
		Math.pow('percentage_significance' in meta ? 2*meta['percentage_significance'] : 0., 2) * avgSignificance +
		('has_significance' in meta ? +meta['has_significance'] : 0.) * hasSignificance +
		meta.avg_impact * avgImpactFactor +
		Math.log(meta['max_impact'] + 1) *  maxImpactFactor +
		(1-meta['avg_pvalue']) * pValue
	);

	return weight;
}