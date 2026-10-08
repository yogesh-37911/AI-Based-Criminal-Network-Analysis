"""
Investigation Graph + Suspect Network Analysis (Modules 6 & 7).

Builds a NetworkX graph from the case's Entity/EntityRelationship
tables (persisted in PostgreSQL) and computes standard network
analysis metrics. Neo4j is the spec's suggested graph store; this
implementation keeps everything in Postgres and materializes the
graph in-memory with NetworkX at query time, which is sufficient at
case-scale (hundreds to low-thousands of entities) and avoids
standing up a second database for an MVP/hackathon deployment. See
docs/architecture.md for the migration path to Neo4j.
"""
from typing import Dict, Any
import networkx as nx
from sqlalchemy.orm import Session

from app.models.models import Entity, EntityRelationship


def build_networkx_graph(db: Session, case_id: str) -> nx.Graph:
    g = nx.Graph()
    entities = db.query(Entity).filter(Entity.case_id == case_id).all()
    for e in entities:
        g.add_node(e.id, label=e.value, type=e.entity_type.value if hasattr(e.entity_type, "value") else e.entity_type)

    rels = db.query(EntityRelationship).filter(EntityRelationship.case_id == case_id).all()
    for r in rels:
        g.add_edge(
            r.source_entity_id,
            r.target_entity_id,
            key=r.id,
            type=r.relationship_type.value if hasattr(r.relationship_type, "value") else r.relationship_type,
            weight=r.weight,
            confidence_label=r.confidence_label.value if hasattr(r.confidence_label, "value") else r.confidence_label,
        )
    return g


def compute_network_metrics(g: nx.Graph) -> Dict[str, Any]:
    """Module 7 — degree/betweenness centrality, PageRank, community
    detection, density. These are investigative indicators only."""
    if g.number_of_nodes() == 0:
        return {
            "note": "No entities in graph yet.",
            "density": 0,
            "node_count": 0,
            "edge_count": 0,
        }

    degree_centrality = nx.degree_centrality(g)
    try:
        betweenness = nx.betweenness_centrality(g, weight="weight")
    except Exception:
        betweenness = {n: 0 for n in g.nodes}
    try:
        pagerank = nx.pagerank(g, weight="weight")
    except Exception:
        pagerank = {n: 0 for n in g.nodes}

    try:
        from networkx.algorithms.community import greedy_modularity_communities
        communities = [list(c) for c in greedy_modularity_communities(g, weight="weight")]
    except Exception:
        communities = []

    def top(d, n=5):
        return sorted(d.items(), key=lambda kv: kv[1], reverse=True)[:n]

    return {
        "node_count": g.number_of_nodes(),
        "edge_count": g.number_of_edges(),
        "density": round(nx.density(g), 4),
        "top_degree_centrality": top(degree_centrality),
        "top_betweenness_centrality": top(betweenness),
        "top_pagerank": top(pagerank),
        "community_count": len(communities),
        "communities": communities[:10],
        "disclaimer": (
            "Centrality and community scores identify structurally notable "
            "nodes (potential hubs / bridges) in the observed evidence graph. "
            "They are investigative leads, not proof of criminal involvement."
        ),
    }


def shortest_path(g: nx.Graph, source_id: str, target_id: str):
    try:
        return nx.shortest_path(g, source_id, target_id)
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None
