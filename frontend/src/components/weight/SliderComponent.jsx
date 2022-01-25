import RangeSlider from 'react-bootstrap-range-slider';
import { Form, Row, Col } from 'react-bootstrap';

export default function SliderComponent({label, value, max, granularity, onChange}) {

	if(!max)
		max = 10;

	if(!granularity)
		granularity = .1;

	return (
		<Form>
			<Form.Group as={Row}>
				<Col>
					<Form.Label>{label}:</Form.Label>
				</Col>
				<Col xs={9}>
					<RangeSlider 
						value={value}
						min={1}
						max={max}
						step={granularity}
						tooltip='off'
						onChange={e => {
							if(onChange)
								onChange(e.target.value);
							}}
					/>
				</Col>
				<Col xs={1}>
					<Form.Control type="number" value={value} onChange={e => {
						if(onChange)
							onChange(e.target.value);
					}}/>
				</Col>
			</Form.Group>
		</Form>
	);
}