# models.py
# defines the SQLAlchemy ORM models for the database tables, including User and Project, with their columns and relationships

import time
from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name      = Column(String, nullable=False)
    last_name       = Column(String, nullable=False)
    created_at      = Column(Float, default=time.time)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name       = Column(String, nullable=False)
    # ordered list of block dicts, e.g.
    # [{ "id": "...", "type": "text", "content": "..." },
    #  { "id": "...", "type": "graph", "file_id": "...", "filename": "...", "chart_config": {...} }]
    # validated against the Block/TextBlock/GraphBlock pydantic models in routers/projects.py
    # before ever reaching this column — this column itself stays untyped JSON.
    blocks     = Column(JSON, nullable=False, default=list)
    created_at = Column(Float, default=time.time)
    updated_at = Column(Float, default=time.time)

    # --- sharing -----------------------------------------------------
    # share_token is null when the project isn't shared. When set, anyone
    # with the token can access it via routers/share.py without logging
    # in — the token itself (128 bits of entropy via secrets.token_urlsafe)
    # is the access control, same trust model as Google Docs/Figma links.
    # share_permission is "view" or "edit" and is only meaningful when
    # share_token is set.
    share_token      = Column(String, unique=True, index=True, nullable=True)
    share_permission = Column(String, nullable=True)  # "view" | "edit"

    owner = relationship("User", back_populates="projects")