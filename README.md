# wvlength

Turn a CSV into a shareable, multi-chart report — upload your data, build charts against it, arrange them alongside notes in a document, and share the finished thing with a link.

## Features

📊 **Chart Builder**

* Six chart types: bar, line, scatter, histogram, box plot, heatmap
* Color-by-category or color-by-Y-value-threshold, with per-value custom colors
* Configurable axes, aggregation, and bin sizing per chart type

📁 **CSV Upload & Cleaning**

* Upload and preview a CSV instantly
* Guided data transforms before charting
* Automatic type detection per column

📄 **Projects as Documents**

* Projects are ordered blocks, not single charts — mix text notes and graphs freely
* Add a brand-new graph, or pull in one you've already built from a past project
* Autosaves as you edit, no manual save step
* Edit mode and a paginated Page View for reviewing the finished layout

🔗 **Sharing**

* Share a project via a link with view-only or edit permission
* Revoke or change permission on an existing link at any time

📤 **Export**

* Export a project to PDF
* Export a project to Word (.docx)

🔐 **Accounts**

* Email/password sign-up and sign-in
* JWT-based authentication
* Projects are private to your account

## Tech Stack

**Frontend**

* React + TypeScript
* Vite
* React Router
* Tailwind CSS
* Recharts

**Backend**

* FastAPI (Python)
* SQLAlchemy

**Storage & Security**

* PostgreSQL, hosted on Neon
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
* Structure a document-style editor around ordered, typed content blocks

## Installation

Currently local development only — no packaged build or hosted deployment yet.

## Future Plans

* Richer text block formatting
* Collaborative/multi-editor project editing
* Additional chart types
* Google OAuth sign-in

## Screenshots

