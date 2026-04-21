import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const KnowledgeGraph = ({ data, onNodeClick }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || !data.nodes || data.nodes.length === 0) return;

    const width = 600;
    const height = 400;

    // Clear previous svg
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", [0, 0, width, height]);

    // calculate connection counts for node sizing
    const connectionCounts = {};
    if (data.edges && Array.isArray(data.edges)) {
      data.edges.forEach(e => {
        const sourceId = (e.source && e.source.id) ? e.source.id : e.source;
        const targetId = (e.target && e.target.id) ? e.target.id : e.target;
        if (sourceId) connectionCounts[sourceId] = (connectionCounts[sourceId] || 0) + 1;
        if (targetId) connectionCounts[targetId] = (connectionCounts[targetId] || 0) + 1;
      });
    }

    const nodesData = (data.nodes || []).map(d => ({...d, radius: Math.min(30, 10 + (connectionCounts[d.id] || 0) * 5)}));
    const edgesData = (data.edges || []).map(d => ({...d}));

    const simulation = d3.forceSimulation(nodesData)
      .force("link", d3.forceLink(edgesData).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .attr("stroke", "#4b5563")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(edgesData)
      .join("line")
      .attr("stroke-width", 2);

    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodesData)
      .join("circle")
      .attr("r", d => d.radius)
      .attr("fill", "#3b82f6")
      .attr("cursor", "pointer")
      .call(drag(simulation))
      .on("click", (event, d) => {
        if(onNodeClick) onNodeClick(d.label);
      });

    const label = svg.append("g")
      .selectAll("text")
      .data(nodesData)
      .join("text")
      .attr("dy", 4)
      .attr("dx", d => d.radius + 5)
      .text(d => d.label)
      .attr("font-size", "12px")
      .attr("fill", "#e5e7eb")
      .attr("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
        
      label
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    });

    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    return () => simulation.stop();
  }, [data, onNodeClick]);

  return <svg ref={svgRef} className="w-full h-full min-h-[300px]"></svg>;
};

export default KnowledgeGraph;
