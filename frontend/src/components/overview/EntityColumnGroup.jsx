import React from "react";
import "./EntityColumn.css";

export default class EntityColumnGroup extends React.Component {

	constructor(props){
		super(props);
		this.state = {
			expanded: true
		};
	}

	toggleExpand = () => {
		const expanded = this.state.expanded;
		if(expanded)
			this.collapse();
		else
			this.expand();
	}

	expand = () => {
		this.setState({expanded: true});
	}

	collapse = () => {
		this.setState({expanded: false});
	}

	render = () => {
		const {groupName, items} = this.props;
		const {expanded} = this.state;

		let header = `${groupName} - (${items.length})`;

		if(expanded){
			var contents = <ul>{items}</ul>;
		}
		else{
			var contents = <></>;
		}

		const chevron = expanded ? <i className="gg-chevron-double-up" /> : <i className="gg-chevron-double-down" />;

		return (
			<li key={groupName}>
				<h3 
					className="entity_column_category"
					onClick={this.toggleExpand}>{header}<div className="chevron">{chevron}</div></h3>
				{contents}
			</li>
		);
	}
	
}