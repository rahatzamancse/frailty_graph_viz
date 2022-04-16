import React, { useState } from 'react';
import * as d3 from "d3";
import smoothHull from '../../utils/convexHull';


import "../styles/MainGraph.scss";
import WeightPanel from '../weight/WeightPanel';
import SidePanel from "./SidePanel";
import NetworkViz from '../../NetworkViz';

const dummyData = {
    'nodes': { nodes: ["uniprot:P05231"] },
    category_count: {
        categorycount: {
            "1": 5,
            "2": 5,
            "3": 5,
            "4": 5,
        }
    }
};

const idToClass = id => {
    if (typeof id === 'string' || id instanceof String) {
        // @ts-ignore
        return id.replaceAll(':', '_');
    }
    else {
        return id.id.replaceAll(':', '_');
    }
}

// These are the initially assumed height. After rendering the html, these height and width will be updated.
const minHeight = 300;
const minWidth = 300;
let height = minHeight;
let width = minWidth;

// values for all forces
// https://www.youtube.com/watch?v=JAe7Oscsp98
const forceProperties = {
    center: {
        enabled: false,
        x: 0.5,
        y: 0.5,
        strength: 0.1
    },
    charge: {
        enabled: true,
        strength: -500,
        distanceMin: 1,
        distanceMax: 1000
    },
    collide: {
        enabled: true,
        strength: .4,
        iterations: 1,
        radius: 30
    },
    separation: {
        enabled: true,
        strength: 0.1,
        radius: (width + height) / 2.0 * 0.25,
        radiusFunc: (width, height) => (width + height) / 2.0 * 0.25
    },
    link: {
        enabled: true,
        strength: 0.9,
        iterations: 1,
        distanceFactor: 5
    },
    radial: {
        enabled: false,
        strength: 1,
        categoryRadius: [400, 300, 200, 1]
    }
};

const normalizeDistance = (x, xMin, xMax, minDist, maxDist) => {
    const dist = xMax + 1 - Math.min(xMax, x);
    return (dist - xMin) / (xMax - xMin) * (maxDist - minDist) + minDist;

}

const calculateCategoryCenters = (cats, r) => [...Array(cats).keys()].map(i => [width / 2 + Math.round(r * Math.cos(2 * Math.PI * i / cats)), height / 2 + Math.round(r * Math.sin(2 * Math.PI * i / cats))]);

const updateForces = ({ simulation, maxDist }) => {
    // get each force by name and update the properties
    simulation.force("center")
        // @ts-ignore
        .x(width * forceProperties.center.x)
        .y(height * forceProperties.center.y)
        .strength(forceProperties.center.enabled ? forceProperties.center.strength : 0);
    simulation.force("charge")
        // @ts-ignore
        .strength(forceProperties.charge.strength * forceProperties.charge.enabled)
        .distanceMin(forceProperties.charge.distanceMin)
        .distanceMax(forceProperties.charge.distanceMax);
    simulation.force("collide")
        // @ts-ignore
        .strength(forceProperties.collide.strength * forceProperties.collide.enabled)
        .radius(forceProperties.collide.radius)
        .iterations(forceProperties.collide.iterations);

    const cat_centers = calculateCategoryCenters(4, forceProperties.separation.radius)
    simulation.force("forceX")
        // @ts-ignore
        .strength(forceProperties.separation.strength * forceProperties.separation.enabled)
        .x(d => cat_centers[d['category'] - 1][0]);
    simulation.force("forceY")
        // @ts-ignore
        .strength(forceProperties.separation.strength * forceProperties.separation.enabled)
        .y(d => cat_centers[d['category'] - 1][1]);

    simulation.force("r")
        // @ts-ignore
        .radius(d => forceProperties.radial.categoryRadius[d['category'] - 1])
        .strength(forceProperties.radial.strength * (forceProperties.radial.enabled ? 1 : 0));

    simulation.force("link")
        // @ts-ignore
        .distance(d => normalizeDistance(d.freq, 1, maxDist, 1, 50) * forceProperties.link.distanceFactor)
        .iterations(forceProperties.link.iterations)
        // @ts-ignore
        .strength(forceProperties.link.enabled ? simulation.force("link").strength() : 0);

    // updates ignored until this is run
    // restarts the simulation (important if simulation has already slowed down)
    simulation.alpha(1).alphaMin(-1).restart();
}

