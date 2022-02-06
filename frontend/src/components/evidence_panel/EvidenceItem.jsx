import { useEffect, useRef } from "react";
import "../evidence_panel.css";
import tag from "../../assets/tag.png"


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

export default function EvidenceItem({ hyperlink, highlighted, impact, markup, onClick, vizPath }) {

	// This is a HACK, but there is no easy way around this right now
	const itemRef = useRef();

	useEffect(() => {
		if(itemRef.current)
			injectVizPathLinks(itemRef.current);
	});
	////////////////////////////////////////////////////////////////


    const pattern =  /PMC\d+/;
    const matches = hyperlink.match(pattern);

    const linkText = matches ? matches[0] : "Source";

    return (
        <li className={highlighted?"selected":""}>
            {impact !== null?`(${impact.toFixed(2)})`:""} <a href={hyperlink} target="_blank">{linkText}</a>: {' '}
			<span ref={itemRef} data-vizpath={vizPath} dangerouslySetInnerHTML={{__html: markup}} />
			<img
				src={tag}
				alt="Tag this evidence sentence"
				title="Tag this evidence sentence"
				style={
					{
						height: "1em",
						transform: "rotate(45deg)",
						position: "relative",
						left: ".2em",
						bottom: ".2em",
						cursor: "pointer",
						zIndex: "0"
					}
				}
				onClick={onClick}
			/>
        </li>
    )
}