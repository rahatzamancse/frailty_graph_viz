export function getOverviewData(apiUrl, id, callback) {
	fetch(apiUrl + '/overview/' + id)
		.then(response => response.json())
		.then(json => {
			callback(json);
		});
}

export function getInteraction(apiUrl, src, dst, bidirectional) {
	return fetch(apiUrl + '/interaction/' + src + '/' + dst + '/' + bidirectional)
		.then(response => response.json())
}

export function fetchEvidence(apiUrl, src, dst, bidirectional) {
	return fetch(apiUrl + '/evidence/' + src + '/' + dst + '/' + bidirectional)
		.then(response => response.json())
}

export function fetchNeighbots(apiUrl, id) {
	return fetch(apiUrl + '/neighbors/' + id)
		.then(response => response.json())
}

export function saveCoefficients(apiUrl, interaction, coefficients) {		

	// Build the payload to send
	const payload=
		{
			"query_str": interaction,
			"coefficients": Object.entries(coefficients).map( ([name, value]) => { return {name, value}})
		}

	fetch(apiUrl + '/record_weights/', {
		method: 'PUT',
		body:  JSON.stringify(payload),
		headers: {
			'Content-Type': 'application/json'
		  }
		});

}