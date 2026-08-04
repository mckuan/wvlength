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

    owner = relationship("User", back_populates="projects")