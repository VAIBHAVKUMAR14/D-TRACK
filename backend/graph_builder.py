"""
graph_builder.py — Shadow-Graph Builder for D-TRACK.

Constructs a NetworkX graph from unified identities and cross-platform links.
Nodes = accounts + wallets. Edges = shared identifiers.
Computes centrality metrics for risk scoring.
"""

import networkx as nx
from typing import Optional


# ── Color Palette ────────────────────────────────────────────────────────────
PLATFORM_COLORS = {
    "instagram": "#E1306C",
    "telegram": "#0088cc",
    "twitter": "#1DA1F2",
    "unknown": "#9E9E9E",
}

RISK_COLORS = {
    "Critical": "#FF1744",
    "High": "#FF5722",
    "Medium": "#FF9800",
    "Low": "#4CAF50",
}

WALLET_COLOR = "#FFD700"  # Gold for wallet nodes

EDGE_COLORS = {
    "shared_wallet": "#FF5722",
    "shared_phone": "#FF9800",
    "same_identity": "#9C27B0",
    "promotes": "#2196F3",
    "wallet_link": "#FFD700",
}


def build_shadow_graph(
    identities: list[dict],
    cross_platform_links: list[dict],
    promotion_links: list[dict],
) -> nx.Graph:
    """
    Build the Shadow-Graph from resolved identities and links.

    Node types:
      - account: Social media account
      - wallet: Cryptocurrency wallet address

    Edge types:
      - shared_wallet: Two accounts share a wallet
      - shared_phone: Two accounts share a phone number
      - same_identity: Resolved as same person
      - promotes: One account @mentions another
      - wallet_link: Account linked to its wallet
    """
    G = nx.Graph()

    # ── Add account nodes ────────────────────────────────────────────────
    for identity in identities:
        for profile in identity.get("profiles", []):
            node_id = profile["profile_id"]
            platform = profile.get("platform", "unknown")
            risk_level = identity.get("risk_level", "Low")

            G.add_node(
                node_id,
                label=profile["username"],
                node_type="account",
                platform=platform,
                display_name=profile.get("display_name", ""),
                followers=profile.get("followers", 0),
                max_intent_score=profile.get("max_intent_score", 0.0),
                flagged_posts=profile.get("flagged_posts", 0),
                total_posts=profile.get("total_posts", 0),
                risk_score=identity.get("risk_score", 0.0),
                risk_level=risk_level,
                identity_id=identity["identity_id"],
                color=RISK_COLORS.get(risk_level, "#4CAF50"),
                size=max(15, min(50, profile.get("followers", 0) // 100 + 15)),
            )

    # ── Add wallet nodes ─────────────────────────────────────────────────
    wallet_set = set()
    for identity in identities:
        for wallet in identity.get("all_wallets", []):
            if wallet not in wallet_set:
                wallet_set.add(wallet)
                # Truncate wallet for display
                short_wallet = f"{wallet[:6]}...{wallet[-4:]}"
                G.add_node(
                    wallet,
                    label=short_wallet,
                    node_type="wallet",
                    platform="crypto",
                    full_address=wallet,
                    color=WALLET_COLOR,
                    size=30,
                    risk_score=0.0,
                    risk_level="Low",
                    identity_id=None,
                )

    # ── Add wallet-link edges ────────────────────────────────────────────
    for identity in identities:
        for profile in identity.get("profiles", []):
            for wallet in profile.get("wallet_addresses", []):
                if G.has_node(profile["profile_id"]) and G.has_node(wallet):
                    G.add_edge(
                        profile["profile_id"],
                        wallet,
                        edge_type="wallet_link",
                        weight=2.0,
                        color=EDGE_COLORS["wallet_link"],
                    )

    # ── Add cross-platform identity edges ───────────────────────────────
    for link in cross_platform_links:
        src = link["source"]
        tgt = link["target"]
        if G.has_node(src) and G.has_node(tgt):
            G.add_edge(
                src, tgt,
                edge_type=link["link_type"],
                weight=3.0 if link["link_type"] == "shared_wallet" else 2.0,
                color=EDGE_COLORS.get(link["link_type"], "#999"),
            )

    # ── Add promotion edges ──────────────────────────────────────────────
    for link in promotion_links:
        src = link["source"]
        tgt = link["target"]
        if G.has_node(src) and G.has_node(tgt):
            G.add_edge(
                src, tgt,
                edge_type="promotes",
                weight=1.5,
                color=EDGE_COLORS["promotes"],
                mention=link.get("mention", ""),
            )

    print(f"[GRAPH] Built shadow-graph: {G.number_of_nodes()} nodes, "
          f"{G.number_of_edges()} edges")

    return G


def compute_centrality_metrics(G: nx.Graph) -> dict[str, dict]:
    """
    Compute various centrality metrics for all nodes.

    Returns:
        Dict mapping node_id -> {degree, betweenness, eigenvector, pagerank}
    """
    metrics = {}

    # Degree centrality
    degree_cent = nx.degree_centrality(G)

    # Betweenness centrality
    betweenness_cent = nx.betweenness_centrality(G, weight="weight")

    # Eigenvector centrality (use numpy solver for disconnected graph support)
    _eigenvector_failed = False
    try:
        eigenvector_cent = nx.eigenvector_centrality_numpy(G, weight="weight")
    except Exception:
        eigenvector_cent = {n: 0.0 for n in G.nodes()}
        _eigenvector_failed = True

    # PageRank
    try:
        pagerank = nx.pagerank(G, weight="weight")
    except Exception:
        pagerank = {n: 1.0 / G.number_of_nodes() for n in G.nodes()}

    for node in G.nodes():
        metrics[node] = {
            "degree_centrality": round(degree_cent.get(node, 0.0), 4),
            "betweenness_centrality": round(betweenness_cent.get(node, 0.0), 4),
            "eigenvector_centrality": round(eigenvector_cent.get(node, 0.0), 4),
            "pagerank": round(pagerank.get(node, 0.0), 4),
        }

    return metrics


def graph_to_serializable(G: nx.Graph) -> dict:
    """
    Convert NetworkX graph to a JSON-serializable dict for the API.
    """
    nodes = []
    for node_id, attrs in G.nodes(data=True):
        nodes.append({
            "id": node_id,
            "label": attrs.get("label", node_id),
            "node_type": attrs.get("node_type", "account"),
            "platform": attrs.get("platform"),
            "risk_score": attrs.get("risk_score", 0.0),
            "risk_level": attrs.get("risk_level", "Low"),
            "size": attrs.get("size", 20),
            "color": attrs.get("color", "#4CAF50"),
            "identity_id": attrs.get("identity_id"),
        })

    edges = []
    for src, tgt, attrs in G.edges(data=True):
        edges.append({
            "source": src,
            "target": tgt,
            "edge_type": attrs.get("edge_type", "unknown"),
            "weight": attrs.get("weight", 1.0),
            "color": attrs.get("color", "#999"),
        })

    return {"nodes": nodes, "edges": edges}


def generate_pyvis_html(G: nx.Graph, output_path: str = "shadow_graph.html") -> str:
    """
    Generate an interactive PyVis HTML visualization of the graph.
    Returns the HTML content as a string.
    """
    from pyvis.network import Network

    net = Network(
        height="700px",
        width="100%",
        bgcolor="#0a0a0a",
        font_color="#ffffff",
        directed=False,
        notebook=False,
    )

    # Physics settings for nice layout
    net.set_options("""
    {
        "physics": {
            "forceAtlas2Based": {
                "gravitationalConstant": -50,
                "centralGravity": 0.005,
                "springLength": 150,
                "springConstant": 0.08
            },
            "maxVelocity": 50,
            "solver": "forceAtlas2Based",
            "timestep": 0.35,
            "stabilization": {
                "enabled": true,
                "iterations": 150
            }
        },
        "nodes": {
            "borderWidth": 2,
            "borderWidthSelected": 4,
            "font": {
                "size": 14,
                "face": "Inter, Arial, sans-serif"
            }
        },
        "edges": {
            "smooth": {
                "type": "continuous"
            },
            "width": 2
        },
        "interaction": {
            "hover": true,
            "tooltipDelay": 200,
            "navigationButtons": true,
            "keyboard": true
        }
    }
    """)

    # Add nodes
    for node_id, attrs in G.nodes(data=True):
        node_type = attrs.get("node_type", "account")
        color = attrs.get("color", "#4CAF50")
        size = attrs.get("size", 20)
        label = attrs.get("label", str(node_id))

        # Shape based on type
        shape = "dot" if node_type == "account" else "diamond"

        # Tooltip
        if node_type == "account":
            title = (
                f"<b>{attrs.get('display_name', label)}</b><br>"
                f"Username: {label}<br>"
                f"Platform: {attrs.get('platform', 'N/A')}<br>"
                f"Risk Score: {attrs.get('risk_score', 0):.0f}/100<br>"
                f"Risk Level: {attrs.get('risk_level', 'Low')}<br>"
                f"Followers: {attrs.get('followers', 0):,}<br>"
                f"Intent Score: {attrs.get('max_intent_score', 0):.2f}<br>"
                f"Flagged Posts: {attrs.get('flagged_posts', 0)}/{attrs.get('total_posts', 0)}"
            )
        else:
            title = (
                f"<b>Wallet</b><br>"
                f"Address: {attrs.get('full_address', label)}<br>"
                f"Type: Cryptocurrency"
            )

        net.add_node(
            node_id,
            label=label,
            color=color,
            size=size,
            shape=shape,
            title=title,
            borderWidth=2,
        )

    # Add edges
    for src, tgt, attrs in G.edges(data=True):
        edge_type = attrs.get("edge_type", "unknown")
        color = attrs.get("color", "#999")
        weight = attrs.get("weight", 1.0)

        title = f"Link Type: {edge_type}"
        if edge_type == "promotes":
            title += f"\nMention: {attrs.get('mention', '')}"

        net.add_edge(
            src, tgt,
            color=color,
            width=weight * 1.5,
            title=title,
        )

    # Generate HTML
    html = net.generate_html()
    return html
