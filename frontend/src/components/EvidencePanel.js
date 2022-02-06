import React, {useEffect} from "react";
import EvidenceTaggerPanel from "./EvidenceTaggerPanel";
import EvidenceItem from "./evidence_panel/EvidenceItem";
import { fetchEvidenceLabels, assignEvidenceLabels } from "../utils/api";
import "./evidence_panel.css";


function newTagAdded(props){
	let source = props.source
	const newTagName = props.tagName
	// Add the new tag without checkmark to the other evidences
	const otherEvidence = document.querySelectorAll("ul#evidence > li")
	otherEvidence.forEach(li => li.labels[newTagName] = false)
	// Set the check mark on the source element
	source.labels[newTagName] = true
}


export default function EvidencePanel({ apiUrl, items, header }) {

	let [labels, setLabels] = React.useState({})
	let [focusSentence, setFocusSentence] = React.useState()
	let [showTaggerPanel, setShowTaggerPanel] = React.useState(false)
	let [taggerPanelStyle, setTaggerPanelStyle] = React.useState({})
	let [hideTaggerPanelTimer, setHideTaggerPanelTimer] = React.useState()
	let [highlightedSentence, setHighlightedSentence] = React.useState()


	let setUpHideTaggerPanelTimer = () => {
		let timer = setTimeout(() => {
			setShowTaggerPanel(false)
			setHighlightedSentence(null);
		}, 2500)
		// Clear any previous timer
		if(hideTaggerPanelTimer)
			clearTimeout(hideTaggerPanelTimer)
		setHideTaggerPanelTimer(timer);
		
	};

	let saveLabelChange =
		({sentence, tagName, checked}) => {
			// Update the labels in the state
			labels[tagName] = checked;
			// Update the back end
			assignEvidenceLabels(apiUrl, sentence, labels)
		}

	items = items.map((i, ix) => {

		// Build the link to the network view
		const urlPath = `/viz?src=${i.source}&dst=${i.destination}&bidirect`

		return (<EvidenceItem 
			key={ix}
			markup={i.markup}
			hyperlink={i.hyperlink}
			vizPath={i.source && urlPath} // Will assign the vizPath only if the source is not null
			sentence={i.rawSentence}
			impact={i.impact}
			highlighted={highlightedSentence === ix}
			onClick={
				async (event) => {
					// Set the focus sentence to the clicked item's sentence
					const focusSentence = i.markup
					setFocusSentence(focusSentence);
					// Retrieve the labels from the backend for this focus sentence
					const labels = await fetchEvidenceLabels(apiUrl, focusSentence)
					setLabels(labels)
					// Update the position of the tagger panel based on the location of the click
					const taggerPanelStyle = {
						position: "absolute",
						top: event.pageY,
						left: event.pageX
					}
					setShowTaggerPanel(true) // Also show it
					setTaggerPanelStyle(taggerPanelStyle)
					// Highlight the current item
					setHighlightedSentence(ix);
					// setUpHideTaggerPanelTimer(); // Start the time to hide the pannel if necessary
				}
			}
		/>)})


	// Fetch the focus sentence from the state to support the evidence panel

	const taggerPanel = showTaggerPanel ? 
		<EvidenceTaggerPanel 
			sentence={focusSentence} 
			labels={ labels }
			handleCheck={ saveLabelChange }
			handleNewTag={ saveLabelChange }
			// handleMouseEnter={
			// 	() => {
			// 		if(hideTaggerPanelTimer) {
			// 			clearTimeout(hideTaggerPanelTimer)
			// 		}
			// 	}
			// }
			// handleMouseLeave={
			// 	setUpHideTaggerPanelTimer
			// }
			style={taggerPanelStyle}
			handleClose={ () => {
				setShowTaggerPanel(false)
				setHighlightedSentence(null)
			} }
		/>  : <></>;

	return (
		<div>
			
			{taggerPanel}
			<div className="evidence_pane">
			{ header }
				<ul>
					{items}
				</ul>
			</div>
		</div>
	)
}