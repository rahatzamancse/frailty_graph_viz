import MainGraph from "./components/blob_viz/MainGraph";
import React, {useEffect, useState} from "react";
import {Button, Col, Row} from "react-bootstrap";
import {saveCoefficients} from "./utils/api";
import WeightPanel from "./components/weight/WeightPanel";

export default function BlobViz({ apiUrl }) {
    const [weightCoefficients, setWeightCoefficients] = useState({
		frequency: 1,
		hasSignificance: 1,
		avgSignificance: 1,
		avgImpactFactor: 1,
		maxImpactFactor: 1,
		pValue: 1,
	});

	// Side effect to load the weight values from local storage
	useEffect(() => {
		const storedWeightValues = JSON.parse(localStorage.getItem('blobVizWeightValues'));
		if(storedWeightValues){
			setWeightCoefficients(storedWeightValues);
		}
	}, []); // Use this empty array to make sure the effect is only run once

    // TODO: Remove code duplication here and in NetworkViz and possibly overview
    // Define a function to update the weight values on the state AND save them to local storage
	function saveAndSetWeightValues(newWeightValues){
		localStorage.setItem('blobVizWeightValues', JSON.stringify(newWeightValues));
		setWeightCoefficients(newWeightValues);
	}

    return (
        <>
            <WeightPanel
				sliderValues={weightCoefficients}
				setSliderValues={saveAndSetWeightValues}
				// footer={
				// 	<Row>
				// 		<Col style={{textAlign: "center"}}>
				// 			<Button
				// 			 onClick={
				// 				 () => {
				//
				// 					saveCoefficients(apiUrl, window.location.search, weightCoefficients)
				// 				 }
				// 			 }>Record weights</Button>
				// 		</Col>
				// 	</Row>
				// }
			/>
            <MainGraph apiUrl={ apiUrl } />
        </>

    )
}

