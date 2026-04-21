

## D TRACK
“Track the unseen. Stop the chain.”
## TEAM NAME : ZERO_CIVIC_SENSE

## Our Team
Zero_Civic_Sense
## Github
## VAIBHAV
## DTU CSE 2028
## Github
## Linkedin
## VINEET
## DTU CSE 2028
## Linkedin
## YASH
## DTU CSE 2028
## Github
## Linkedin
## VEDANT
## DTU CSE 2028
## Github
## Linkedin

Drug trafficking has gone Digital & Invisible  and our detection tools are a decade behind
Traffickers don't say illegal words anymore.
The Silo Problem:   Drug networks no longer operate in alleys. They advertise on
Instagram using coded emoji, transact via Telegram bots, and collect payment in crypto
across three platforms, three identities, zero obvious connection.
The Language Problem:   Traffickers use coded language (emojis, slang, patterns)
instead of keywords, bypassing traditional detection systems.
The Scale Problem:  Investigators face massive data with limited resources; without
automation, major networks remain hidden while only small cases get caught.
## PROBLEM STATEMENT
In its 2025 Annual Report, the International Narcotics Control Board:
India recorded over 1 lakh drug-related cases in 2025 alone — and that's only what was detected
Telegram alone hosts thousands of active drug distribution channels — many operating openly with emoji-coded menus
Blockchain analytics firm Chainalysis estimates $24.2 billion in crypto was received by illicit addresses in 2023
## Details:

Uses crypto wallet address as a unique fingerprint (public, consistent across
platforms)
Matches profiles across Instagram, Telegram, and X using
Links matched accounts into a single unified identity profile.
Renders an interactive network map to explore connections, clusters, and money
flows.
## Reveals:
Stores identities and wallets in a graph database :
Nodes = accounts
Edges = shared wallet, links, or phone
Network scale (isolated vs organized)
Central wallets (collection points)
“Clean” accounts promoting operations
## PROPOSED SOLUTION
AI-Powered Trafficking Detection System
## CORE FEATURES:
Slang-to-Signal Detection Engine
Problem it solves: Traffickers don't say illegal words anymore
Instead of looking for specific words, this engine looks for patterns of intent.
It reads a post the way a trained investigator would noticing that
It converts every post into a mathematical "meaning vector" using a machine
learning model (sentence-transformers). It then compares that vector against a
reference database of confirmed trafficking patterns. If the meaning is close enough
flags it
Cross-Platform Handle Stitching
Problem it solves: Traffickers use different platforms (e.g., clean Instagram, active
Telegram), making identities hard to link.
Same wallet address
Phone number / bio links
Similar username patterns
Shadow-Graph Visualizer
Problem it solves: Linked accounts alone don’t reveal network structure or key players.
## Risk Scoring Dashboard
Problem it solves: Investigators can’t manually review hundreds of flagged accounts.
Assigns each identity a Risk Score (0–100) based on:
Graph Centrality: role in network (hub vs peripheral)
Blockchain Volume: crypto transaction activity
Activity Frequency: posting/operational intensity
Ranks accounts so high-risk targets appear first.

## N.LPIDENTITY
## GRAPH
## BUILDING
## COMPLETE R!SK
## ASSESMENT PIPELINE
## DATA
## INGEST
## RISK
## CALCULATING
## FIANL
## PROCESSING

## Instagram / X Scraper
Public posts ,bios ,geostag

## Using: Playright , Apify
BlockChain API
Wallet history , Volumes

## Using: Ethescan , Solscan
Slang-to-Signal Engine
Converts every scraped post into
a semantic embedding vector
Risk Scoring engine
0–100 per identity, multi-signal
Using: Python · Chain APIs
## Graph Database
Nodes,edges, centrality scoring
Using: Neo4j GDS
OCR Image Pipeline
Extract text from images
## Geo Extractor
Location mentions, exif tags
## IDENTITY
## RESOLUTION
## Entity Deduplication
Merge duplicate identities
Using: MinHash LSH
## Handle Stiching Engine
Public posts ,bios ,geostag

