import React from 'react';
import * as d3 from "d3";

const NodeDetail = ({ onNodeDetailChange, height }) => {
    const [currentDetailNode, setCurrentDetailNode] = React.useState({
        "id": "uniprot:P05231",
        "label": "Interleukin-6",
        "category": 1
    });
    onNodeDetailChange(setCurrentDetailNode);

    const categoryDetails = [
        { id: "Protein", color: "#411c58" },
        { id: "Diseases", color: "#00308e" },
        { id: "Biological Process", color: "#8a2a44" },
        { id: "Chemical", color: "#10712b" },
    ];
    React.useEffect(() => {
        return () => {
        }
    });

    return <aside className=" rsection" style={{
        width: "100%",
        height: height,
        position: "relative",
        verticalAlign: "top",
        overflow: "auto",
        backgroundColor: "white",
        padding: "10px",
        paddingLeft: "20px",
        paddingTop: "20px"
    }}>
        <h5 style={{
            textDecoration: "underline",
        }}>{currentDetailNode.label}</h5>
        <p><b>ID:</b> {currentDetailNode.id}</p>
        <p><b>Category:</b> {categoryDetails[currentDetailNode.category - 1].id}</p>
        <p><b>Detected Synonyms:</b> </p>
    </aside>
}

export default NodeDetail;