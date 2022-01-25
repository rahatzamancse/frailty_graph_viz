import SliderComponent from './SliderComponent';
import LatexFormula from './LatexFormula';
import { useState } from 'react';
import { Button } from 'react-bootstrap';
import  "./WeightPanel.css";


export default function WeightPanel({ sliderValues, setSliderValues, footer }){
	const [isExpanded, setExpanded] = useState(false);

	const chevron = isExpanded ? <i className="gg-chevron-double-up" /> : <i className="gg-chevron-double-down" />;

	function sliderStateUpdate(name, value){
		let newValues = {...sliderValues};
		newValues[name] = parseFloat(value);
		setSliderValues(newValues);
	}

	let elements;
	if(isExpanded)
		elements = (
			<>
				<LatexFormula coefficients={sliderValues} />
				<div>
					<SliderComponent label='Frequency' value={sliderValues.frequency} onChange={v => sliderStateUpdate('frequency', v)} />
					<SliderComponent label='Has significance' value={sliderValues.hasSignificance} onChange={v => sliderStateUpdate('hasSignificance', v)} />
					<SliderComponent label='Avg significance' value={sliderValues.avgSignificance} onChange={v => sliderStateUpdate('avgSignificance', v)} />
					<SliderComponent label='Avg impact factor' value={sliderValues.avgImpactFactor} onChange={v => sliderStateUpdate('avgImpactFactor', v)} />
					<SliderComponent label='Max impact factor' value={sliderValues.maxImpactFactor} onChange={v => sliderStateUpdate('maxImpactFactor', v)} />
					<SliderComponent label='1 - Avg p-value' value={sliderValues.pValue} onChange={v => sliderStateUpdate('pValue', v)} />
					
				</div>
				{
					(footer) && footer
				}
			</>
		);
	else
		elements = <></>;

	return (
		<div className='weight_panel'>
			<h2
				onClick={() => {
					setExpanded(!isExpanded)
				}}>
			Weighting<span className="chevron">{chevron}</span></h2>
			
			{elements}
			
		</div>
	)
}