## Using: Playright , Apify
## TECH STACK:
## Telegram Collector
Channel ,bots , media
## Using: Telethon
## TECHNICALARCHITECTURE
## DATA
## INGESTION
## PROCESSING
## SCORING &
## VISUALISATION
## Risk Dashboard
Ranked targets,
filterable
## Geospatial Heatmap
Hot-zone mapping,
clusters
Shadow-Graph
## Visualizer
Interactive network
map, exportable
## LAYER BASED APPROACH
## DATA FLOW

WHY D-TRACK WINS: Features
## Robust False Positive Management
Employs a 0.72 confidence threshold and mandatory corroboration (ML intent + hard signal like a wallet/handle)
to eliminate false positives, backed by an active learning loop that trains on analyst corrections.
## Adversarial Sanitization:
Neutralizes evasion tactics by normalizing Unicode "lookalikes" and using perceptual hashing
(pHash) to catch modified images, ensuring only clean, deduplicated data hits the model.
## Persistent Entity Resolution:
Defeats burner accounts by tracking Soft Fingerprints—linking rotated identities through writing style
(stylometry), operational habits, and crypto co-spending clusters.
## Ethical Guardrails:
Prioritizes legal compliance via a 90-day raw data purge and a "Human-in-the-Loop" design that
focuses automated power on the 90% of traffickers who lack perfect operational security.

## State Cybercrime Units
(Primary Focus)
## Fintech Platforms
(Recurring Revenue)
Research & NGOs
(Grant & Data Partnership)
## The Gap:
Units are overwhelmed by the sheer
volume of internet crimes and lack tools
to analyze complex digital footprints
## Our Solution:
Automated Identity Stitching: Our "Shadow-
Graph" reduces manual investigative time
from 10 days to 10 seconds by instantly
linking identities across platforms using
public wallet fingerprints.
## The Gap:
Current systems flag suspicious transaction
volumes after they happen, but miss the "intent"
happening on social media.
## Our Solution:
A plug-and-play risk-scoring engine that scans
content and wallet addresses at the point of
interaction.
Pattern-of-Intent Detection: Instead of just looking
for "Illegal drugs," we flag mathematical
## The Gap:
These organizations have global stats but
lack granular, real-time data on how digital
trafficking routes shift across the Indian
Ocean and South Asia.
## Our Solution:
Real-time Intelligence Feed: A dashboard
that provides live trends on new synthetic
drug names and digital transit routes being
used in the region.
## Revenue Model:
Annual Maintenance Contract (AMC) &
## License Fee.
Instead of complex per-user pricing, we
charge a flat annual fee per state unit or
district headquarters.
## Revenue Model:
"API Volume + Seat" Pricing: * API Tier: Tiered pricing
based on the number of transactions scanned.
Dashboard Access: ₹15,000 – ₹40,000/month per
analyst seat.
## Revenue Model:
Grant-Funding & Indirect Monetization
Research Grants: Applying for "Cyber
Security Innovation" grants from MeitY or
international bodies like the UNODC
## BUSINESSAPPROACH

## IMPACT & BENEFITS
## 10× Faster Investigations:
Cross-Platform Identity Resolution:
## The Anonymity Gap — Closed:
## Scalable & Broadly Applicable:
MetricImpact
## Investigation Time
Reduced from weeks → 10 minutes of
automated graph traversal
## Identity Resolution
3+ platforms unified under one wallet
fingerprint
## Deployment Reach
Integrates with CCTNS & INTERPOL I-
24/7 workflows
## Data Privacy
100% public data — no private
surveillance involved
Reduces weeks of manual cross-referencing to
under 10 minutes — investigators spend time
acting on leads, not chasing them.
Stitches aliases across Instagram, Telegram, and X
using shared wallet addresses and bio-link
patterns into a single unified profile.
Crypto wallet acts as a permanent fingerprint. Even
with aliases and coded language, D-TRACK links the
"clean" persona to the distribution network.
Platform-agnostic architecture extends to TikTok,
WhatsApp, and beyond. Same logic applies to
counterfeit goods, financial fraud, and human
trafficking networks.
## FROM SCATTERED
## SIGNALS TO
## PROSECUTABLE
## INTELLIGENCE