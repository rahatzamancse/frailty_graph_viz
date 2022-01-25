import EntityColumnGroup from "./EntityColumnGroup";
import "./EntityColumn.css"
import "../../Chevron.css"
import React from "react";
import { useState } from "react";

export default function EntityColumn({ title, data, sorter, grouper, anchor }){

	const [isExpanded, setExpanded] = useState(true);
	
	// Assume sorter implements a stable sort
	if(sorter){
		data.sort(sorter);
	}

	let groupedData = {};

	if(grouper)
		groupedData = grouper(data);
	else // If no grouper is provided, all belongs to the same group
		groupedData = {"": data};

	// Sort the groups to keep a consistent order when changhing the sort criteria
	let groupNames = Object.keys(groupedData).sort();

	let refs = [];

	// Render the list either as grouped or plain depending on the grouper
	const listItems =
		groupNames.flatMap(
			group => {
				const innerItems =
					groupedData[group].map(
						item => {
							const {id, name, freq, weight} = item;
							return (
								<li key={id} className="entity_column_item">
									<a href={`/viz?src=${anchor}&dst=${id}&bidirect`}>{`${name} (${id})`}</a> - F: {freq} - W: {weight.toFixed(2)}
								</li>
							);
					});

				if(group){
					const ref =  React.createRef();
					refs.push(ref);

					return <EntityColumnGroup 
							key={group}
							ref={ref}
							groupName={group}
							toggleExpand={isExpanded}
							items={innerItems} />;
				}
				else
					return innerItems;
				
			}
		);

		const chevron = isExpanded ? <i className="gg-chevron-double-up" /> : <i className="gg-chevron-double-down" />;


	return (
		<div className="entity_column">
			<h2 
				className="entity_column_title"
				onClick={() => {
					// Imperatively change the state of the children panels
					if(isExpanded)
						refs.forEach(ref => ref.current.collapse());
					else
						refs.forEach(ref => ref.current.expand());
					setExpanded(!isExpanded)
				}}>
				{title} 
				<span className="chevron">{chevron}</span>
			</h2>
			<ul className="entity_column_contents">
				{listItems}
			</ul>
		</div>
	)
}