// @ts-ignore
const MainGraph = React.memo(({ vizApiUrl, apiUrl }) => {
    console.log("Module Loading");

    const simulation = d3.forceSimulation();

    simulation.stop()
        .force("link", d3.forceLink().id(d => d.id))
        .force("charge", d3.forceManyBody())
        .force("collide", d3.forceCollide())
        .force("center", d3.forceCenter())
        .force("forceX", d3.forceX())
        .force("forceY", d3.forceY())
        .force("r", d3.forceRadial(
            d => forceProperties.radial.categoryRadius[d['category'] - 1],
            width / 2,
            height / 2
        ));


    let maxDist = 100;

    const svgRef = React.useRef();
    // const [selectedNode, setSelectedNode] = React.useState(dummyData);
    let selectedNode = dummyData;
    const cleanUp = () => {
        // console.log('Clean up');
        // d3.select('g.linkgroup').remove();
        // d3.select('g.hullgroup').remove();
        // d3.select('g.nodegroup').remove();

        // d3.select(svgRef.current).select('g.everything').append('g').attr('class', 'hullgroup');
        // d3.select(svgRef.current).select('g.everything').append('g').attr('class', 'linkgroup');
        // d3.select(svgRef.current).select('g.everything').append('g').attr('class', 'nodegroup');
    };

    const subgraph = {
        nodes: [], links: []
    };

    const setSelectedNode = (d) => {
        selectedNode = d;
        cleanUp();
        d3UpdateFunc();
    };
    const updateNodeSuggestions = (d) => {
        setSelectedNode({
            ...selectedNode,
            nodes: { nodes: d }
        });
    };

    const nodeRadiusScale = {
        'linear': d3.scaleLinear().range([1, 30]),
        'log': d3.scaleLog().range([1, 30])
    }
    let selectedNodeRadiusScale = 'linear';

    const nodeRadiusScaleChanged = (val) => {
        selectedNodeRadiusScale = val;
        d3UpdateFunc();
    }

    const nodeWeightParams = {
        frequency: 1,
        hasSignificance: 1,
        avgSignificance: 1,
        avgImpactFactor: 1,
        maxImpactFactor: 1,
        pValue: 1,
    }


    const weightUpdated = async () => {
        if (Object.keys(nodeWeightParams).length === 0) return;
        const nodeWeightsResponse = await fetch(`${vizApiUrl}/noderadius`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nodes: {
                    nodes: subgraph.nodes.map(d => d.id)
                },
                weights: {
                    weights: nodeWeightParams
                }
            })
        });
        const nodeWeights = await nodeWeightsResponse.json();
        nodeRadiusScale[selectedNodeRadiusScale].domain([
            Math.min(...Object.values(nodeWeights)),
            Math.max(...Object.values(nodeWeights))
        ]);
        for (let i = 0; i < subgraph.nodes.length; i++) {
            subgraph.nodes[i]['weight_radius'] = +nodeWeights[subgraph.nodes[i].id];
        }
    }
    const weightChanged = (weight) => {
        Object.assign(nodeWeightParams, weight);
        weightUpdated();
        d3UpdateFunc();
    }
    let nodeSelection = {
        first: null
    };

    // NetworkViz states
    let setNetworkVizData = null;
    const networkVizDataChanged = (dataFromChild) => {
        setNetworkVizData = dataFromChild;
    };

    const clickedOnRelation = (node1, node2) => {
        console.log("Calling set data");
        setNetworkVizData({
            src: node1,
            dst: node2,
            bid: true
        })
    }


    const d3UpdateFunc = async () => {
        // This is not actually an effect, but it works like an effect as it is run after component is mounted and rendered.
        console.log("effect called");
        if (selectedNode.nodes.nodes.length === 0) {
            setSelectedNode(dummyData);
            return;
        }

        simulation.stop();

        const svgRoot = d3.select(svgRef.current);
        const svg = d3.select(svgRef.current).select("g.everything");
        const svgHullGroup = svg.select('g.hullgroup');
        const svgLinkGroup = svg.select('g.linkgroup');
        const svgNodeGroup = svg.select('g.nodegroup');

        height = Math.max(parseInt(svgRoot.style("height")), minHeight);
        width = Math.max(parseInt(svgRoot.style("width")), minWidth);
        forceProperties.separation.radius = forceProperties.separation.radiusFunc(width, height);

        svgHullGroup
            .selectAll('path')
            .data([{ category: 1 }, { category: 2 }, { category: 3 }, { category: 4 }], d => d.category)
            .enter()
            .append('path')
            .attr('class', d => 'hull_' + (d.category));

        const newSubgraphResponse = await fetch(`${vizApiUrl}/getbestsubgraph`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(selectedNode)
        });
        const newSubgraph = await newSubgraphResponse.json();

        height = Math.max(parseInt(svgRoot.style("height")), minHeight);
        width = Math.max(parseInt(svgRoot.style("width")), minWidth);

        const newNodes = [];
        const newLinks = [];
        for (let i in newSubgraph.nodes) {
            const myNode = subgraph.nodes.findIndex(node => node.id === newSubgraph.nodes[i].id)
            if (myNode !== -1) {
                newNodes.push({
                    ...subgraph.nodes[myNode],
                    ...newSubgraph.nodes[i]
                });
            }
            else {
                newNodes.push({
                    ...newSubgraph.nodes[i],
                    x: width / 2,
                    y: height / 2,
                });
            }
        }
        for (let i in newSubgraph.links) {
            const myEdge = subgraph.links.findIndex(edge => edge.source.id === newSubgraph.links[i].source && edge.target.id === newSubgraph.links[i].target)
            if (myEdge !== -1) {
                newLinks.push({
                    ...subgraph.links[myEdge],
                    ...newSubgraph.links[i]
                });
            }
            else {
                newLinks.push(newSubgraph.links[i]);
            }
        }
        subgraph.nodes = newNodes;
        subgraph.links = newLinks;

        const nodeWeightsResponse = await fetch(`${vizApiUrl}/noderadius`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nodes: {
                    nodes: subgraph.nodes.map(d => d.id)
                },
                weights: {
                    weights: nodeWeightParams
                }
            })
        })

        const nodeWeights = await nodeWeightsResponse.json();

        nodeRadiusScale[selectedNodeRadiusScale].domain([
            Math.min(...Object.values(nodeWeights)),
            Math.max(...Object.values(nodeWeights))
        ]);
        for (let i = 0; i < subgraph.nodes.length; i++) {
            subgraph.nodes[i]['weight_radius'] = +nodeWeights[subgraph.nodes[i].id];
        }

        const link = svgLinkGroup
            .selectAll('g.line')
            .data(subgraph.links, d => d.source + d.target)
            .join(
                enter => {
                    const lineGroup = enter
                        .append('g')
                        .attr('class', d => "line " + idToClass(d.source) + " " + idToClass(d.target))
                        .classed('betweencategory', d => d['samecategory'])
                        .classed('intracategory', d => !d['samecategory']);
                    lineGroup.append("text")
                        .text(d => d.freq);
                    lineGroup.append("line")
                        .on('mouseover', (e) => {
                            if(nodeSelection.first) return;
                            const line = d3.select(e.target.parentNode).classed('hovered', true);
                            const lineData = line.data();
                            d3.selectAll(`g#${idToClass(lineData[0].source.id)} circle`).classed('hovered', true);
                            d3.selectAll(`g#${idToClass(lineData[0].target.id)} circle`).classed('hovered', true);
                        })
                        .on('mouseout', (e) => {
                            if(nodeSelection.first) {
                                return;
                            }
                            const line = d3.select(e.target.parentNode).classed('hovered', false);
                            const lineData = line.data();
                            d3.selectAll(`g#${idToClass(lineData[0].source.id)} circle`).classed('hovered', false);
                            d3.selectAll(`g#${idToClass(lineData[0].target.id)} circle`).classed('hovered', false);
                        })
                        .on('click', (e) => {
                            const line = d3.select(e.target.parentNode);
                            const lineData = line.data();
                            if(nodeSelection.first !== null && nodeSelection.first !== lineData[0].source.id && nodeSelection.first !== lineData[0].target.id) {
                                return;
                            }
                            clickedOnRelation(lineData[0].source.id, lineData[0].target.id);
                        });

                    return lineGroup;
                },
                update => update,
                exit => exit.remove()
            );

        const categoryNodeColors = {
            3: "#8a2a44",
            4: "#10712b",
            1: "#411c58",
            2: "#00308e",
        }

        const shortenText = (t) => {
            if (t.length <= 15) return t;
            return t.substring(0, 7) + '...' + t.substring(t.length-3)
        };

        const node = svgNodeGroup
            .selectAll("g.node")
            .data(subgraph.nodes, d => d.id)
            .join(
                enter => {
                    const nodeGroup = enter
                        .append("g")
                        .classed("node", true)
                        .classed("pinned", d => d['pinned'])
                        .attr('id', d => idToClass(d.id));

                    nodeGroup.append("text")
                        .text(d => shortenText(d["label"]))
                        .attr('x', 40)
                        .attr('y', 0)
                        .on("mouseover", e => {
                            d3.select(e.target).text(d => d['label'])
                        })
                        .on("mouseout", e => {
                            d3.select(e.target).text(d => shortenText(d['label']))
                        });
                    // node tooltip
                    nodeGroup.append("title")
                        .text(d => d.id);

                    nodeGroup.append("circle")
                        .attr('r', d => nodeRadiusScale[selectedNodeRadiusScale](d.weight_radius))
                        .attr('stroke', d => categoryNodeColors[d.category])
                        .attr('fill', d => categoryNodeColors[d.category])
                        .on('mouseover', (e) => {
                            const circle = d3.select(e.target).classed('hovered', true);
                            const nodeId = circle.data()[0].id;
                            d3.selectAll('g.linkgroup g.' + idToClass(nodeId)).classed('hovered', true);

                            d3.selectAll('g.linkgroup g.' + idToClass(nodeId) + '.hovered text').classed('hovered', true);
                        })
                        .on('mouseout', (e) => {
                            const circle = d3.select(e.target).classed('hovered', false);
                            const nodeId = circle.data()[0].id;
                            d3.selectAll('g.linkgroup g.' + idToClass(nodeId) + '.hovered text').classed('hovered', false);
                            d3.selectAll('g.linkgroup g.' + idToClass(nodeId)).classed('hovered', false);

                        })
                        .on("click", (e) => {
                            if(!nodeSelection.first) {
                                const circle = d3.select(e.target).classed('selected', true);
                                const nodeId = circle.data()[0].id;
                                nodeSelection.first = nodeId;

                                d3.selectAll('g.linkgroup g.' + idToClass(nodeId)).classed('largehovered', true);
                            }
                            else {
                                d3.select(".node circle.selected").classed("selected", false);
                                const circle = d3.select(e.target);
                                const nodeId = circle.data()[0].id;
                                d3.selectAll('g.linkgroup g.' + idToClass(nodeSelection.first)).classed('largehovered', false);
                                if(nodeId !== nodeSelection.first) {
                                    clickedOnRelation(nodeSelection.first, nodeId);
                                    nodeSelection.first = null;
                                }
                                else {
                                    nodeSelection.first = null;
                                }
                            }

                        })
                    nodeGroup
                        // @ts-ignore
                        .call(d3.drag()
                            .on("start", (event, d) => {
                                if (!event.active) simulation.alphaTarget(0.3).restart();
                                d.fx = d.x;
                                d.fy = d.y;

                            })
                            .on("drag", (event, d) => {
                                d.fx = event.x;
                                d.fy = event.y;

                            })
                            .on("end", (event, d) => {
                                if (!event.active) simulation.alphaTarget(0.001);
                                d.fx = null;
                                d.fy = null;
                            }));

                    return nodeGroup;
                },
                update => {
                    const nodeGroup = update
                        .classed("pinned", d => d['pinned']);

                    nodeGroup.select('text')
                        .text(d => shortenText(d["label"]));
                    // node tooltip
                    nodeGroup.select("title")
                        .text(d => d.id);


                    nodeGroup.select("circle")
                        .attr('r', d => nodeRadiusScale[selectedNodeRadiusScale](d.weight_radius))
                        .attr('stroke', d => categoryNodeColors[d.category]);

                    return nodeGroup;
                },
                exit => exit.remove()
            );


        simulation.nodes(subgraph.nodes);
        maxDist = Math.max(...subgraph.links.map(link => link.freq));

        simulation.force("link").links(subgraph.links);

        updateForces({ simulation, maxDist });

        simulation.on("tick", () => {
            link.selectAll('line')
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            link.selectAll('text')
                .attr('x', d => d.target.x + 20)
                .attr('y', d => d.target.y + 20);

            node
                .attr('transform', d => `translate(${d.x},${d.y})`);

            const hullPoints = [];
            for (let i = 1; i <= 4; i++) {
                hullPoints.push({
                    category: i,
                    hulls: d3.polygonHull(subgraph.nodes.filter(d => d["category"] === i).map(d => [d.x, d.y]))
                });
            }

            const hullPadding = 25;
            for (let i = 1; i <= 4; i++) {
                if (hullPoints[i - 1].hulls) {
                    d3.select('.hull_' + i).attr('d', smoothHull(hullPoints[i - 1].hulls, hullPadding));
                }
            }

            const entropyBar = d3.select('#alpha_value').style('width', simulation.alpha() * 100 + "%");
            if (simulation.alpha() > 0.5) {
                entropyBar.classed("bg-danger", true).classed("bg-warning", false).classed("bg-success", false);
            }
            else if (simulation.alpha() > 0.2) {
                entropyBar.classed("bg-warning", true).classed("bg-danger", false).classed("bg-success", false);
            }
            else {
                entropyBar.classed("bg-warning", false).classed("bg-danger", false).classed("bg-success", true);
            }
        });

        simulation.alpha(1).restart();

        d3.selectAll("g.intracategory line").style('opacity', d3.select("#interclusterEdgeOpacity").node().value);
        d3.select("#interclusterEdgeOpacity").on('change', (e) => {
            d3.selectAll("g.intracategory line").style('opacity', e.target.value);
        })
        d3.selectAll("g.betweencategory line").style('opacity', d3.select("#intraclusterEdgeOpacity").node().value);
        d3.select("#intraclusterEdgeOpacity").on('change', (e) => {
            d3.selectAll("g.betweencategory line").style('opacity', e.target.value);
        })
        d3.selectAll("g.node text").style('opacity', d3.select("#nodeLabelOpacity").node().value);
        d3.select("#nodeLabelOpacity").on('change', (e) => {
            d3.selectAll("g.node text").style('opacity', e.target.value);
        })
        nodeRadiusScale["linear"].range([1, d3.select("#maxRadius").node().value]);
        d3.selectAll("g.node circle").attr('r', d => nodeRadiusScale[selectedNodeRadiusScale](d.weight_radius));
        d3.select("#maxRadius").on('change', (e) => {
            nodeRadiusScale["linear"].range([1, e.target.value]);
            d3.selectAll("g.node circle").attr('r', d => nodeRadiusScale[selectedNodeRadiusScale](d.weight_radius));
        })

        d3.selectAll(".clusternodecount").on('change', (e) => {
            const categoryIds = ['cluster1count', 'cluster2count', 'cluster3count', 'cluster4count'];
            setSelectedNode({
                ...selectedNode,
                category_count: {
                    categorycount: {
                        "1": d3.select('#' + categoryIds[0]).property('value'),
                        "2": d3.select('#' + categoryIds[1]).property('value'),
                        "3": d3.select('#' + categoryIds[2]).property('value'),
                        "4": d3.select('#' + categoryIds[3]).property('value'),
                    }
                }
            });
        });

        // Legends
        const colors = [
            { id: "Protein", color: "#411c58" },
            { id: "Diseases", color: "#00308e" },
            { id: "Biological Process", color: "#8a2a44" },
            { id: "Chemical", color: "#10712b" },
        ];


        const svgColorLegends = d3.select('g.categorylegends')
            .attr('transform', `translate(${width - 200},25)`);


        const addLegendTitle = (group, legendTitle, legendClass) => {
            group.selectAll("." + legendClass).data([1]).join(
                enter => enter
                    .append("text")
                    .attr("class", legendClass)
                    .text(legendTitle)
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("text-anchor", "left")
                    .style("alignment-baseline", "middle")
                    .attr('text-decoration', "underline"),
                update => update
                    .text(legendTitle)
                    .attr("x", 0)
                    .attr("y", 0),
                exit => exit.remove()
            )
        };

        addLegendTitle(svgColorLegends, "Category Colors", "colorlegendtitle");

        const legendTitleHeight = 20;

        const legendSquareSize = 20;
        svgColorLegends.selectAll('rect')
            .data(colors)
            .enter()
            .append('rect')
            .attr('x', 0)
            .attr('y', (d, i) => i * (legendSquareSize + 5) + legendTitleHeight)
            .attr('width', legendSquareSize)
            .attr('height', legendSquareSize)
            .style('fill', d => d.color)
            .attr("stroke", "black");

        svgColorLegends.selectAll('.colorlabel')
            .data(colors)
            .enter()
            .append("text")
            .attr("class", "colorlabel")
            .attr("x", legendSquareSize * 1.2)
            .attr("y", (d, i) => i * (legendSquareSize + 5) + (legendSquareSize / 2) + legendTitleHeight)
            .style("fill", d => d.color)
            .text(d => d.id)
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle");

        const svgSizeLegends = d3.select('g.sizelegends')
            .attr('transform', `translate(${width - 200},200)`);
        const sizeLegendItemsCount = 3;

        const linspace = (start, stop, num, endpoint = true) => {
            const div = endpoint ? (num - 1) : num;
            const step = (stop - start) / div;
            return Array.from({ length: num }, (_, i) => start + step * i);
        }

        const legendSizeData = Array.from(linspace(nodeRadiusScale[selectedNodeRadiusScale].domain()[0], nodeRadiusScale[selectedNodeRadiusScale].domain()[1], sizeLegendItemsCount), (d, i) => ({
            id: i, value: d
        }))
        const legendMaxCircleSize = nodeRadiusScale[selectedNodeRadiusScale].range()[1];

        addLegendTitle(svgSizeLegends, "Weight Values", "radiuslegendtitle");

        svgSizeLegends.selectAll('.circleradiuslabel')
            .data(legendSizeData, d => d.id)
            .join(enter => enter
                .append('circle')
                .attr("class", "circleradiuslabel")
                .attr('cx', 0)
                .attr('cy', (d, i) => i * (legendMaxCircleSize * 2) + legendTitleHeight*2)
                .attr('r', d => nodeRadiusScale[selectedNodeRadiusScale](d.value))
                .style('fill', d => "grey")
                .attr("stroke", "black"),
                update => update
                    .attr('cy', (d, i) => i * (legendMaxCircleSize * 2) + legendTitleHeight*2)
                    .attr('r', d => nodeRadiusScale[selectedNodeRadiusScale](d.value)),
                exit => exit.remove()
            );

        svgSizeLegends.selectAll('.radiuslabel')
            .data(legendSizeData, d => d.id)
            .join(enter => enter
                .append("text")
                .attr("class", "radiuslabel")
                .attr("x", legendMaxCircleSize * 2)
                .attr("y", (d, i) => i * (legendMaxCircleSize * 2) + legendTitleHeight*2)
                .text(d => Math.round(d.value))
                .attr("text-anchor", "left")
                .style("alignment-baseline", "middle"),
                update => update
                    .attr("y", (d, i) => i * (legendMaxCircleSize * 2) + legendTitleHeight*2)
                    .text(d => Math.round(d.value)),
                exit => exit.remove()
            );
        


        d3.zoom().on("zoom", (e) => {
            svg.attr('transform', e.transform)
            // @ts-ignore
        })(svgRoot);


        return cleanUp;
    }

    function debounce(func) {
        var timer;
        return function (event) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(func, 1000, event);
        };
    }

    window.addEventListener("resize", debounce((e) => {
        d3UpdateFunc();
    }));



    return (
        <>
            <div style={{
                display: "flex",
                flexDirection: "column",
            }}>
                <WeightPanel
                    updateWeightValues={weightChanged}
                    useButton={false}
                    buttonText={"Update Weight"}
                    initialUpdateCall={false}
                />
                <div style={{
                    display: "flex",
                    flexDirection: "row",
                }}>
                    <SidePanel currentView={{view: "root"}} simulation={simulation} maxDist={maxDist} apiUrl={vizApiUrl} updateNodeSuggestions={updateNodeSuggestions} nodeRadiusScaleChanged={nodeRadiusScaleChanged} forceProperties={forceProperties} updateForces={updateForces} />
                    <div style={{
                        width: "100%",
                        minWidth: "800px"
                    }}>
                        <main className="main-ui rsection" style={{
                                width: "100%",
                                display: "flex",
                                flexDirection: "column",
                                position: "relative",
                                verticalAlign: "top",
                                overflow: "hidden",
                                paddingBottom: "50%",
                        }}>
                            <svg ref={svgRef} id="maingraph" className="fullsize" style={{
                                position: "absolute",
                                background: "white",
                            }}>
                                <g className="relationview"></g>
                                <g className="everything">
                                    <g className="hullgroup"></g>
                                    <g className="linkgroup"></g>
                                    <g className="nodegroup"></g>
                                </g>
                                <g className="legendgroup" style={{
                                    outline: "1px solid black",
                                    outlineOffset: "10px"
                                }}>
                                    <g className="categorylegends" transform={`translate(${width - 200},25)`}></g>
                                    <g className="sizelegends" transform={`translate(${width - 200},160)`}></g>
                                </g>
                                <g className="ui">
                                    <g transform="scale(0.4, 0.4),translate(100, 100)" className="backbtn" style={{
                                        position: "absolute"
                                    }}>
                                        <rect x="-15" y="-15" height="250" width="250" rx="10" ry="10" fill="white" />
                                        <path d="M109.576,219.151c60.419,0,109.573-49.156,109.573-109.576C219.149,49.156,169.995,0,109.576,0S0.002,49.156,0.002,109.575
                                            C0.002,169.995,49.157,219.151,109.576,219.151z M109.576,15c52.148,0,94.573,42.426,94.574,94.575
                                            c0,52.149-42.425,94.575-94.574,94.576c-52.148-0.001-94.573-42.427-94.573-94.577C15.003,57.427,57.428,15,109.576,15z"/>
                                        <path d="M94.861,156.507c2.929,2.928,7.678,2.927,10.606,0c2.93-2.93,2.93-7.678-0.001-10.608l-28.82-28.819l83.457-0.008
                                            c4.142-0.001,7.499-3.358,7.499-7.502c-0.001-4.142-3.358-7.498-7.5-7.498l-83.46,0.008l28.827-28.825
                                            c2.929-2.929,2.929-7.679,0-10.607c-1.465-1.464-3.384-2.197-5.304-2.197c-1.919,0-3.838,0.733-5.303,2.196l-41.629,41.628
                                            c-1.407,1.406-2.197,3.313-2.197,5.303c0.001,1.99,0.791,3.896,2.198,5.305L94.861,156.507z"/>
                                    </g>
                                </g>
                            </svg>
                        </main>
                        <div className="rsection" style={{
                            width: "100%",
                        }}>
                            <NetworkViz apiUrl={apiUrl} initData={{src:"uniprot:P05231", dst:"go:GO:0006954", bid:true}} onDataChange={networkVizDataChanged}></NetworkViz>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
});

export default MainGraph;