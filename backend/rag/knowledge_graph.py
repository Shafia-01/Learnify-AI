"""
Learnify AI — Knowledge Graph Builder.

Constructs a conceptual network from text chunks by identifying noun phrases
via NLTK and linking them together based on co-occurrence within the same chunk.
"""

import itertools
import logging
from collections import Counter
from typing import Any, Dict, List

import networkx as nx
import nltk
from nltk.chunk import RegexpParser
from nltk.tag import pos_tag
from nltk.tokenize import word_tokenize

logger = logging.getLogger(__name__)

# ── Ensure NLTK resources are available ───────────────────────────────────


def _ensure_nltk_data() -> None:
    """Download required NLTK corpus datasets if they're not already cached."""
    required_packages = [
        ("tokenizers/punkt", "punkt"),
        ("tokenizers/punkt_tab", "punkt_tab"),
        ("taggers/averaged_perceptron_tagger", "averaged_perceptron_tagger"),
        ("taggers/averaged_perceptron_tagger_eng", "averaged_perceptron_tagger_eng"),
    ]

    for path, package in required_packages:
        try:
            nltk.data.find(path)
        except LookupError:
            nltk.download(package, quiet=True)


_ensure_nltk_data()


# ── Noun Phrase Extractor ────────────────────────────────────────────────

# Match an optional determiner, any number of adjectives, and one or more nouns.
_NP_GRAMMAR = r"NP: {<DT>?<JJ>*<NN|NNS|NNP|NNPS>+}"
_chunk_parser = RegexpParser(_NP_GRAMMAR)


def _extract_concepts(text: str) -> List[str]:
    """
    Extract meaningful noun phrases (concepts) from raw text.

    Args:
        text: A single chunk string.

    Returns:
        A list of extracted concept strings, normalised to lowercase.
    """
    tokens = word_tokenize(text)
    tagged = pos_tag(tokens)

    # Parse for the Noun Phrase regex pattern
    tree = _chunk_parser.parse(tagged)

    concepts: List[str] = []
    for subtree in tree.subtrees():
        if subtree.label() == "NP":
            # Strip determiners (e.g., 'the', 'a') to tighten the concept label
            words = [word for word, tag in subtree.leaves() if tag != "DT"]
            if words:
                concept_label = " ".join(words).lower()
                # Ignore very short strings or purely numeric labels
                if len(concept_label) > 2 and any(c.isalpha() for c in concept_label):
                    concepts.append(concept_label)

    return concepts


# ── Graph Builder ────────────────────────────────────────────────────────


def build_knowledge_graph(chunk_texts: List[str]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Build a co-occurrence knowledge graph from an array of text chunks.

    Concepts form the nodes. A co-occurrence within the same text chunk forms
    an edge between two concepts. To keep the graph visually navigable on the
    frontend, nodes are pruned down to the top 40 most frequent concepts.

    Args:
        chunk_texts: List of text chunk strings from the vector store.

    Returns:
        A dictionary mapping "nodes" and "edges" to lists of dicts.
    """
    chunk_concepts_list = []
    concept_frequencies: Counter = Counter()

    for text in chunk_texts:
        concepts = _extract_concepts(text)
        # Deduplicate concepts within the same chunk so a single document
        # describing a concept repeatedly doesn't create self-loops
        unique_concepts = list(set(concepts))
        chunk_concepts_list.append(unique_concepts)

        for concept in unique_concepts:
            concept_frequencies[concept] += 1

    # Prune to the top 40 most broadly mentioned concepts
    top_40 = concept_frequencies.most_common(40)
    top_concepts_set = {concept for concept, count in top_40}

    # Initialize a directed graph (using DiGraph as per requirements for
    # simple serialisation, though co-occurrence is technically undirected)
    graph = nx.DiGraph()

    for concept in top_concepts_set:
        graph.add_node(concept, label=concept)

    # Establish edges where two top concepts appear in the same chunk
    for chunk_concepts in chunk_concepts_list:
        filtered_concepts = [c for c in chunk_concepts if c in top_concepts_set]

        # Connect every pair of concepts in this chunk
        for c1, c2 in itertools.combinations(filtered_concepts, 2):
            if graph.has_edge(c1, c2):
                graph[c1][c2]["weight"] += 1
            else:
                graph.add_edge(c1, c2, weight=1)

    # Convert the NetworkX object into a structurally sound D3/Sigma JS format
    nodes_payload = [
        {"id": node_id, "label": attr.get("label", str(node_id))}
        for node_id, attr in graph.nodes(data=True)
    ]

    edges_payload = [
        {"source": src, "target": dest, "weight": attr.get("weight", 1)}
        for src, dest, attr in graph.edges(data=True)
    ]

    return {
        "nodes": nodes_payload,
        "edges": edges_payload,
    }
