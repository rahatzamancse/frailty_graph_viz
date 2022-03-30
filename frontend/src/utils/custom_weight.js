export default function customWeight(meta, coefficients) {

	const {
		frequency, hasSignificance, avgImpactFactor, maxImpactFactor, pValue
	}  = coefficients

	return (
		frequency * Math.log((meta['freq'] + 1)) +
		('has_significance' in meta ? +meta['has_significance'] : 0.) * hasSignificance +
		meta['avg_impact'] * avgImpactFactor +
		Math.log(meta['max_impact'] + 1) * maxImpactFactor +
		(1 - meta['avg_pvalue']) * pValue
	);
}