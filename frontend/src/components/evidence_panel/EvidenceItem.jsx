import { useEffect, useRef } from "react";
import "../evidence_panel.css";



function injectVizPathLinks(elem){

	// Use straight dom manipulation to inject links to the evidence panel
	const path = elem.dataset.vizpath;

	if(path){

		// Generate the shadow copy of the dom elements
		const newChildren = Array.from(elem.childNodes).map((child) => {
			if(child.nodeName === "SPAN" && child.className.startsWith("event")){
				const newChild = document.createElement("a");
				newChild.setAttribute("href", path);
				newChild.setAttribute("target", "_blank");
				newChild.setAttribute("class", "injected_link");
				newChild.appendChild(child);
				return newChild;
			}
			else
				return child
		});

		// Replace the original dom elements with the shadow copy
		newChildren.forEach((child) => {
			elem.appendChild(child);
		});

	}
}

export default function EvidenceItem(props) {

	// This is a HACK, but there is no easy way around this right now
	const itemRef = useRef();

	useEffect(() => {
		if(itemRef.current)
			injectVizPathLinks(itemRef.current);
	});
	////////////////////////////////////////////////////////////////


    const pattern =  /PMC\d+/;
    const matches = props.hyperlink.match(pattern);

    const linkText = matches ? matches[0] : "Source";
	
	

    return (
        <li className={props.highlighted?"selected":""}>
            {props.impact !== null?`(${props.impact.toFixed(2)})`:""} <a href={props.hyperlink} target="_blank">{linkText}</a>: {' '}
			<span ref={itemRef} data-vizpath={props.vizPath} dangerouslySetInnerHTML={{__html: props.markup}} onClick={props.onClick} />
        </li>
    )
}