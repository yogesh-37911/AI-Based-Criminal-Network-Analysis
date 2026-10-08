"""Unit tests for NetworkX-based graph metrics (Modules 6 & 7). No DB needed."""
import networkx as nx
from app.services.graph_service import compute_network_metrics, shortest_path


def test_empty_graph_metrics():
    g = nx.Graph()
    metrics = compute_network_metrics(g)
    assert metrics["node_count"] == 0
    assert metrics["density"] == 0


def test_metrics_on_small_graph():
    g = nx.Graph()
    g.add_edge("a", "b", weight=1)
    g.add_edge("b", "c", weight=1)
    g.add_edge("c", "a", weight=1)
    metrics = compute_network_metrics(g)
    assert metrics["node_count"] == 3
    assert metrics["edge_count"] == 3
    assert 0 < metrics["density"] <= 1
    assert "disclaimer" in metrics


def test_shortest_path_found():
    g = nx.Graph()
    g.add_edge("a", "b")
    g.add_edge("b", "c")
    assert shortest_path(g, "a", "c") == ["a", "b", "c"]


def test_shortest_path_missing_node_returns_none():
    g = nx.Graph()
    g.add_edge("a", "b")
    assert shortest_path(g, "a", "nonexistent") is None
