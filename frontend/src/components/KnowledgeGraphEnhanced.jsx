import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const KnowledgeGraphEnhanced = ({ data, onNodeSelect, selectedNodeId }) => {
    const svgRef = useRef();

    useEffect(() => {
        if (!data || !data.nodes || data.nodes.length === 0) return;

        const width = 1000;
        const height = 800;

        d3.select(svgRef.current).selectAll("*").remove();

        const svg = d3.select(svgRef.current)
            .attr("viewBox", [0, 0, width, height])
            .attr("width", "100%")
            .attr("height", "100%");

        // Container for zoom/pan
        const g = svg.append("g");

        // Zoom logic
        const zoom = d3.zoom()
            .scaleExtent([0.1, 8])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        svg.call(zoom);

        // Arrows
        svg.append("defs").selectAll("marker")
            .data(["arrow"])
            .join("marker")
            .attr("id", d => d)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 25)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("fill", "#14B8A6")
            .attr("opacity", 0.4)
            .attr("d", "M0,-5L10,0L0,5");

        const nodesData = data.nodes.map(d => ({ ...d }));
        const linksData = data.links ? data.links.map(d => ({ ...d })) : (data.edges ? data.edges.map(d => ({ ...d })) : []);

        // Calculate degrees
        const degrees = {};
        linksData.forEach(l => {
            const s = typeof l.source === 'object' ? l.source.id : l.source;
            const t = typeof l.target === 'object' ? l.target.id : l.target;
            degrees[s] = (degrees[s] || 0) + 1;
            degrees[t] = (degrees[t] || 0) + 1;
        });

        const getColor = (d) => {
            const count = degrees[d.id] || 0;
            if (count > 5) return '#14B8A6';
            if (count > 3) return '#5EEAD4';
            if (count > 1) return '#99F6E4';
            return '#CCFBF1';
        };

        const getRadius = (d) => {
            const count = degrees[d.id] || 0;
            return Math.min(20, 8 + count * 2);
        };

        const simulation = d3.forceSimulation(nodesData)
            .force("link", d3.forceLink(linksData).id(d => d.id).distance(150))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(d => getRadius(d) + 20));

        const link = g.append("g")
            .selectAll("line")
            .data(linksData)
            .join("line")
            .attr("stroke", "#14B8A6")
            .attr("stroke-opacity", 0.4)
            .attr("stroke-width", 1.5)
            .attr("marker-end", "url(#arrow)");

        const node = g.append("g")
            .selectAll("g")
            .data(nodesData)
            .join("g")
            .attr("cursor", "pointer")
            .on("click", (event, d) => onNodeSelect(d))
            .call(d3.drag()
                .on("start", (event) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    event.subject.fx = event.subject.x;
                    event.subject.fy = event.subject.y;
                })
                .on("drag", (event) => {
                    event.subject.fx = event.x;
                    event.subject.fy = event.y;
                })
                .on("end", (event) => {
                    if (!event.active) simulation.alphaTarget(0);
                    event.subject.fx = null;
                    event.subject.fy = null;
                }));

        node.append("circle")
            .attr("r", d => getRadius(d))
            .attr("fill", d => getColor(d))
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .attr("class", d => d.id === selectedNodeId ? "selected-node" : "")
            .style("filter", d => d.id === selectedNodeId ? "drop-shadow(0 0 8px #14B8A6)" : "none");

        node.append("text")
            .attr("dy", d => getRadius(d) + 15)
            .attr("text-anchor", "middle")
            .text(d => d.label || d.id)
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .attr("fill", "#0F766E");

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("transform", d => `translate(${d.x},${d.y})`);
        });

        return () => simulation.stop();
    }, [data, onNodeSelect, selectedNodeId]);

    return (
        <div className="w-full h-full relative group">
            <svg ref={svgRef} className="w-full h-full"></svg>
            <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md p-2 rounded-lg border border-teal-100 text-[10px] font-bold text-teal-600 uppercase tracking-widest hidden group-hover:block">
                Drag to pan · Scroll to zoom
            </div>
        </div>
    );
};

export default KnowledgeGraphEnhanced;
