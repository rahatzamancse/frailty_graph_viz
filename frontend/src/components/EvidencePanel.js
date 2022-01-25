import React from "react";
import EvidenceTaggerPanel from "./EvidenceTaggerPanel";
import EvidenceItem from "./evidence_panel/EvidenceItem";
import "./evidence_panel.css";

function checkLabel(props){
	let source = props.source
	source.labels = props.labels
	const body = JSON.stringify({
			sentence: props.sentence,
			labels: props.labels
		})
	// Send it to the backend
	fetch('/label/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: body
	})
}

function newTagAdded(props){
	let source = props.source
	const newTagName = props.tagName
	// Add the new tag without checkmark to the other evidences
	const otherEvidence = document.querySelectorAll("ul#evidence > li")
	otherEvidence.forEach(li => li.labels[newTagName] = false)
	// Set the check mark on the source element
	source.labels[newTagName] = true
}


export default function EvidencePanel(props) {

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

	const items = props.items.map((i, ix) => {

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
				(event) => {
					// Set the focus sentence to the clicked item's sentence
					const focusSentence = i.markup
					setFocusSentence(focusSentence);
					// TODO retrieve the labels from the backend for this focus sentence
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
					setUpHideTaggerPanelTimer(); // Start the time to hide the pannel if necessary
				}
			}
		/>)})


	// Fetch the focus sentence from the state to support the evidence panel

	const taggerPanel = showTaggerPanel ? 
		<EvidenceTaggerPanel 
			sentence={focusSentence} 
			labels={labels}
			handleCheck={
				({sentence, tagName, checked}) => {
					// Update the labels in the state
					console.log(tagName)
					labels[tagName] = checked;
					// Update the back end
					console.log(sentence, tagName, checked)
				}
			}
			handleNewTag={
				({sentence, tagName}) => {
					// Add the new tag to the labels object
					labels[tagName] = true
					setLabels(labels)
					// Update the backend
					console.log(sentence, tagName, true)
				}
			}
			handleMouseEnter={
				() => {
					if(hideTaggerPanelTimer) {
						clearTimeout(hideTaggerPanelTimer)
					}
				}
			}
			handleMouseLeave={
				setUpHideTaggerPanelTimer
			}
			style={taggerPanelStyle}
		/>  : <></>;

	return (
		<div>
			
			{taggerPanel}
			<div className="evidence_pane">
			{ props.header }
				<ul>
					{items}
				</ul>
			</div>
		</div>
	)
}