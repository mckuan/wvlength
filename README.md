# wvlength
 
Turn a CSV into a shareable, multi-chart report — upload your data, build charts against it, arrange them alongside notes in a document, and share the finished thing with a link.

## LIVE LINK: https://wvlength-ork6.onrender.com
 
## Features
 
📊 **Chart Builder**
 
* Six chart types: bar, line, scatter, histogram, box plot, heatmap
* Color-by-category or color-by-Y-value-threshold, with per-value custom colors
* Configurable axes, aggregation, and bin sizing per chart type
* Chart aggregation is read-only end-to-end — viewing/tweaking a chart never mutates your stored dataset, even though it reuses the same grouping logic as the data-cleaning step

Here's what it looks like in project:
<img width="1275" height="1650" alt="demo-1" src="https://github.com/user-attachments/assets/daf735c8-fbb0-4767-a5ef-36b75c232ede" />
<img width="1275" height="1650" alt="demo-2" src="https://github.com/user-attachments/assets/b9e701b0-1c49-4094-a0c5-d6ee1ab05c6c" />
<img width="1275" height="1650" alt="demo-3" src="https://github.com/user-attachments/assets/94dbefec-b18d-4752-b05b-7c028abe8da4" />
<img width="1275" height="1650" alt="demo-4" src="https://github.com/user-attachments/assets/6b46d29f-654d-4147-b187-a0bb5aeef068" />

Below are some CSV files to try out:
- [heatmap_orders_by_time.csv](./sample-data/heatmap_orders_by_time.csv)
- [bar_regional_sales.csv](./sample-data/bar_regional_sales.csv)
- [boxplot_delivery_times.csv](./sample-data/boxplot_delivery_times.csv)
- [histogram_exam_scores.csv](./sample-data/histogram_exam_scores.csv)
- [line_daily_traffic.csv](./sample-data/line_daily_traffic.csv)
- [scatter_adspend_revenue.csv](./sample-data/scatter_adspend_revenue.csv)


📁 **CSV Upload & Cleaning**
 
* Upload and preview a CSV instantly
* Guided, step-by-step data transforms before charting: null handling (drop, fill, mean/median/mode, forward/back-fill, interpolate), packed-coordinate column splitting, and grouping/aggregation
* Automatic type detection per column
* Every upload keeps an untouched original alongside a working copy, so you can reset back to the source data at any point, even after applying several transforms
* Up to 5 uploaded files are kept at once, oldest evicted automatically

Here's what it looks like:
<img width="1445" height="766" alt="Screenshot 2026-08-15 at 6 21 05 PM" src="https://github.com/user-attachments/assets/ab5841e2-95b6-4639-b8be-d533fb46075f" />

<img width="1446" height="786" alt="Screenshot 2026-08-15 at 6 21 14 PM" src="https://github.com/user-attachments/assets/f900c169-3be0-4e91-8c34-d615f1065038" />

<img width="1462" height="768" alt="Screenshot 2026-08-15 at 6 21 52 PM" src="https://github.com/user-attachments/assets/0237ab0a-5098-41d0-af0d-d8e3b82d8c4a" />

<img width="1431" height="384" alt="Screenshot 2026-08-15 at 6 21 59 PM" src="https://github.com/user-attachments/assets/f08fbb3d-3eae-475e-a8c9-b5277190c2e8" />

Heres a CSV to try it out: 
- [store_locations_demo.csv](./sample-data/store_locations_demo.csv)

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
  
## Why I Built This
 
 Inspired by my research lab and I wanted to create something that could help organize and view data cleanly and quickly
 
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
* Color options to graphs 
* upload datas 

## Screenshots
<img width="1454" height="789" alt="Screenshot 2026-08-15 at 6 23 43 PM" src="https://github.com/user-attachments/assets/badfc4e3-c19f-47f0-a201-cd50bae44169" />

 <img width="417" height="400" alt="Screenshot 2026-08-15 at 6 23 51 PM" src="https://github.com/user-attachments/assets/c15defb3-196a-4864-b1f8-0c6939eaa839" />

 <img width="469" height="477" alt="Screenshot 2026-08-15 at 6 23 55 PM" src="https://github.com/user-attachments/assets/711194f2-8e79-4a80-ae41-88f683991adf" />

<img width="1450" height="408" alt="Screenshot 2026-08-15 at 6 24 29 PM" src="https://github.com/user-attachments/assets/b83e4150-aa72-4ec4-b004-28adaede6fb5" />

<img width="1464" height="648" alt="Screenshot 2026-08-15 at 6 24 40 PM" src="https://github.com/user-attachments/assets/6a224da9-a5a4-4ee8-8f94-3546ae96e4a5" />

<img width="1419" height="627" alt="Screenshot 2026-08-15 at 6 24 56 PM" src="https://github.com/user-attachments/assets/c2050225-7640-417d-93ab-59f7d1a159f0" />

<img width="1003" height="706" alt="Screenshot 2026-08-15 at 6 25 06 PM" src="https://github.com/user-attachments/assets/4f2efb69-f590-4726-9804-6a0a0c2f2906" />

<img width="1459" height="462" alt="Screenshot 2026-08-15 at 6 25 18 PM" src="https://github.com/user-attachments/assets/264d4d8d-2786-4fa1-be01-0336f7e723ac" />

<img width="1431" height="735" alt="Screenshot 2026-08-15 at 6 25 48 PM" src="https://github.com/user-attachments/assets/d41e2f65-d8f7-40e8-ab6d-43d74a47711a" />

<img width="1442" height="699" alt="Screenshot 2026-08-15 at 6 26 04 PM" src="https://github.com/user-attachments/assets/59dcb513-f655-4805-9944-805e69cdb764" />

