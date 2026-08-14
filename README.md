# wvlength
 
Turn a CSV into a shareable, multi-chart report — upload your data, build charts against it, arrange them alongside notes in a document, and share the finished thing with a link.
 
## Features
 
📊 **Chart Builder**
 
* Six chart types: bar, line, scatter, histogram, box plot, heatmap
* Color-by-category or color-by-Y-value-threshold, with per-value custom colors
* Configurable axes, aggregation, and bin sizing per chart type
* Chart aggregation is read-only end-to-end — viewing/tweaking a chart never mutates your stored dataset, even though it reuses the same grouping logic as the data-cleaning step
📁 **CSV Upload & Cleaning**
 
* Upload and preview a CSV instantly
* Guided, step-by-step data transforms before charting: null handling (drop, fill, mean/median/mode, forward/back-fill, interpolate), packed-coordinate column splitting, and grouping/aggregation
* Automatic type detection per column
* Every upload keeps an untouched original alongside a working copy, so you can reset back to the source data at any point, even after applying several transforms
* Up to 5 uploaded files are kept at once, oldest evicted automatically
📄 **Projects as Documents**
 
* Projects are ordered blocks, not single charts — mix text notes and graphs freely
* Add a brand-new graph, or pull in one you've already built from a past project (a lightweight reference to the original snapshot, not a duplicate capture)
* Autosaves as you edit (debounced), no manual save step
* Edit mode and a paginated Page View for reviewing the finished layout
🔗 **Sharing**
 
* Share a project via a link with view-only or edit permission
* Revoke or change permission on an existing link at any time — changing permission reuses the existing link rather than breaking it
* Shared links work without an account; possession of the link's token is the access control
📤 **Export**
 
* Export a project to PDF — captures the paginated Page View exactly as laid out on screen
* Export a project to Word (.docx) — rebuilt directly from the project's content, producing a real editable document rather than a flattened image
* Both export types work from a view-only shared link, not just as the project owner
🔐 **Accounts**
 
* Email/password sign-up and sign-in
* JWT-based authentication, with password hashing via bcrypt
* Projects are private to your account, scoped by ownership on every request
## Tech Stack
 
**Frontend**
 
* React + TypeScript
* Vite
* React Router
* Tailwind CSS
* Recharts
* react-dropzone (CSV upload)
* docx + file-saver (Word export)
* jsPDF + html2canvas (PDF export)
**Backend**
 
* FastAPI (Python)
* SQLAlchemy
* pandas (CSV parsing, cleaning, and aggregation)
**Storage & Security**
 
* PostgreSQL, hosted on Neon — stores users and projects (projects as an ordered JSON list of typed blocks)
* Uploaded CSVs stored as Parquet files on disk, separate from Postgres, with a small JSON metadata sidecar per file for fast lookups without reading the full dataset
* Captured chart images stored as PNG files on disk, referenced from a project's blocks by URL
* JWT (python-jose)
* Password hashing via bcrypt/passlib
* Environment-based secret management (`python-dotenv`)
**Deployment**
 
* Local development only, not yet deployed
## Why I Built This
 
 
 
## What I Learned
 
Building wvlength taught me how to:
 
* Design a JWT-based authentication system from scratch — password hashing, token issuance/verification, and a `get_current_user` dependency shared across protected routes
* Use React Context to share auth state across a component tree without prop drilling
* Gate routes behind authentication with a reusable `ProtectedRoute` wrapper
* Model relational data with SQLAlchemy, including foreign keys scoping data to a specific user
* Manage environment-based secrets safely (`.env`, `.gitignore`) instead of hardcoding credentials
* Connect a FastAPI backend to a cloud-hosted Postgres database (Neon)
* Debug real full-stack issues — CORS errors that were actually backend crashes, dependency version conflicts, stale dev-server state, and route mismatches between frontend and backend
* Structure a document-style editor around ordered, typed content blocks stored as JSON, and the real trade-offs that come with it — schema flexibility and natural ordering versus the inability to efficiently query inside the blob at the database level
* Design deliberately duplicated read-only vs. read-write endpoints for the same underlying logic (chart aggregation) so that a UI action with no intended side effects — like viewing a chart — can never accidentally persist a destructive change
* Separate an untouched "original" copy of uploaded data from a mutable "working copy," so cleaning/transform steps stay fully reversible
* Build a public, token-based sharing system as a security boundary distinct from user authentication — including deliberately choosing different HTTP error codes (404 vs. 403) depending on whether a request could leak the existence of a resource
* Debounce autosave so rapid edits collapse into a single network request instead of firing on every keystroke, while guarding against premature saves before real data has loaded
* Coordinate an async, multi-stage UI flow (switch view mode → wait for it to actually render → wait for async content like images to finish loading → capture) for a screenshot-based PDF export
* Reconstruct a formatted document from structured data rather than a raw screenshot, including manually recreating type scale and image scaling since document-generation libraries don't inherit page CSS
## Installation
 
Currently local development only — no packaged build or hosted deployment yet.
 
## Future Plans
 
* Richer text block formatting
* Collaborative/multi-editor project editing
* Additional chart types
* Google OAuth sign-in

## Screenshots
 
 